import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, type HydratedDocument } from 'mongoose';

export const MEMBERSHIP_ROLES = ['owner', 'manager'] as const;
export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];

export const MEMBERSHIP_STATUSES = ['active', 'removed'] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

/** The index that allows each user one active owned wedding (schema document §5.1). */
export const ACTIVE_OWNED_INDEX = 'uniq_active_owned_wedding_per_user';

/**
 * A user's place in one wedding (schema document §4.05). The ownership
 * rules live in its indexes, not in application checks: see ACTIVE_OWNED_INDEX.
 */
@Schema({ collection: 'wedding_memberships', timestamps: true })
export class WeddingMembership {
  @Prop({ type: Types.ObjectId, required: true })
  weddingId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: MEMBERSHIP_ROLES, required: true })
  role: MembershipRole;

  @Prop({ type: String, enum: MEMBERSHIP_STATUSES, required: true })
  status: MembershipStatus;

  /**
   * True only for an active owner of an active wedding. Archiving clears it,
   * which frees the owner to create another wedding (PRD WED-05).
   */
  @Prop({ type: Boolean, required: true })
  activeOwned: boolean;

  @Prop({ type: Date, required: true })
  joinedAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

export type WeddingMembershipDocument = HydratedDocument<WeddingMembership>;
export const WeddingMembershipSchema = SchemaFactory.createForClass(WeddingMembership);
WeddingMembershipSchema.index({ weddingId: 1, userId: 1 }, { unique: true });
WeddingMembershipSchema.index(
  { userId: 1 },
  {
    name: ACTIVE_OWNED_INDEX,
    unique: true,
    partialFilterExpression: { role: 'owner', status: 'active', activeOwned: true },
  },
);
WeddingMembershipSchema.index({ weddingId: 1, status: 1, role: 1 });
// "My weddings": not in the schema document's list, which has no user-first index.
WeddingMembershipSchema.index({ userId: 1, status: 1 });
