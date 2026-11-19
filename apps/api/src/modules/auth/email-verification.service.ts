import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import type { Connection, Model } from 'mongoose';
import { BackgroundTasks } from '../../platform/background-tasks.js';
import { RateLimiter } from '../../platform/rate-limit.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { ActionTokensService } from './action-tokens.service.js';
import { RATE_LIMITS } from './auth-policy.js';
import { invalidLink, type ClientContext } from './auth-errors.js';
import { normalizeEmail } from './email.js';
import { User } from './schemas/user.schema.js';
import { Traced } from '../../platform/tracing.js';

/** PRD AUTH-02: verification by a single-use, expiring emailed link. */
@Traced()
@Injectable()
export class EmailVerificationService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(User.name) private readonly users: Model<User>,
    private readonly tokens: ActionTokensService,
    private readonly notifications: NotificationsService,
    private readonly limiter: RateLimiter,
    private readonly background: BackgroundTasks,
  ) {}

  /**
   * Marks the address verified. Using the same link again also succeeds, as
   * long as that link is what verified the address: some email security
   * scanners open links before the person does, and they should not see a
   * confusing error. Any other unusable link is refused.
   */
  async verify(token: string, client: ClientContext): Promise<void> {
    await this.limiter.consume(RATE_LIMITS.tokenUsePerIp, client.ip);

    const verified = await this.connection.transaction(async (session) => {
      const consumed = await this.tokens.consume(token, 'verify_email', session);
      if (!consumed) return false;
      const user = await this.users.findOne({ _id: consumed.userId }, null, { session }).lean();
      if (!user || user.status !== 'active') throw invalidLink();
      if (!user.verifiedAt) {
        await this.users.updateOne(
          { _id: user._id },
          { $set: { verifiedAt: new Date() } },
          { session },
        );
      }
      // Older links for this account have no purpose left.
      await this.tokens.revokeOutstanding(consumed.userId, 'verify_email', session);
      return true;
    });
    if (verified) return;

    const used = await this.tokens.find(token, 'verify_email');
    if (used?.consumedAt) {
      const user = await this.users.findById(used.userId).lean();
      if (user?.verifiedAt && user.status === 'active') return;
    }
    throw invalidLink();
  }

  /**
   * Sends a new link, replacing any earlier one. The answer is the same
   * whether or not the email has an account, is already verified, or has
   * asked too often — so this cannot be used to find out who has an account.
   *
   * Only the per-IP limit runs before the answer. Everything that depends on
   * the account runs after it, so the response time does not show whether
   * there is one.
   */
  async resend(email: string, client: ClientContext): Promise<void> {
    await this.limiter.consume(RATE_LIMITS.verificationResendPerIp, client.ip);
    const emailNormalized = normalizeEmail(email);
    this.background.run('verification email request', () => this.sendLink(emailNormalized));
  }

  private async sendLink(emailNormalized: string): Promise<void> {
    const user = await this.users.findOne({ emailNormalized }).lean();
    if (!user || user.verifiedAt || user.status !== 'active') return;
    if (!(await this.allowSending(emailNormalized))) return;

    await this.connection.transaction(async (session) => {
      await this.tokens.revokeOutstanding(user._id, 'verify_email', session);
      await this.notifications.requestEmail(session, {
        kind: 'verify_email',
        userId: user._id,
        recipientEmailNormalized: emailNormalized,
      });
    });
  }

  /**
   * Counts one verification email to this address against its limits (one a
   * minute, five a day). Signup counts too, so "resend" pressed straight
   * after signing up sends nothing new.
   */
  async allowSending(emailNormalized: string): Promise<boolean> {
    const minute = await this.limiter.hit(
      RATE_LIMITS.verificationEmailPerAccountMinute,
      emailNormalized,
    );
    if (!minute.allowed) return false;
    const day = await this.limiter.hit(RATE_LIMITS.verificationEmailPerAccountDay, emailNormalized);
    return day.allowed;
  }
}
