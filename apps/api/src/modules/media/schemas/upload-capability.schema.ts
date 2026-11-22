import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, type HydratedDocument } from 'mongoose';

export const CAPABILITY_SCOPES = ['album', 'wedding'] as const;
export type CapabilityScope = (typeof CAPABILITY_SCOPES)[number];

export const CAPABILITY_STATUSES = ['active', 'revoked'] as const;
export type CapabilityStatus = (typeof CAPABILITY_STATUSES)[number];

/**
 * A guest upload link (schema document §4.19, decision 0019): for one
 * album, or for the whole wedding, where the guest chooses among its open
 * albums. The secret in the link is derived from this record's ID, so only
 * its hash is stored and the couple can see the same link again. Revoking
 * ends it for good; rotating revokes it and makes a new one.
 */
@Schema({ collection: 'upload_capabilities', timestamps: { createdAt: true, updatedAt: false } })
export class UploadCapability {
  @Prop({ type: Types.ObjectId, required: true })
  weddingId: Types.ObjectId;

  @Prop({ type: String, enum: CAPABILITY_SCOPES, required: true })
  scope: CapabilityScope;

  /** The album of an `album` link. */
  @Prop({ type: Types.ObjectId })
  albumId?: Types.ObjectId;

  @Prop({ type: String, required: true })
  tokenHash: string;

  @Prop({ type: String, enum: CAPABILITY_STATUSES, required: true })
  status: CapabilityStatus;

  @Prop({ type: Date })
  expiresAt?: Date;

  /** The link this one replaced. */
  @Prop({ type: Types.ObjectId })
  rotatedFromId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Date })
  revokedAt?: Date;

  @Prop({ type: Types.ObjectId })
  revokedBy?: Types.ObjectId;

  createdAt: Date;
}

export type UploadCapabilityDocument = HydratedDocument<UploadCapability>;
export const UploadCapabilitySchema = SchemaFactory.createForClass(UploadCapability);
UploadCapabilitySchema.index({ tokenHash: 1 }, { unique: true });
UploadCapabilitySchema.index({ weddingId: 1, albumId: 1, status: 1 });
UploadCapabilitySchema.index({ weddingId: 1, scope: 1, status: 1 });
