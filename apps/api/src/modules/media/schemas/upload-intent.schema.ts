import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, type HydratedDocument } from 'mongoose';
import { IMAGE_TYPES, type ImageType } from '../../../platform/storage/image-type.js';

export const UPLOAD_STATES = [
  'initiated',
  'uploaded',
  'processing',
  'complete',
  'failed',
  'expired',
] as const;
export type UploadState = (typeof UPLOAD_STATES)[number];

/** States an upload never leaves; its reservation has been settled or given back. */
export const FINAL_UPLOAD_STATES: readonly UploadState[] = ['complete', 'failed', 'expired'];

/**
 * One photo on its way in (schema document §4.20): the space set aside
 * for it, where the browser sends it, and how far it got. Reservations
 * are given back exactly once, by moving out of a non-final state.
 */
@Schema({ collection: 'upload_intents', timestamps: true })
export class UploadIntent {
  @Prop({ type: Types.ObjectId, required: true })
  weddingId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  albumId: Types.ObjectId;

  /** The guest upload link it came through; missing for the wedding's own members. */
  @Prop({ type: Types.ObjectId })
  capabilityId?: Types.ObjectId;

  /** The member who uploaded it. */
  @Prop({ type: Types.ObjectId })
  createdBy?: Types.ObjectId;

  /** Made by the API, in the bucket's quarantine folder. */
  @Prop({ type: String, required: true })
  s3StagingKey: string;

  @Prop({ type: Number, required: true, min: 1 })
  declaredBytes: number;

  @Prop({ type: Number, required: true, min: 0 })
  reservedBytes: number;

  @Prop({ type: Number })
  verifiedBytes?: number;

  /** As declared; checked against the file's own bytes before it is kept. */
  @Prop({ type: String, enum: IMAGE_TYPES, required: true })
  mimeType: ImageType;

  /** Shown to the couple only; never used as a key. */
  @Prop({ type: String, required: true })
  originalName: string;

  @Prop({ type: String })
  uploaderName?: string;

  @Prop({ type: String, enum: UPLOAD_STATES, required: true })
  state: UploadState;

  /** Why it failed, as an error code. */
  @Prop({ type: String })
  failure?: string;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  /** Chosen up front, so processing it twice makes the same photo. */
  @Prop({ type: Types.ObjectId, required: true })
  photoId: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export type UploadIntentDocument = HydratedDocument<UploadIntent>;
export const UploadIntentSchema = SchemaFactory.createForClass(UploadIntent);
// No TTL: an expired upload's space and file are given back first (schema document §4.20).
UploadIntentSchema.index({ weddingId: 1, state: 1, expiresAt: 1 });
UploadIntentSchema.index({ state: 1, expiresAt: 1 });
