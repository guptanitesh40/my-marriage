import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, type HydratedDocument } from 'mongoose';

/**
 * `owner`: the couple, at most two, protected. `admin`: anyone else the
 * couple trusts to run the team, e.g. a parent (decision 0020). `manager`:
 * plans, but never manages the team.
 */
export const MEMBERSHIP_ROLES = ['owner', 'admin', 'manager'] as const;
export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];

/** Who manages the team and may delete planning records: owners and admins. */
export const ADMIN_ROLES = ['owner', 'admin'] as const satisfies readonly MembershipRole[];

/** A member's own short label, e.g. "Bride's father". */
export const MEMBER_LABEL_MAX = 40;

export const MEMBERSHIP_STATUSES = ['active', 'removed'] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

/**
 * A user's place in one wedding (schema document §4.05). A user may own or
 * manage any number of weddings (decision 0020). Removing someone keeps the
 * record, marked; inviting them again makes it active once more.
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
   * True only for an active owner of an active wedding; archiving clears it.
   * Informational since decision 0020: it no longer limits anything.
   */
  @Prop({ type: Boolean, required: true })
  activeOwned: boolean;

  @Prop({ type: Date, required: true })
  joinedAt: Date;

  /** Shown beside the name on the team page; set by owners and admins. */
  @Prop({ type: String, maxlength: MEMBER_LABEL_MAX })
  label?: string;

  @Prop({ type: Date })
  removedAt?: Date;

  @Prop({ type: Types.ObjectId })
  removedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export type WeddingMembershipDocument = HydratedDocument<WeddingMembership>;
export const WeddingMembershipSchema = SchemaFactory.createForClass(WeddingMembership);
WeddingMembershipSchema.index({ weddingId: 1, userId: 1 }, { unique: true });
WeddingMembershipSchema.index({ weddingId: 1, status: 1, role: 1 });
// "My weddings": not in the schema document's list, which has no user-first index.
WeddingMembershipSchema.index({ userId: 1, status: 1 });
