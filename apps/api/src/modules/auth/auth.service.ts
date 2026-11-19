import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import type { Connection, Model } from 'mongoose';
import { duplicateKey } from '../../platform/mongo.js';
import { RateLimiter } from '../../platform/rate-limit.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { rejectPassword, type ClientContext } from './auth-errors.js';
import { RATE_LIMITS } from './auth-policy.js';
import type { LoginDto } from './dto/login.dto.js';
import type { SignupDto } from './dto/signup.dto.js';
import { EmailVerificationService } from './email-verification.service.js';
import { normalizeEmail } from './email.js';
import { PasswordHasher } from './password-hasher.js';
import { passwordProblems } from './password-policy.js';
import { User } from './schemas/user.schema.js';
import {
  SessionsService,
  toAuthenticatedUser,
  type AuthenticatedUser,
} from './sessions.service.js';
import { Traced } from '../../platform/tracing.js';

export interface SignedIn {
  user: AuthenticatedUser;
  token: string;
  expiresAt: Date;
}

/** The one answer to every failed sign-in, whatever the reason. */
function invalidCredentials(): UnauthorizedException {
  return new UnauthorizedException({
    code: 'INVALID_CREDENTIALS',
    message: 'Incorrect email or password. Check them, or reset your password.',
  });
}

@Traced()
@Injectable()
export class AuthService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(User.name) private readonly users: Model<User>,
    private readonly hasher: PasswordHasher,
    private readonly sessions: SessionsService,
    private readonly notifications: NotificationsService,
    private readonly limiter: RateLimiter,
    private readonly verification: EmailVerificationService,
  ) {}

  /**
   * Creates the account, asks for the verification email and signs the new
   * user in, all in one transaction: there is never an account without its
   * email, nor an email for an account that failed to save.
   *
   * `previousToken` is the session cookie the browser already had, if any;
   * it is ended, as at sign-in, so one browser never holds two live sessions.
   */
  async signup(input: SignupDto, client: ClientContext, previousToken?: string): Promise<SignedIn> {
    await this.limiter.consume(RATE_LIMITS.signupPerIp, client.ip);

    const emailNormalized = normalizeEmail(input.email);
    const problems = passwordProblems(input.password, emailNormalized);
    if (problems.length > 0) rejectPassword(problems);

    // Hashing is slow on purpose; keep it out of the transaction.
    const passwordHash = await this.hasher.hash(input.password);

    let signedIn: SignedIn;
    try {
      signedIn = await this.connection.transaction(async (session) => {
        const [user] = await this.users.create(
          [{ emailNormalized, displayName: input.displayName, passwordHash, status: 'active' }],
          { session },
        );
        if (!user) throw new Error('User was not created');
        await this.notifications.requestEmail(session, {
          kind: 'verify_email',
          userId: user._id,
          recipientEmailNormalized: emailNormalized,
        });
        if (previousToken) await this.sessions.revokeToken(previousToken, session);
        const created = await this.sessions.create(user, session);
        return { user: toAuthenticatedUser(user), ...created };
      });
    } catch (error) {
      // The unique index decides, so two simultaneous sign-ups cannot both win.
      // Only that index means "taken": the transaction writes to other
      // unique indexes too (session hash, notification key).
      if (duplicateKey(error)?.keyPattern.emailNormalized !== undefined) {
        // PRD AUTH-01 asks for this message, which does reveal that the email
        // has an account; the per-IP limit above slows anyone harvesting them.
        const message = 'An account with this email already exists. Sign in instead.';
        throw new ConflictException({
          code: 'EMAIL_TAKEN',
          message,
          details: [{ field: 'email', messages: [message] }],
        });
      }
      throw error;
    }

    // The signup email counts against this address's verification email
    // limit. The account already exists, so a failure here must not fail
    // the request.
    await this.verification.allowSending(emailNormalized).catch(() => undefined);
    return signedIn;
  }

  /**
   * Signs in with email and password. Every failure looks the same — wrong
   * password, unknown email or closed account — and takes the same time,
   * so the answer never reveals whether an account exists.
   *
   * `previousToken` is the session cookie the browser already had, if any;
   * it is ended, so one browser never holds two live sessions.
   */
  async login(input: LoginDto, client: ClientContext, previousToken?: string): Promise<SignedIn> {
    await this.limiter.consume(RATE_LIMITS.loginPerIp, client.ip);
    const emailNormalized = normalizeEmail(input.email);
    // Counted before the password is checked, in one atomic step: counting
    // only after a failure would let simultaneous guesses all pass a check
    // made while the count was still low. A success clears the count.
    await this.limiter.consume(RATE_LIMITS.loginFailuresPerAccount, emailNormalized);

    const user = await this.users.findOne({ emailNormalized }).lean();
    let valid = false;
    let needsRehash = false;
    if (user && user.status === 'active') {
      ({ valid, needsRehash } = await this.hasher.verify(input.password, user.passwordHash));
    } else {
      await this.hasher.verifyAgainstDummy(input.password);
    }
    if (!user || !valid) throw invalidCredentials();

    await this.limiter.reset(RATE_LIMITS.loginFailuresPerAccount, emailNormalized);
    if (needsRehash) {
      // Upgrades hashes made with older cost settings, now that we hold the password.
      await this.users.updateOne(
        { _id: user._id, passwordHash: user.passwordHash },
        { $set: { passwordHash: await this.hasher.hash(input.password) } },
      );
    }
    if (previousToken) await this.sessions.revokeToken(previousToken);
    // `user` is the read whose hash was just checked, so a reset that commits
    // while this sign-in is in flight still ends the new session.
    const created = await this.sessions.create(user);
    return { user: toAuthenticatedUser(user), ...created };
  }

  /** Ends the session for this cookie. Nothing to do without one. */
  async logout(token: string | undefined): Promise<void> {
    if (token) await this.sessions.revokeToken(token);
  }
}
