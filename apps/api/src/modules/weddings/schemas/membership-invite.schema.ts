import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, type HydratedDocument } from 'mongoose';
import {
  MEMBER_LABEL_MAX,
  MEMBERSHIP_ROLES,
  type MembershipRole,
} from './wedding-membership.schema.js';

/**
 * `expired` is never written: a pending invitation past `expiresAt` is
 * expired, which every read checks. Kept for the schema document's enum.
 * `declined`: the invitee said no; they can be invited again.
 */
export const INVITE_STATUSES = ['pending', 'accepted', 'revoked', 'declined', 'expired'] as const;
export type InviteStatus = (typeof INVITE_STATUSES)[number];

/**
 * An invitation to join one wedding (schema document §4.06). Never deleted,
 * so it stays as a record of who invited whom.
 *
 * The secret link is created by the worker as it sends the email, and only
 * its SHA-256 is kept (`tokenHashes`). Several hashes, because a send that
 * is retried after a crash creates a second secret for the same email and
 * either may be the one that reached the inbox. Resending clears them all,
 * so earlier links stop working.
 */
@Schema({ collection: 'membership_invites', timestamps: true })
export class MembershipInvite {
  @Prop({ type: Types.ObjectId, required: true })
  weddingId: Types.ObjectId;

  /** Who may accept: the signed-in, verified account with this address. */
  @Prop({ type: String, required: true })
  emailNormalized: string;

  @Prop({ type: String, enum: MEMBERSHIP_ROLES, required: true })
  role: MembershipRole;

  @Prop({ type: String, enum: INVITE_STATUSES, required: true })
  status: InviteStatus;

  @Prop({ type: [String], required: true, default: [] })
  tokenHashes: string[];

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  /** The email carrying the current link; earlier emails are no longer sent. */
  @Prop({ type: Types.ObjectId, required: true })
  notificationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  invitedBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  acceptedBy?: Types.ObjectId;

  @Prop({ type: Date })
  acceptedAt?: Date;

  @Prop({ type: Date })
  revokedAt?: Date;

  @Prop({ type: Types.ObjectId })
  revokedBy?: Types.ObjectId;

  @Prop({ type: Date })
  declinedAt?: Date;

  /**
   * An owner handing over their own place (decision 0025): `invitedBy`, an
   * owner when it was sent, becomes an admin as the invitee becomes an
   * owner, in the transaction that accepts it. Only with role `owner`.
   */
  @Prop({ type: Boolean })
  handOver?: boolean;

  /** Becomes the member's label when accepted. */
  @Prop({ type: String, maxlength: MEMBER_LABEL_MAX })
  label?: string;

  createdAt: Date;
  updatedAt: Date;
}

export type MembershipInviteDocument = HydratedDocument<MembershipInvite>;
export const MembershipInviteSchema = SchemaFactory.createForClass(MembershipInvite);
// Unique among issued secrets; invitations not yet sent have none.
MembershipInviteSchema.index(
  { tokenHashes: 1 },
  { unique: true, partialFilterExpression: { tokenHashes: { $type: 'string' } } },
);
MembershipInviteSchema.index({ weddingId: 1, status: 1 });
MembershipInviteSchema.index({ emailNormalized: 1, status: 1 });
MembershipInviteSchema.index({ notificationId: 1 });
