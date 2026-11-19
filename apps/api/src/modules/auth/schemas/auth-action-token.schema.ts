import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, type HydratedDocument } from 'mongoose';

export const AUTH_TOKEN_PURPOSES = ['verify_email', 'reset_password'] as const;
export type AuthTokenPurpose = (typeof AUTH_TOKEN_PURPOSES)[number];

/**
 * A single-use link sent by email (schema document §4.03, plus
 * `notificationId` and `requestedAt`; decision 0003). The worker creates it
 * while sending the email; only the SHA-256 of the secret in the link is
 * stored, never the link itself.
 */
@Schema({ collection: 'auth_action_tokens', timestamps: { createdAt: true, updatedAt: false } })
export class AuthActionToken {
  @Prop({ type: Types.ObjectId, required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: AUTH_TOKEN_PURPOSES, required: true })
  purpose: AuthTokenPurpose;

  /**
   * The email this link was made for. A retried send makes another link for
   * the same email, and both stay usable, since either may be the one that
   * was delivered.
   */
  @Prop({ type: Types.ObjectId, required: true })
  notificationId: Types.ObjectId;

  /** When that email was requested. A link from an older request never replaces a newer one. */
  @Prop({ type: Date, required: true })
  requestedAt: Date;

  @Prop({ type: String, required: true })
  tokenHash: string;

  /** Checked on every use; the TTL index only cleans up eventually. */
  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: Date })
  consumedAt?: Date;

  /** Set when a newer link replaces this one, or after a password reset. */
  @Prop({ type: Date })
  revokedAt?: Date;

  createdAt: Date;
}

export type AuthActionTokenDocument = HydratedDocument<AuthActionToken>;
export const AuthActionTokenSchema = SchemaFactory.createForClass(AuthActionToken);
AuthActionTokenSchema.index({ tokenHash: 1 }, { unique: true });
AuthActionTokenSchema.index({ userId: 1, purpose: 1 });
AuthActionTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
