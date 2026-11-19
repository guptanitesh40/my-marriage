import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, type HydratedDocument } from 'mongoose';

export const WEDDING_STATUSES = ['active', 'archived', 'deletion_pending'] as const;
export type WeddingStatus = (typeof WEDDING_STATUSES)[number];

/** Photo storage per wedding (PRD 14.1): decimal 5 GB, as the schema document proposes (§11). */
export const WEDDING_QUOTA_BYTES = 5_000_000_000;

/** Photo storage counters, changed only by atomic updates (schema document §6.6). */
@Schema({ _id: false })
export class WeddingQuota {
  @Prop({ type: Number, required: true, min: 0 })
  limitBytes: number;

  @Prop({ type: Number, required: true, min: 0 })
  usedBytes: number;

  @Prop({ type: Number, required: true, min: 0 })
  reservedBytes: number;
}
const WeddingQuotaSchema = SchemaFactory.createForClass(WeddingQuota);

/**
 * A wedding workspace (schema document §4.04). Never returned from a
 * controller; see WeddingDto.
 *
 * Fields of features not built yet (main venue, description, cover photo,
 * archive metadata) arrive with those features.
 */
@Schema({ collection: 'weddings', timestamps: true })
export class Wedding {
  /** Lowercase, globally unique; the address of the future public website. */
  @Prop({ type: String, required: true })
  slug: string;

  @Prop({ type: String, required: true })
  brideName: string;

  @Prop({ type: String, required: true })
  groomName: string;

  @Prop({ type: String, required: true })
  city: string;

  @Prop({ type: String, required: true })
  state: string;

  /** A calendar day, stored as midnight UTC. Missing until the couple knows it. */
  @Prop({ type: Date })
  weddingDate?: Date;

  @Prop({ type: String, enum: WEDDING_STATUSES, required: true })
  status: WeddingStatus;

  /** Raised in the same transaction as every archive-sensitive write (schema document §6.3). */
  @Prop({ type: Number, required: true, min: 0 })
  writeFenceVersion: number;

  @Prop({ type: WeddingQuotaSchema, required: true })
  quota: WeddingQuota;

  /** The first owner. */
  @Prop({ type: Types.ObjectId, required: true })
  createdBy: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export type WeddingDocument = HydratedDocument<Wedding>;
export const WeddingSchema = SchemaFactory.createForClass(Wedding);
WeddingSchema.index({ slug: 1 }, { unique: true });
WeddingSchema.index({ status: 1, createdAt: 1 });
