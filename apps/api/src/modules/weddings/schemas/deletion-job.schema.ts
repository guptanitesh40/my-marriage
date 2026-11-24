import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, type HydratedDocument } from 'mongoose';
import { WEDDING_STATUSES, type WeddingStatus } from './wedding.schema.js';

/**
 * `requested` is waiting; `cancelled` was withdrawn by an owner. The purge
 * states (`purging`, `verified`, `failed`) belong to the later approved
 * purge (decision 0021): nothing sets them yet.
 */
export const DELETION_STATES = ['requested', 'cancelled', 'purging', 'verified', 'failed'] as const;
export type DeletionState = (typeof DELETION_STATES)[number];

/**
 * An owner's request to delete a wedding (schema document §4.29, PRD
 * WED-07). Requesting is a soft delete: the wedding becomes
 * `deletion_pending`, read-only and offline to the public, and nothing is
 * erased (decision 0021). One open request per wedding, by index.
 */
@Schema({ collection: 'deletion_jobs', timestamps: true })
export class DeletionJob {
  @Prop({ type: Types.ObjectId, required: true })
  weddingId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  requestedBy: Types.ObjectId;

  @Prop({ type: String, enum: DELETION_STATES, required: true })
  state: DeletionState;

  @Prop({ type: Date, required: true })
  requestedAt: Date;

  /** What the wedding was before the request, so cancelling restores it. */
  @Prop({ type: String, enum: WEDDING_STATUSES, required: true })
  previousStatus: WeddingStatus;

  @Prop({ type: Date })
  cancelledAt?: Date;

  @Prop({ type: Types.ObjectId })
  cancelledBy?: Types.ObjectId;

  @Prop({ type: Date })
  completedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export type DeletionJobDocument = HydratedDocument<DeletionJob>;
export const DeletionJobSchema = SchemaFactory.createForClass(DeletionJob);
DeletionJobSchema.index({ weddingId: 1, createdAt: 1 });
DeletionJobSchema.index({ state: 1, requestedAt: 1 });
// One waiting request per wedding, however many arrive at once.
DeletionJobSchema.index(
  { weddingId: 1 },
  { unique: true, partialFilterExpression: { state: 'requested' } },
);
