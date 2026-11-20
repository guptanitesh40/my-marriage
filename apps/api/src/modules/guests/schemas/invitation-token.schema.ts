import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, type HydratedDocument } from 'mongoose';

export const TOKEN_STATUSES = ['active', 'revoked'] as const;
export type TokenStatus = (typeof TOKEN_STATUSES)[number];

/**
 * A guest's private invitation link (schema document §4.15, PRD INV-01,
 * INV-09): a bearer credential, so only its hash is stored. The link itself
 * is derived from this record's ID with GUEST_LINK_SECRET (decision 0015),
 * so organizers can copy it again and the email worker can rebuild it. No
 * expiry: it works until revoked.
 */
@Schema({ collection: 'invitation_tokens', timestamps: { createdAt: true, updatedAt: false } })
export class InvitationToken {
  @Prop({ type: Types.ObjectId, required: true })
  weddingId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  guestId: Types.ObjectId;

  @Prop({ type: String, required: true })
  tokenHash: string;

  @Prop({ type: String, enum: TOKEN_STATUSES, required: true })
  status: TokenStatus;

  @Prop({ type: Date })
  revokedAt?: Date;

  @Prop({ type: Types.ObjectId, required: true })
  createdBy: Types.ObjectId;

  /** When the link was last opened, to the minute at most. */
  @Prop({ type: Date })
  lastUsedAt?: Date;

  createdAt: Date;
}

export type InvitationTokenDocument = HydratedDocument<InvitationToken>;
export const InvitationTokenSchema = SchemaFactory.createForClass(InvitationToken);

// Schema document §4.15; no TTL: links live until revoked.
InvitationTokenSchema.index({ tokenHash: 1 }, { unique: true });
InvitationTokenSchema.index({ weddingId: 1, guestId: 1, status: 1 });
