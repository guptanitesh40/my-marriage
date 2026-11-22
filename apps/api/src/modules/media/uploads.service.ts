import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Types, type ClientSession, type Connection, type Model } from 'mongoose';
import { parseObjectId } from '../../platform/mongo.js';
import { OutboxService } from '../../platform/outbox/outbox.service.js';
import { RateLimiter, type RateLimitRule } from '../../platform/rate-limit.js';
import { imageTypeOf } from '../../platform/storage/image-type.js';
import { objectKey, ObjectStorage } from '../../platform/storage/object-storage.js';
import { Traced } from '../../platform/tracing.js';
import type { AuthenticatedUser } from '../auth/sessions.service.js';
import { WeddingAccessService } from '../weddings/wedding-access.service.js';
import { weddingArchived } from '../weddings/wedding-errors.js';
import { AlbumsService } from './albums.service.js';
import type { CreateUploadDto, UploadDto } from './dto/upload.dto.js';
import {
  albumNotFound,
  storageFull,
  uploadExpired,
  uploadNotFound,
  uploadNotImage,
  uploadNotReceived,
  uploadTooLarge,
} from './media-errors.js';
import { RESERVE_FACTOR, UPLOAD_EXPIRY_SECONDS, UPLOAD_FORM_SECONDS } from './media-policy.js';
import {
  FINAL_UPLOAD_STATES,
  UploadIntent,
  type UploadState,
} from './schemas/upload-intent.schema.js';

type StoredIntent = UploadIntent & { _id: Types.ObjectId };

/** The outbox event that has the worker process an uploaded photo. */
export const PHOTO_UPLOADED = 'media.photo.uploaded';

const hours = (n: number) => n * 3600;

/** Uploads one member can start (decision 0019); guests' links have their own. */
export const MEMBER_UPLOAD_LIMIT: RateLimitRule = {
  name: 'media-upload-member-hour',
  limit: 500,
  windowSeconds: hours(1),
};

/** Who is uploading: a member of the wedding, or a guest through an upload link. */
export type Uploader =
  { kind: 'member'; userId: Types.ObjectId } | { kind: 'link'; capabilityId: Types.ObjectId };

/**
 * Photos on their way in (schema document §6.6, architecture §5.3). A
 * photo's space is set aside before anything is uploaded, atomically, so
 * uploads at the same time can never pass the 5 GB limit; the browser
 * then sends the file straight to the bucket's quarantine folder. On
 * completion the API checks it arrived and is the photo type it claimed,
 * and leaves the rest to the worker. Space is given back exactly once,
 * when an upload fails or is abandoned.
 */
