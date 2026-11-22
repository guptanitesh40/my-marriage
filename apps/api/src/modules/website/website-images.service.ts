import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, type Model } from 'mongoose';
import { parseObjectId } from '../../platform/mongo.js';
import {
  objectKey,
  ObjectStorage,
  type StoredObject,
  type UploadTarget,
} from '../../platform/storage/object-storage.js';
import { IMAGE_EXTENSIONS, imageTypeOf } from '../../platform/storage/image-type.js';
import { Traced } from '../../platform/tracing.js';
import { FileAsset } from './schemas/file-asset.schema.js';
import { imageNotFound, uploadRejected } from './website-errors.js';
import { COVER_MAX_BYTES, UPLOAD_FORM_SECONDS, type CoverType } from './website-policy.js';

type StoredAsset = FileAsset & { _id: Types.ObjectId };

/** The draft's cover, for the wedding's members (the organizer preview and builder). */
export function draftCoverUrl(weddingId: Types.ObjectId, assetId: Types.ObjectId): string {
  return `/api/v1/weddings/${weddingId.toHexString()}/website/images/${assetId.toHexString()}`;
}

/** The published cover, for anyone; `v` changes with the photo, so it can be cached. */
export function publicCoverUrl(slug: string, assetId: Types.ObjectId): string {
  return `/api/v1/public/weddings/${encodeURIComponent(slug)}/cover?v=${assetId.toHexString()}`;
}

/**
 * The website's cover photos as files (decision 0018). The browser uploads
 * into the bucket's `uploads/` folder with a short-lived form; the upload
 * is then checked (size, and its own bytes say it's a JPEG, PNG or WebP)
 * and moved to `weddings/{weddingId}/website/cover/`. Records are scoped
 * to the wedding: a photo of another wedding is simply not found.
 */
@Traced()
@Injectable()
export class WebsiteImagesService {
  private readonly logger = new Logger(WebsiteImagesService.name);

  constructor(
    @InjectModel(FileAsset.name) private readonly assets: Model<FileAsset>,
    private readonly storage: ObjectStorage,
  ) {}

  /** A form to upload a cover photo to, and the record that waits for it. */
  async createUpload(
    weddingId: Types.ObjectId,
    userId: Types.ObjectId,
    contentType: CoverType,
  ): Promise<{ asset: StoredAsset; target: UploadTarget; expiresAt: Date }> {
    const id = new Types.ObjectId();
    const wedding = weddingId.toHexString();
    const asset = await this.assets.create({
      _id: id,
      weddingId,
      kind: 'cover',
      state: 'pending',
      uploadKey: objectKey('uploads', wedding, id.toHexString()),
      s3Key: objectKey(
        'weddings',
        wedding,
        'website',
        'cover',
        `${id.toHexString()}.${IMAGE_EXTENSIONS[contentType]}`,
      ),
      contentType,
      createdBy: userId,
    });
    const target = await this.storage.uploadTarget(
      asset.uploadKey,
      contentType,
      COVER_MAX_BYTES,
      UPLOAD_FORM_SECONDS,
    );
    const expiresAt = new Date(Date.now() + UPLOAD_FORM_SECONDS * 1000);
    return { asset: asset.toObject(), target, expiresAt };
  }

  /**
   * Checks an upload and keeps it: it arrived, fits the limit, and is the
   * photo type it said it was. Anything else is removed and refused.
   */
  async acceptUpload(weddingId: Types.ObjectId, uploadId: string): Promise<StoredAsset> {
    const id = parseObjectId(uploadId);
    const asset = id
      ? await this.assets.findOne({ _id: id, weddingId, kind: 'cover', state: 'pending' }).lean()
      : null;
    if (!asset) throw uploadRejected('UPLOAD_NOT_FOUND');

    const bytes = await this.storage.size(asset.uploadKey);
    if (bytes === null) throw uploadRejected('UPLOAD_NOT_FOUND');
    if (bytes > COVER_MAX_BYTES) {
      await this.discard(asset);
      throw uploadRejected('UPLOAD_TOO_LARGE');
    }
    const type = imageTypeOf(await this.storage.start(asset.uploadKey, 16));
    if (type !== asset.contentType) {
      await this.discard(asset);
      throw uploadRejected('UPLOAD_NOT_IMAGE');
    }
    await this.storage.move(asset.uploadKey, asset.s3Key, asset.contentType);
    const kept = await this.assets
      .findOneAndUpdate(
        { _id: asset._id, weddingId, state: 'pending' },
        { $set: { state: 'active', bytes } },
        { returnDocument: 'after' },
      )
      .lean();
    if (!kept) throw uploadRejected('UPLOAD_NOT_FOUND');
    return kept;
  }

  /** A kept photo of this wedding, to stream; not found otherwise. */
  async read(weddingId: Types.ObjectId, assetId: string | Types.ObjectId): Promise<StoredObject> {
    const id = typeof assetId === 'string' ? parseObjectId(assetId) : assetId;
    const asset = id
      ? await this.assets.findOne({ _id: id, weddingId, state: 'active' }, { s3Key: 1 }).lean()
      : null;
    const file = asset ? await this.storage.read(asset.s3Key) : null;
    if (!file) throw imageNotFound();
    return file;
  }

  /**
   * Removes covers neither the draft nor the published site uses any more.
   * Uploads still in progress are left alone. A failure is logged and left
   * for the next tidy-up: the website itself is already saved.
   */
  async tidy(
    weddingId: Types.ObjectId,
    keep: readonly (Types.ObjectId | undefined)[],
  ): Promise<void> {
    const kept = keep.filter((id): id is Types.ObjectId => Boolean(id));
    const unused = await this.assets
      .find({ weddingId, kind: 'cover', state: 'active', _id: { $nin: kept } })
      .lean();
    for (const asset of unused) {
      try {
        await this.storage.delete(asset.s3Key);
        await this.assets.updateOne(
          { _id: asset._id, weddingId, state: 'active' },
          { $set: { state: 'deleted' } },
        );
      } catch (error) {
        this.logger.warn('Unused cover not removed yet', {
          weddingId: weddingId.toHexString(),
          assetId: asset._id.toHexString(),
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /** An upload that failed its checks: its file and record go. */
  private async discard(asset: StoredAsset): Promise<void> {
    await this.storage.delete(asset.uploadKey);
    await this.assets.updateOne(
      { _id: asset._id, weddingId: asset.weddingId, state: 'pending' },
      { $set: { state: 'deleted' } },
    );
  }
}
