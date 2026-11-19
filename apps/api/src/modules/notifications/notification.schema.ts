import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, type HydratedDocument } from 'mongoose';

/**
 * Emails built so far. The schema document (§4.24) lists more kinds, added
 * with their features; `password_changed` is an addition recorded in
 * decision 0003 — a security notice after every password reset.
 */
export const NOTIFICATION_KINDS = [
  'verify_email',
  'password_reset',
  'password_changed',
  'member_invite',
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export const NOTIFICATION_STATES = [
  'queued',
  'processing',
  'sent',
  'delivered',
  'bounced',
  'failed',
  'suppressed',
] as const;
export type NotificationState = (typeof NOTIFICATION_STATES)[number];

/** States after which the email is never attempted again. */
export const FINAL_NOTIFICATION_STATES: readonly NotificationState[] = [
  'sent',
  'delivered',
  'bounced',
  'failed',
  'suppressed',
];

/**
 * One email we intend to send, and what became of it. "Sent" means the
 * provider accepted it — never that it was delivered (PRD INV-08).
 */
@Schema({ collection: 'notifications', timestamps: true })
export class Notification {
  /** The account the email is for, when it is for one. */
  @Prop({ type: Types.ObjectId })
  userId?: Types.ObjectId;

  /** The wedding the email is about, if any. */
  @Prop({ type: Types.ObjectId })
  weddingId?: Types.ObjectId;

  @Prop({ type: String, enum: NOTIFICATION_KINDS, required: true })
  kind: NotificationKind;

  /** Private delivery address; never public. */
  @Prop({ type: String, required: true })
  recipientEmailNormalized: string;

  /**
   * One logical email. It becomes the email's Message-ID, the same on every
   * attempt, so a copy sent again after a crash is marked as a duplicate.
   */
  @Prop({ type: String, required: true })
  idempotencyKey: string;

  @Prop({ type: String, enum: NOTIFICATION_STATES, required: true, default: 'queued' })
  state: NotificationState;

  /** The Message-ID of the accepted email (SMTP), or the local transport's ID. */
  @Prop({ type: String })
  providerMessageId?: string;

  @Prop({ type: Number, required: true, default: 0 })
  attempts: number;

  /** Our classification of the last failure; never the provider's raw message. */
  @Prop({ type: String })
  lastErrorCode?: string;

  createdAt: Date;
  updatedAt: Date;
}

export type NotificationDocument = HydratedDocument<Notification>;
export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ idempotencyKey: 1 }, { unique: true });
NotificationSchema.index(
  { providerMessageId: 1 },
  { unique: true, partialFilterExpression: { providerMessageId: { $type: 'string' } } },
);
