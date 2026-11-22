import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, type HydratedDocument } from 'mongoose';

export const EXPORT_STATES = ['queued', 'processing', 'ready', 'failed', 'expired'] as const;
export type ExportState = (typeof EXPORT_STATES)[number];

export const EXPORT_SCOPES = ['approved', 'all'] as const;
export type ExportScope = (typeof EXPORT_SCOPES)[number];

/**
 * A ZIP of a wedding's photos (schema document §4.23, PRD PHOTO-06): the
 * originals, in a folder per album, made by the worker and kept privately
 * for EXPORT_KEEP_DAYS. Approved photos only, or every kept photo.
 */
@Schema({ collection: 'media_exports', timestamps: { createdAt: true, updatedAt: false } })
export class MediaExport {
  @Prop({ type: Types.ObjectId, required: true })
  weddingId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  requestedBy: Types.ObjectId;

  @Prop({ type: String, enum: EXPORT_SCOPES, required: true })
  scope: ExportScope;

  /** One album only; the whole wedding when missing. */
  @Prop({ type: Types.ObjectId })
  albumId?: Types.ObjectId;

  @Prop({ type: String, enum: EXPORT_STATES, required: true })
  state: ExportState;

  /** Private; streamed to the wedding's members, never linked to directly. */
  @Prop({ type: String })
  exportKey?: string;

  @Prop({ type: Number })
  bytes?: number;

  @Prop({ type: Number })
  photoCount?: number;

  @Prop({ type: String })
  failure?: string;

  @Prop({ type: Date })
  finishedAt?: Date;

  @Prop({ type: Date })
  expiresAt?: Date;

  createdAt: Date;
}

export type MediaExportDocument = HydratedDocument<MediaExport>;
export const MediaExportSchema = SchemaFactory.createForClass(MediaExport);
MediaExportSchema.index({ weddingId: 1, createdAt: -1 });
MediaExportSchema.index({ state: 1, expiresAt: 1 });
