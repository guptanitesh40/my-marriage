import type { Types } from 'mongoose';
import type { NotificationKind } from './notification.schema.js';

/** What a composer needs to know about the email it is writing. */
export interface EmailToCompose {
  notificationId: string;
  kind: NotificationKind;
  userId?: Types.ObjectId;
  recipientEmailNormalized: string;
  /** When the email was requested, in the transaction of the change that caused it. */
  requestedAt: Date;
}

export interface ComposedEmail {
  subject: string;
  html: string;
  text: string;
}

/**
 * Writes the content of some kinds of email, in the worker, just before
 * sending. The domain that owns the email provides it (AuthModule writes the
 * verification email), so NotificationsModule never depends on domains.
 *
 * Returning `null` means the email is no longer needed (the address was
 * verified meanwhile) and it is recorded as suppressed. Composing can run
 * more than once for one email.
 */
export interface EmailComposer {
  readonly kinds: readonly NotificationKind[];
  compose(email: EmailToCompose): Promise<ComposedEmail | null>;
}

/** Injection token for the composers registered with `EmailDeliveryModule`. */
export const EMAIL_COMPOSERS = Symbol('EMAIL_COMPOSERS');
