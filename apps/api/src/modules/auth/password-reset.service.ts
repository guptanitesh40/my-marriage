import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import type { Connection, Model } from 'mongoose';
import { BackgroundTasks } from '../../platform/background-tasks.js';
import { RateLimiter } from '../../platform/rate-limit.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { ActionTokensService } from './action-tokens.service.js';
import { RATE_LIMITS } from './auth-policy.js';
import { invalidLink, rejectPassword, type ClientContext } from './auth-errors.js';
import { normalizeEmail } from './email.js';
import { PasswordHasher } from './password-hasher.js';
import { passwordProblems } from './password-policy.js';
import { User } from './schemas/user.schema.js';
import { SessionsService } from './sessions.service.js';
import { Traced } from '../../platform/tracing.js';

/** PRD AUTH-04: password reset by a single-use, expiring emailed link. */
@Traced()
@Injectable()
export class PasswordResetService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(User.name) private readonly users: Model<User>,
    private readonly tokens: ActionTokensService,
    private readonly sessions: SessionsService,
    private readonly hasher: PasswordHasher,
    private readonly notifications: NotificationsService,
    private readonly limiter: RateLimiter,
    private readonly background: BackgroundTasks,
  ) {}

  /**
   * Emails a reset link, replacing any earlier one. The answer is the same
   * whether or not the email has an account, so it cannot be used to find
   * out who has one. Over the per-address limit, nothing is sent.
   *
   * Only the per-IP limit runs before the answer. Everything that depends on
   * the account runs after it, so the response time does not show whether
   * there is one.
   */
  async forgot(email: string, client: ClientContext): Promise<void> {
    await this.limiter.consume(RATE_LIMITS.forgotPasswordPerIp, client.ip);
    const emailNormalized = normalizeEmail(email);
    this.background.run('password reset request', () => this.sendResetLink(emailNormalized));
  }

  private async sendResetLink(emailNormalized: string): Promise<void> {
    const user = await this.users.findOne({ emailNormalized }).lean();
    if (!user || user.status !== 'active') return;
    const allowed = await this.limiter.hit(RATE_LIMITS.resetEmailPerAccount, emailNormalized);
    if (!allowed.allowed) return;

    await this.connection.transaction(async (session) => {
      await this.tokens.revokeOutstanding(user._id, 'reset_password', session);
      await this.notifications.requestEmail(session, {
        kind: 'password_reset',
        userId: user._id,
        recipientEmailNormalized: emailNormalized,
      });
    });
  }

  /**
   * Sets a new password with the secret from the reset link. In one
   * transaction: the link is used up, every session ends (so whoever might
   * have had the old password is signed out), other reset links stop
   * working, and a "password changed" email is queued.
   *
   * A rejected new password does not use up the link, so the person can try
   * again. Completing a reset also proves the person reads this inbox, so an
   * unverified address becomes verified.
   */
  async reset(token: string, password: string, client: ClientContext): Promise<void> {
    await this.limiter.consume(RATE_LIMITS.tokenUsePerIp, client.ip);

    const record = await this.tokens.find(token, 'reset_password');
    const usable =
      record && !record.consumedAt && !record.revokedAt && record.expiresAt.getTime() > Date.now();
    const user = usable ? await this.users.findById(record.userId).lean() : null;
    if (!user || user.status !== 'active') throw invalidLink();

    const problems = passwordProblems(password, user.emailNormalized);
    if (problems.length > 0) rejectPassword(problems);
    const passwordHash = await this.hasher.hash(password);

    await this.connection.transaction(async (session) => {
      // Atomic: of two simultaneous resets with one link, exactly one wins.
      if (!(await this.tokens.consume(token, 'reset_password', session))) throw invalidLink();
      const now = new Date();
      await this.users.updateOne(
        { _id: user._id },
        {
          $set: {
            passwordHash,
            passwordChangedAt: now,
            ...(user.verifiedAt ? {} : { verifiedAt: now }),
          },
        },
        { session },
      );
      await this.sessions.revokeAllForUser(user._id, session);
      await this.tokens.revokeOutstanding(user._id, 'reset_password', session);
      await this.notifications.requestEmail(session, {
        kind: 'password_changed',
        userId: user._id,
        recipientEmailNormalized: user.emailNormalized,
      });
    });

    // Failed sign-ins before the reset no longer matter.
    await this.limiter
      .reset(RATE_LIMITS.loginFailuresPerAccount, user.emailNormalized)
      .catch(() => undefined);
  }
}
