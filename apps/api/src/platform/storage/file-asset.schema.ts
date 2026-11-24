import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, type HydratedDocument } from 'mongoose';

/** `cover`: a website cover photo (decision 0018). `receipt`: an expense's file (decision 0023). */
export const FILE_ASSET_KINDS = ['cover', 'receipt'] as const;
export type FileAssetKind = (typeof FILE_ASSET_KINDS)[number];
export const FILE_ASSET_STATES = ['pending', 'active', 'deleted'] as const;

/** What a receipt belongs to, once it is attached: an expense, or one line of its ledger. */
export const FILE_OWNER_KINDS = ['expense', 'expense_entry'] as const;
export type FileOwnerKind = (typeof FILE_OWNER_KINDS)[number];

export class FileOwner {
  kind: FileOwnerKind;
  id: Types.ObjectId;
}

/**
 * An uploaded file that isn't a gallery photo (schema document §4.22):
 * website covers and expense receipts. Shared by the modules that keep
 * files, so it lives with object storage. The bytes live in object
 * storage; this holds only where, what and whose. `pending` until the
 * upload is checked (an addition to the schema document's states,
 * decision 0018).
 */
@Schema({ collection: 'file_assets', timestamps: true })
export class FileAsset {
  @Prop({ type: Types.ObjectId, required: true })
  weddingId: Types.ObjectId;

  @Prop({ type: String, enum: FILE_ASSET_KINDS, required: true })
  kind: FileAssetKind;

  @Prop({ type: String, enum: FILE_ASSET_STATES, required: true })
  state: (typeof FILE_ASSET_STATES)[number];

  /** Where the browser uploads it, in the `uploads/` folder, before it is checked. */
  @Prop({ type: String, required: true })
  uploadKey: string;

  /** Where it is kept once checked, in its kind's folder. */
  @Prop({ type: String, required: true })
  s3Key: string;

  @Prop({ type: String, required: true })
  contentType: string;

  /** The name it had on the uploader's device, tidied; for receipts. */
  @Prop({ type: String })
  fileName?: string;

  /** Set once the upload is checked. */
  @Prop({ type: Number })
  bytes?: number;

  /** For receipts: what it is attached to. Once attached, never moved to another. */
  @Prop({
    type: {
      kind: { type: String, enum: FILE_OWNER_KINDS, required: true },
      id: { type: Types.ObjectId, required: true },
    },
    _id: false,
  })
  attachedTo?: FileOwner;

  @Prop({ type: Types.ObjectId, required: true })
  createdBy: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export type FileAssetDocument = HydratedDocument<FileAsset>;
export const FileAssetSchema = SchemaFactory.createForClass(FileAsset);
FileAssetSchema.index({ weddingId: 1, kind: 1, state: 1 });
FileAssetSchema.index({ state: 1, createdAt: 1 });