@Traced()
@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(UploadIntent.name) private readonly intents: Model<UploadIntent>,
    private readonly access: WeddingAccessService,
    private readonly albums: AlbumsService,
    private readonly storage: ObjectStorage,
    private readonly outbox: OutboxService,
    private readonly limiter: RateLimiter,
  ) {}

  /** A member adds a photo to one of the wedding's albums. */
  async initiateAsMember(user: AuthenticatedUser, input: CreateUploadDto): Promise<UploadDto> {
    const albumId = parseObjectId(input.albumId);
    // The album says which wedding; membership of that wedding is then
    // required, so another wedding's album is "not found" either way.
    const weddingId = albumId ? await this.albums.weddingOf(albumId) : null;
    if (!albumId || !weddingId) throw albumNotFound();
    const { wedding, userId } = await this.access.require(user, weddingId.toHexString());
    if (wedding.status !== 'active') throw weddingArchived();
    await this.limiter.consume(MEMBER_UPLOAD_LIMIT, userId.toHexString());
    return this.initiate(wedding._id, albumId, { kind: 'member', userId }, input);
  }

  /** A member says a photo's upload finished. */
  async completeAsMember(user: AuthenticatedUser, uploadId: string): Promise<UploadDto> {
    const intent = await this.find(uploadId);
    if (!intent?.createdBy) throw uploadNotFound();
    await this.access.require(user, intent.weddingId.toHexString());
    return this.complete(intent);
  }

  /**
   * Sets space aside and makes the upload form. The album must still be
   * listed (not a deleted ceremony's); `allowPaused` is for members, whom
   * a paused album does not stop.
   */
  async initiate(
    weddingId: Types.ObjectId,
    albumId: Types.ObjectId,
    uploader: Uploader,
    input: CreateUploadDto,
  ): Promise<UploadDto> {
    const reservedBytes = Math.ceil(input.declaredBytes * RESERVE_FACTOR);
    const id = new Types.ObjectId();
    const photoId = new Types.ObjectId();
    const s3StagingKey = objectKey('uploads', weddingId.toHexString(), id.toHexString());
    const expiresAt = new Date(Date.now() + UPLOAD_EXPIRY_SECONDS * 1000);

    const intent = await this.connection.transaction(async (session) => {
      const album = await this.albums.listed(weddingId, albumId, session);
      if (!album || (uploader.kind === 'link' && !album.isUploadEnabled)) throw albumNotFound();
      if (!(await this.access.reserveStorage(weddingId, reservedBytes, session))) {
        throw storageFull();
      }
      const [created] = await this.intents.create(
        [
          {
            _id: id,
            weddingId,
            albumId,
            ...(uploader.kind === 'member'
              ? { createdBy: uploader.userId }
              : { capabilityId: uploader.capabilityId }),
            s3StagingKey,
            declaredBytes: input.declaredBytes,
            reservedBytes,
            mimeType: input.contentType,
            originalName: input.fileName,
            ...(input.uploaderName ? { uploaderName: input.uploaderName } : {}),
            state: 'initiated',
            expiresAt,
            photoId,
          },
        ],
        { session },
      );
      return created;
    });
    if (!intent) throw new Error('The upload was not started');

    // The form allows exactly the declared size: the space set aside covers no more.
    const upload = await this.storage.uploadTarget(
      s3StagingKey,
      input.contentType,
      input.declaredBytes,
      UPLOAD_FORM_SECONDS,
    );
    return { ...this.toDto(intent.toObject()), upload };
  }

  /**
   * Checks the file arrived, fits what was declared and is the photo type
   * it claimed, then queues it for processing. Calling it again for an
   * upload already accepted answers the same.
   */
  async complete(intent: StoredIntent): Promise<UploadDto> {
    if (intent.state !== 'initiated') {
      if (intent.state === 'failed' || intent.state === 'expired') throw uploadExpired();
      return this.toDto(intent);
    }
    if (intent.expiresAt.getTime() <= Date.now()) {
      await this.giveUp(intent, 'expired', 'UPLOAD_EXPIRED');
      throw uploadExpired();
    }
    const bytes = await this.storage.size(intent.s3StagingKey);
    if (bytes === null) throw uploadNotReceived();
    if (bytes > intent.declaredBytes) {
      await this.giveUp(intent, 'failed', 'UPLOAD_TOO_LARGE');
      throw uploadTooLarge();
    }
    const type = imageTypeOf(await this.storage.start(intent.s3StagingKey, 16));
    if (type !== intent.mimeType) {
      await this.giveUp(intent, 'failed', 'UPLOAD_NOT_IMAGE');
      throw uploadNotImage();
    }

    const accepted = await this.connection.transaction(async (session) => {
      // Fenced: a photo is not accepted into a wedding archived meanwhile.
      // Its space is then given back by the sweep, when the upload expires.
      await this.access.raiseWriteFence(intent.weddingId, session);
      const moved = await this.intents
        .findOneAndUpdate(
          { _id: intent._id, weddingId: intent.weddingId, state: 'initiated' },
          { $set: { state: 'uploaded', verifiedBytes: bytes } },
          { returnDocument: 'after', session },
        )
        .lean();
      if (!moved) return null;
      await this.outbox.add(session, {
        eventType: PHOTO_UPLOADED,
        aggregateId: intent._id,
        payloadRef: { weddingId: intent.weddingId.toHexString() },
      });
      return moved;
    });
    // Another request completed it first.
    if (!accepted) return this.toDto((await this.intents.findById(intent._id).lean()) ?? intent);
    return this.toDto(accepted);
  }

  /**
   * Gives back the space of uploads that were started but never completed
   * once their form has long expired, and removes any file that arrived
   * anyway. For the worker's regular sweep; safe to run twice.
   */
  async expireAbandoned(now = new Date(), batch = 200): Promise<number> {
    const stale = await this.intents
      .find({ state: 'initiated', expiresAt: { $lte: now } })
      .limit(batch)
      .lean();
    let expired = 0;
    for (const intent of stale) {
      if (await this.giveUp(intent, 'expired', 'UPLOAD_EXPIRED')) expired += 1;
    }
    return expired;
  }

  /**
   * Ends an upload that will not become a photo: its space is given back in
   * the same transaction that moves it to a final state, so only once, and
   * its file is removed. False when it had already ended.
   */
  async giveUp(
    intent: StoredIntent,
    state: Extract<UploadState, 'failed' | 'expired'>,
    failure: string,
    session?: ClientSession,
  ): Promise<boolean> {
    const run = async (transaction: ClientSession) => {
      const ended = await this.intents.updateOne(
        { _id: intent._id, weddingId: intent.weddingId, state: { $nin: FINAL_UPLOAD_STATES } },
        { $set: { state, failure } },
        { session: transaction },
      );
      if (ended.modifiedCount !== 1) return false;
      await this.access.releaseStorage(intent.weddingId, intent.reservedBytes, transaction);
      return true;
    };
    const ended = session ? await run(session) : await this.connection.transaction(run);
    if (ended) {
      await this.storage.delete(intent.s3StagingKey).catch((error: unknown) =>
        // The bucket's quarantine folder empties itself after a day.
        this.logger.warn('Upload file not removed yet', {
          uploadId: intent._id.toHexString(),
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
    return ended;
  }

  /** How many of an album's uploads are received and still being processed. */
  async processing(weddingId: Types.ObjectId, albumId?: Types.ObjectId): Promise<number> {
    return this.intents.countDocuments({
      weddingId,
      ...(albumId ? { albumId } : {}),
      state: { $in: ['uploaded', 'processing'] },
    });
  }

  private async find(uploadId: string): Promise<StoredIntent | null> {
    const id = parseObjectId(uploadId);
    return id ? this.intents.findById(id).lean() : null;
  }

  private toDto(intent: StoredIntent): UploadDto {
    return {
      id: intent._id.toHexString(),
      albumId: intent.albumId.toHexString(),
      state: intent.state,
      expiresAt: intent.expiresAt,
    };
  }
}
