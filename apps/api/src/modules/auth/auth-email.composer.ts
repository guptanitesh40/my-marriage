import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Types, type Model } from 'mongoose';
import type { Env } from '../../config/env.js';
import type {
  ComposedEmail,
  EmailComposer,
  EmailToCompose,
} from '../notifications/email-composer.js';
import { ActionTokensService } from './action-tokens.service.js';
import { passwordChangedMessage, passwordResetMessage, verifyEmailMessage } from './auth-emails.js';
import { RESET_PASSWORD_TTL_MS, VERIFY_EMAIL_TTL_MS } from './auth-policy.js';
import { User } from './schemas/user.schema.js';
import { Traced } from '../../platform/tracing.js';

/**
 * Writes the account emails in the worker, creating the link secret at the
 * moment of sending. A retry after a crash creates another secret for the
 * same email; the provider's idempotency key keeps the second email from
 * going out, and the unsent secret simply expires.
 *
 * An email whose link would be stale by now is not sent: one replaced by a
 * newer request, a verification for an address verified meanwhile, or a
 * reset requested before the password was last changed.
 */
@Traced()
@Injectable()
export class AuthEmailComposer implements EmailComposer {
  readonly kinds = ['verify_email', 'password_reset', 'password_changed'] as const;
  private readonly webOrigin: string;

  constructor(
    @InjectModel(User.name) private readonly users: Model<User>,
    private readonly tokens: ActionTokensService,
    config: ConfigService<Env, true>,
  ) {
    this.webOrigin = config.get('WEB_ORIGIN', { infer: true });
  }

  async compose(email: EmailToCompose): Promise<ComposedEmail | null> {
    if (!email.userId) return null;
    const user = await this.users.findById(email.userId).lean();
    // Closed accounts get nothing; nor does an address changed since the request.
    if (!user || user.status !== 'active') return null;
    if (user.emailNormalized !== email.recipientEmailNormalized) return null;
    const link = {
      userId: user._id,
      notificationId: new Types.ObjectId(email.notificationId),
      requestedAt: email.requestedAt,
    };

    switch (email.kind) {
      case 'verify_email': {
        if (user.verifiedAt) return null;
        const token = await this.tokens.issue({
          ...link,
          purpose: 'verify_email',
          ttlMs: VERIFY_EMAIL_TTL_MS,
        });
        if (!token) return null;
        return verifyEmailMessage({
          displayName: user.displayName,
          link: this.link('/verify-email', token),
        });
      }
      case 'password_reset': {
        // A reset completed since this request ended every link asked for before it.
        if (user.passwordChangedAt && user.passwordChangedAt >= email.requestedAt) return null;
        const token = await this.tokens.issue({
          ...link,
          purpose: 'reset_password',
          ttlMs: RESET_PASSWORD_TTL_MS,
        });
        if (!token) return null;
        return passwordResetMessage({
          displayName: user.displayName,
          link: this.link('/reset-password', token),
        });
      }
      case 'password_changed':
        return passwordChangedMessage({
          displayName: user.displayName,
          forgotPasswordUrl: `${this.webOrigin}/forgot-password`,
        });
      default:
        // Other modules' kinds; never routed here (see `kinds`).
        return null;
    }
  }

  /**
   * The secret goes in the URL fragment: browsers never send a fragment to
   * a server, so it stays out of access logs, proxies and Referer headers,
   * and a link scanner that only fetches the page cannot use it.
   */
  private link(path: string, token: string): string {
    return `${this.webOrigin}${path}#token=${token}`;
  }
}
