import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import sharp from 'sharp';
import { Types, type Connection, type Model } from 'mongoose';
import type { OutboxEventView, OutboxHandler } from '../../platform/outbox/outbox-handler.js';
import { IMAGE_EXTENSIONS } from '../../platform/storage/image-type.js';
import { objectKey, ObjectStorage } from '../../platform/storage/object-storage.js';
import { Traced } from '../../platform/tracing.js';
import { WeddingAccessService } from '../weddings/wedding-access.service.js';
import { AlbumsService } from './albums.service.js';
import { PHOTO_MAX_PIXELS, PHOTO_SIZES } from './media-policy.js';
import { Photo } from './schemas/photo.schema.js';
import { UploadIntent } from './schemas/upload-intent.schema.js';
import { PHOTO_UPLOADED, UploadsService } from './uploads.service.js';

type StoredIntent = UploadIntent & { _id: Types.ObjectId };

interface Rendition {
  data: Buffer;
  bytes: number;
}

/**
 * Turns an accepted upload into a photo (worker only; architecture §5.3,
 * decision 0019). The file is decoded within a pixel limit, so a bomb or
 * a file that only looks like a photo fails here; turned upright; and
 * re-encoded as WebP display copies, which carry no metadata (no camera
 * location). The original is kept byte for byte, privately. The space set
 * aside is then settled to what is really kept, in the transaction that
 * makes the photo. A guest's photo starts Pending (PRD PHOTO-04); one the
 * couple or a manager uploaded is theirs already, so it starts Approved,
 * approved by them (owner's decision, 0019).
 *
 * Safe to run twice: the photo's ID and file names are chosen up front,
 * and a finished upload is skipped.
 */
@Traced()
@Injectable()
export class PhotoProcessor implements OutboxHandler {
  readonly eventTypes = [PHOTO_UPLOADED] as const;
  private readonly logger = new Logger(PhotoProcessor.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(UploadIntent.name) private readonly intents: Model<UploadIntent>,
    @InjectModel(Photo.name) private readonly photos: Model<Photo>,
    private readonly access: WeddingAccessService,
    private readonly albums: AlbumsService,
    private readonly uploads: UploadsService,
    private readonly storage: ObjectStorage,
  ) {}

  async handle(event: OutboxEventView): Promise<void> {
    const intent = await this.intents
      .findOneAndUpdate(
        { _id: new Types.ObjectId(event.aggregateId), state: { $in: ['uploaded', 'processing'] } },
        { $set: { state: 'processing' } },
        { returnDocument: 'after' },
      )
      .lean();
    // Already a photo, or given up: nothing to do.
    if (!intent) return;
    await this.process(intent);
  }

  async process(intent: StoredIntent): Promise<void> {
    const original = await this.storage.bytes(intent.s3StagingKey);
    if (!original) {
      await this.uploads.giveUp(intent, 'failed', 'UPLOAD_NOT_RECEIVED');
      return;
    }

    let display: Rendition;
    let thumb: Rendition;
    let width: number;
    let height: number;
    try {
      const metadata = await sharp(original, { limitInputPixels: PHOTO_MAX_PIXELS }).metadata();
      width = metadata.autoOrient.width;
      height = metadata.autoOrient.height;
      [display, thumb] = await Promise.all([
        this.render(original, PHOTO_SIZES.display, 82),
        this.render(original, PHOTO_SIZES.thumb, 76),
      ]);
    } catch (error) {
      // Not decodable, or too many pixels: never kept, never shown.
      this.logger.warn('Uploaded file is not a usable photo', {
        uploadId: intent._id.toHexString(),
        error: error instanceof Error ? error.message : String(error),
      });
      await this.uploads.giveUp(intent, 'failed', 'UPLOAD_NOT_IMAGE');
      return;
    }

    const folder = [
      'weddings',
      intent.weddingId.toHexString(),
      'photos',
      intent.photoId.toHexString(),
    ];
    const keys = {
      original: objectKey(...folder, `original.${IMAGE_EXTENSIONS[intent.mimeType]}`),
      display: objectKey(...folder, 'display.webp'),
      thumb: objectKey(...folder, 'thumb.webp'),
    };
    await this.storage.put(keys.original, original, intent.mimeType);
    await this.storage.put(keys.display, display.data, 'image/webp');
    await this.storage.put(keys.thumb, thumb.data, 'image/webp');
    const keptBytes = original.byteLength + display.bytes + thumb.bytes;

    const kept = await this.connection.transaction(async (session) => {
      const settled = await this.access.settleStorage(
        intent.weddingId,
        intent.reservedBytes,
        keptBytes,
        session,
      );
      if (!settled) return false;
      const album = await this.albums.listed(intent.weddingId, intent.albumId, session);
      await this.photos.create(
        [
          {
            _id: intent.photoId,
            weddingId: intent.weddingId,
            albumId: intent.albumId,
            ...(album?.eventId ? { eventId: album.eventId } : {}),
            uploadIntentId: intent._id,
            originalKey: keys.original,
            derivativeKeys: { display: keys.display, thumb: keys.thumb },
            byteCounts: {
              original: original.byteLength,
              display: display.bytes,
              thumb: thumb.bytes,
            },
            mimeType: intent.mimeType,
            width,
            height,
            ...(intent.capabilityId || !intent.createdBy
              ? { moderation: 'pending' }
              : { moderation: 'approved', approvedBy: intent.createdBy, approvedAt: new Date() }),
            source: intent.capabilityId ? 'link' : 'organizer',
            originalName: intent.originalName,
            ...(intent.uploaderName ? { uploaderName: intent.uploaderName } : {}),
            ...(intent.createdBy ? { uploadedBy: intent.createdBy } : {}),
            ...(intent.capabilityId ? { capabilityId: intent.capabilityId } : {}),
          },
        ],
        { session },
      );
      await this.intents.updateOne(
        { _id: intent._id, state: 'processing' },
        { $set: { state: 'complete' } },
        { session },
      );
      return true;
    });

    if (!kept) {
      // The copies made it bigger than the space left: nothing is kept.
      await this.uploads.giveUp(intent, 'failed', 'STORAGE_FULL');
      await Promise.all(Object.values(keys).map((key) => this.storage.delete(key)));
      return;
    }
    await this.storage.delete(intent.s3StagingKey).catch((error: unknown) =>
      this.logger.warn('Upload file not removed yet', {
        uploadId: intent._id.toHexString(),
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }

  /** An upright WebP no larger than `side` on its longest side, without metadata. */
  private async render(original: Uint8Array, side: number, quality: number): Promise<Rendition> {
    const { data, info } = await sharp(original, { limitInputPixels: PHOTO_MAX_PIXELS })
      .rotate()
      .resize({ width: side, height: side, fit: 'inside', withoutEnlargement: true })
      .webp({ quality })
      .toBuffer({ resolveWithObject: true });
    return { data, bytes: info.size };
  }
}
