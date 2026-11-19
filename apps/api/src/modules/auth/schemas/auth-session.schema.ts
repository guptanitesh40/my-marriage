import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, type HydratedDocument } from 'mongoose';

/**
 * One signed-in browser (schema document §4.02). The cookie holds a random
 * secret; only its SHA-256 is stored here, so a copy of this collection
 * cannot be used to sign in.
 */
@Schema({ collection: 'auth_sessions', timestamps: { createdAt: true, updatedAt: false } })
export class AuthSession {
  @Prop({ type: Types.ObjectId, required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true })
  sessionHash: string;

  /**
   * Absolute end of the session. Checked on every request; the TTL index
   * only deletes expired sessions eventually (MongoDB runs it about once a
   * minute, and later under load).
   */
  @Prop({ type: Date, required: true })
  expiresAt: Date;

  /** Set on sign-out or revocation; the session stops working immediately. */
  @Prop({ type: Date })
  revokedAt?: Date;

  /** Last use, recorded at most every few minutes. Drives the inactivity timeout. */
  @Prop({ type: Date })
  lastSeenAt?: Date;

  /**
   * The user's `passwordChangedAt` as read when the password was checked
   * (missing if it had never changed). The session works only while the
   * user's value is still the same. Comparing with `createdAt` instead
   * would let a sign-in that checked the old password just before a reset
   * create its session just after it, and survive the reset.
   */
  @Prop({ type: Date })
  passwordChangedAt?: Date;

  createdAt: Date;
}

export type AuthSessionDocument = HydratedDocument<AuthSession>;
export const AuthSessionSchema = SchemaFactory.createForClass(AuthSession);
AuthSessionSchema.index({ sessionHash: 1 }, { unique: true });
AuthSessionSchema.index({ userId: 1, expiresAt: 1 });
AuthSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
