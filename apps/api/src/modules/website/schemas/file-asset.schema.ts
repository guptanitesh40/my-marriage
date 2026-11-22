import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, type HydratedDocument } from 'mongoose';

export const FILE_ASSET_KINDS = ['cover'] as const;
export const FILE_ASSET_STATES = ['pending', 'active', 'deleted'] as const;

/**
 * An uploaded file that isn't a gallery photo (schema document §4.22):
 * for now the wedding website's cover. The bytes live in object storage;
 * this holds only where, what and whose. `pending` until the upload is
 * checked (an addition to the schema document's states, decision 0018).
 */
@Schema({ collection: 'file_assets', timestamps: true })
export class FileAsset {
  @Prop({ type: Types.ObjectId, required: true })
  weddingId: Types.ObjectId;

  @Prop({ type: String, enum: FILE_ASSET_KINDS, required: true })
  kind: (typeof FILE_ASSET_KINDS)[number];

  @Prop({ type: String, enum: FILE_ASSET_STATES, required: true })
  state: (typeof FILE_ASSET_STATES)[number];

  /** Where the browser uploads it, in the `uploads/` folder, before it is checked. */
  @Prop({ type: String, required: true })
  uploadKey: string;

  /** Where it is kept once checked: `weddings/{weddingId}/website/cover/…`. */
  @Prop({ type: String, required: true })
  s3Key: string;

  @Prop({ type: String, required: true })
  contentType: string;

  /** Set once the upload is checked. */
  @Prop({ type: Number })
  bytes?: number;

  @Prop({ type: Types.ObjectId, required: true })
  createdBy: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export type FileAssetDocument = HydratedDocument<FileAsset>;
export const FileAssetSchema = SchemaFactory.createForClass(FileAsset);
FileAssetSchema.index({ weddingId: 1, kind: 1, state: 1 });
FileAssetSchema.index({ state: 1, createdAt: 1 });
