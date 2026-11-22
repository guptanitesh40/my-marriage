import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, type HydratedDocument } from 'mongoose';

export const ALBUM_KINDS = ['event', 'general', 'custom'] as const;
export type AlbumKind = (typeof ALBUM_KINDS)[number];

/**
 * A photo album of a wedding (schema document §4.18, PRD PHOTO-01). Each
 * ceremony has one `event` album and each wedding one `general` album,
 * both made automatically (decision 0019); `custom` albums are added by
 * the couple. Never returned from a controller; see AlbumDto.
 */
@Schema({ collection: 'albums', timestamps: true })
export class Album {
  @Prop({ type: Types.ObjectId, required: true })
  weddingId: Types.ObjectId;

  /** The ceremony of an `event` album; missing otherwise. */
  @Prop({ type: Types.ObjectId })
  eventId?: Types.ObjectId;

  /**
   * The album's name. An event album stores its ceremony's name when made,
   * but is always shown with the ceremony's current one.
   */
  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, enum: ALBUM_KINDS, required: true })
  kind: AlbumKind;

  /** Whether guests' upload links for this album work; the couple can pause it. */
  @Prop({ type: Boolean, required: true })
  isUploadEnabled: boolean;

  /** Order among the custom albums; event albums follow their ceremonies. */
  @Prop({ type: Number, required: true, min: 0 })
  sortOrder: number;

  @Prop({ type: Types.ObjectId })
  createdBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export type AlbumDocument = HydratedDocument<Album>;
export const AlbumSchema = SchemaFactory.createForClass(Album);

// One album per ceremony and one general album per wedding, however many
// requests make them at once (decision 0019).
AlbumSchema.index(
  { weddingId: 1, eventId: 1 },
  { unique: true, partialFilterExpression: { kind: 'event' } },
);
AlbumSchema.index(
  { weddingId: 1, kind: 1 },
  { unique: true, partialFilterExpression: { kind: 'general' } },
);
AlbumSchema.index({ weddingId: 1, kind: 1, sortOrder: 1 });
