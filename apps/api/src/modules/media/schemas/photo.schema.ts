import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, type HydratedDocument } from 'mongoose';
import { IMAGE_TYPES, type ImageType } from '../../../platform/storage/image-type.js';

export const MODERATION_STATES = ['pending', 'approved', 'rejected', 'hidden', 'deleted'] as const;
export type ModerationState = (typeof MODERATION_STATES)[number];

export const PHOTO_SOURCES = ['organizer', 'link'] as const;
export type PhotoSource = (typeof PHOTO_SOURCES)[number];

@Schema({ _id: false })
export class PhotoKeys {
  @Prop({ type: String, required: true })
  display: string;

  @Prop({ type: String, required: true })
  thumb: string;
}
const PhotoKeysSchema = SchemaFactory.createForClass(PhotoKeys);

@Schema({ _id: false })
export class PhotoBytes {
  @Prop({ type: Number, required: true, min: 0 })
  original: number;

  @Prop({ type: Number, required: true, min: 0 })
  display: number;

  @Prop({ type: Number, required: true, min: 0 })
  thumb: number;
}
const PhotoBytesSchema = SchemaFactory.createForClass(PhotoBytes);

/**
 * A kept photo (schema document §4.21, PRD PHOTO-01): its files are in
 * the bucket; this is what the API knows about them. Every photo starts
 * `pending` (PHOTO-04). Never returned from a controller; see PhotoDto.
 */
@Schema({ collection: 'photos', timestamps: true })
export class Photo {
  @Prop({ type: Types.ObjectId, required: true })
  weddingId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  albumId: Types.ObjectId;

  /** The album's ceremony, for filtering by ceremony. */
  @Prop({ type: Types.ObjectId })
  eventId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  uploadIntentId: Types.ObjectId;

  /** The original, byte for byte, private (decision 0019). */
  @Prop({ type: String, required: true })
  originalKey: string;

  /** Re-encoded copies without metadata. */
  @Prop({ type: PhotoKeysSchema, required: true })
  derivativeKeys: PhotoKeys;

  @Prop({ type: PhotoBytesSchema, required: true })
  byteCounts: PhotoBytes;

  @Prop({ type: String, enum: IMAGE_TYPES, required: true })
  mimeType: ImageType;

  /** Upright, as displayed. */
  @Prop({ type: Number, required: true, min: 1 })
  width: number;

  @Prop({ type: Number, required: true, min: 1 })
  height: number;

  @Prop({ type: String, enum: MODERATION_STATES, required: true })
  moderation: ModerationState;

  @Prop({ type: String, enum: PHOTO_SOURCES, required: true })
  source: PhotoSource;

  /** The file's name as uploaded; for the couple. */
  @Prop({ type: String, required: true })
  originalName: string;

  /** A guest's optional name; shown to the couple only (decision 0019). */
  @Prop({ type: String })
  uploaderName?: string;

  @Prop({ type: Types.ObjectId })
  uploadedBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  capabilityId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  approvedBy?: Types.ObjectId;

  @Prop({ type: Date })
  approvedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export type PhotoDocument = HydratedDocument<Photo>;
export const PhotoSchema = SchemaFactory.createForClass(Photo);
PhotoSchema.index({ weddingId: 1, albumId: 1, moderation: 1, createdAt: -1 });
PhotoSchema.index({ weddingId: 1, moderation: 1, createdAt: -1 });
