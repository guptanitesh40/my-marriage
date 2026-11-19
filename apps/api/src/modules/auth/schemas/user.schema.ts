import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

export const USER_STATUSES = ['active', 'disabled', 'deletion_pending'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/** A person's account (schema document §4.01). Never returned from a controller. */
@Schema({ collection: 'users', timestamps: true })
export class User {
  /** See `normalizeEmail`. The unique index is what prevents duplicate accounts. */
  @Prop({ type: String, required: true })
  emailNormalized: string;

  @Prop({ type: String, required: true })
  displayName: string;

  /** Argon2id PHC string only (see PasswordHasher). */
  @Prop({ type: String, required: true })
  passwordHash: string;

  /** Missing until the email address is verified. */
  @Prop({ type: Date })
  verifiedAt?: Date;

  @Prop({ type: String, enum: USER_STATUSES, required: true, default: 'active' })
  status: UserStatus;

  /** Set by every password change; sessions made before it stop working (see AuthSession). */
  @Prop({ type: Date })
  passwordChangedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ emailNormalized: 1 }, { unique: true });
UserSchema.index({ status: 1, createdAt: 1 });
