import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import archiver from 'archiver';
import { Types, type Connection, type Model } from 'mongoose';
import { PassThrough } from 'node:stream';
import { parseObjectId } from '../../platform/mongo.js';
import { OutboxService } from '../../platform/outbox/outbox.service.js';
import type { OutboxEventView, OutboxHandler } from '../../platform/outbox/outbox-handler.js';
import { RateLimiter } from '../../platform/rate-limit.js';
import {
  objectKey,
  ObjectStorage,
  type StoredObject,
} from '../../platform/storage/object-storage.js';
import { Traced } from '../../platform/tracing.js';
import type { AuthenticatedUser } from '../auth/sessions.service.js';
import { WeddingAccessService } from '../weddings/wedding-access.service.js';
import { AlbumsService } from './albums.service.js';
import type { MediaExportDto, MediaExportListDto } from './dto/media-export.dto.js';
import { albumNotFound, exportNotFound, photoNotFound } from './media-errors.js';
import { EXPORT_KEEP_DAYS, EXPORTS_PER_DAY } from './media-policy.js';
import { MediaExport, type ExportScope } from './schemas/media-export.schema.js';
import { Photo } from './schemas/photo.schema.js';

type StoredExport = MediaExport & { _id: Types.ObjectId };

/** The outbox event that has the worker build an export. */
export const EXPORT_REQUESTED = 'media.export.requested';

/** States an export is still being made in. */
const ACTIVE = ['queued', 'processing'] as const;

/** A name safe in a ZIP on every system. */
function safeName(value: string, fallback: string): string {
  const cleaned = value
    .normalize('NFC')
    .replace(/[\\/:*?"<>|\p{Cc}]/gu, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
  return cleaned || fallback;
}

/**
 * Downloads (PRD PHOTO-06): one photo's original, or a ZIP of the
 * originals, grouped by album, made in the background. For the wedding's
 * owners and managers, also once archived: downloading changes nothing.
 * Files are streamed by the API, never linked to in the bucket, and ZIPs
 * are removed after EXPORT_KEEP_DAYS.
 */
@Traced()
@Injectable()
export class MediaExportsService implements OutboxHandler {
  readonly eventTypes = [EXPORT_REQUESTED] as const;
  private readonly logger = new Logger(MediaExportsService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(MediaExport.name) private readonly exports: Model<MediaExport>,
    @InjectModel(Photo.name) private readonly photos: Model<Photo>,
    private readonly access: WeddingAccessService,
    private readonly albums: AlbumsService,
    private readonly storage: ObjectStorage,
    private readonly outbox: OutboxService,
    private readonly limiter: RateLimiter,
  ) {}

  /**
   * Starts a ZIP; while one of the same kind is still being made, that one
   * is returned instead of starting another.
   */
  async start(
    user: AuthenticatedUser,
    weddingId: string,
    scope: ExportScope,
    albumId?: string,
  ): Promise<MediaExportDto> {
    const { wedding, userId } = await this.access.require(user, weddingId);
    let album: Types.ObjectId | undefined;
    if (albumId) {
      const id = parseObjectId(albumId);
      const found = id ? await this.albums.listed(wedding._id, id) : null;
      if (!found) throw albumNotFound();
      album = found._id;
    }
    const same = {
      weddingId: wedding._id,
      scope,
      albumId: album ?? { $exists: false },
      state: { $in: ACTIVE },
    };
    const running = await this.exports.findOne(same).lean();
    if (running) return this.toDto(running);
    await this.limiter.consume(EXPORTS_PER_DAY, wedding._id.toHexString());

    const created = await this.connection.transaction(async (session) => {
      const [record] = await this.exports.create(
        [
          {
            weddingId: wedding._id,
            requestedBy: userId,
            scope,
            ...(album ? { albumId: album } : {}),
            state: 'queued',
          },
        ],
        { session },
      );
      if (!record) throw new Error('The export was not started');
      await this.outbox.add(session, {
        eventType: EXPORT_REQUESTED,
        aggregateId: record._id,
        payloadRef: { weddingId: wedding._id.toHexString() },
      });
      return record.toObject();
    });
    return this.toDto(created);
  }

  async get(user: AuthenticatedUser, weddingId: string, exportId: string): Promise<MediaExportDto> {
    const { wedding } = await this.access.require(user, weddingId);
    const id = parseObjectId(exportId);
    const found = id
      ? await this.exports.findOne({ _id: id, weddingId: wedding._id }).lean()
      : null;
    if (!found) throw exportNotFound();
    return this.toDto(found);
  }

  async list(user: AuthenticatedUser, weddingId: string): Promise<MediaExportListDto> {
    const { wedding } = await this.access.require(user, weddingId);
    const found = await this.exports
      .find({ weddingId: wedding._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    return { exports: found.map((item) => this.toDto(item)) };
  }

  /** A ready ZIP, to stream, with its file name. */
  async download(
    user: AuthenticatedUser,
    weddingId: string,
    exportId: string,
  ): Promise<{ file: StoredObject; name: string }> {
    const { wedding } = await this.access.require(user, weddingId);
    const id = parseObjectId(exportId);
    const found = id
      ? await this.exports.findOne({ _id: id, weddingId: wedding._id, state: 'ready' }).lean()
      : null;
    const file = found?.exportKey ? await this.storage.read(found.exportKey) : null;
    if (!found || !file) throw exportNotFound();
    return { file, name: `wedding-photos-${found.createdAt.toISOString().slice(0, 10)}.zip` };
  }

  /** One photo's original, as uploaded, to stream. */
  async original(
    user: AuthenticatedUser,
    weddingId: string,
    photoId: string,
  ): Promise<{ file: StoredObject; name: string }> {
    const { wedding } = await this.access.require(user, weddingId);
    const id = parseObjectId(photoId);
    const photo = id
      ? await this.photos
          .findOne({
            _id: id,
            weddingId: wedding._id,
            moderation: { $in: ['pending', 'approved', 'hidden'] },
          })
          .lean()
      : null;
    const file = photo ? await this.storage.read(photo.originalKey) : null;
    if (!photo || !file) throw photoNotFound();
    return { file, name: safeName(photo.originalName, 'photo') };
  }

  /** Builds a ZIP (worker). Safe to run twice: a finished export is skipped. */
  async handle(event: OutboxEventView): Promise<void> {
    const job = await this.exports
      .findOneAndUpdate(
        { _id: new Types.ObjectId(event.aggregateId), state: { $in: ACTIVE } },
        { $set: { state: 'processing' } },
        { returnDocument: 'after' },
      )
      .lean();
    if (!job) return;
    try {
      await this.build(job);
    } catch (error) {
      this.logger.warn('Export failed', {
        exportId: job._id.toHexString(),
        error: error instanceof Error ? error.message : String(error),
      });
      await this.exports.updateOne(
        { _id: job._id, state: 'processing' },
        { $set: { state: 'failed', failure: 'EXPORT_FAILED', finishedAt: new Date() } },
      );
    }
  }

  /** Removes ZIPs past their time (worker sweep); returns how many. */
  async expireOld(now = new Date()): Promise<number> {
    const old = await this.exports
      .find({ state: 'ready', expiresAt: { $lte: now } })
      .limit(100)
      .lean();
    for (const item of old) {
      if (item.exportKey) await this.storage.delete(item.exportKey);
      await this.exports.updateOne(
        { _id: item._id, state: 'ready' },
        { $set: { state: 'expired' } },
      );
    }
    return old.length;
  }

  private async build(job: StoredExport): Promise<void> {
    const albums = await this.albums.openTo(job.weddingId);
    const all = await this.albums.allOf(job.weddingId);
    const titles = new Map(all.map((album) => [album._id.toHexString(), album.title]));
    const order = new Map(albums.map((album, index) => [album._id.toHexString(), index]));
    const photos = await this.photos
      .find({
        weddingId: job.weddingId,
        ...(job.albumId ? { albumId: job.albumId } : {}),
        moderation: {
          $in: job.scope === 'approved' ? ['approved'] : ['pending', 'approved', 'hidden'],
        },
      })
      .sort({ createdAt: 1 })
      .lean();
    photos.sort(
      (a, b) =>
        (order.get(a.albumId.toHexString()) ?? 999) - (order.get(b.albumId.toHexString()) ?? 999),
    );

    const zip = archiver('zip', { store: true });
    const body = new PassThrough();
    zip.pipe(body);
    const key = objectKey('exports', job.weddingId.toHexString(), `${job._id.toHexString()}.zip`);
    const written = this.storage.putStream(key, body, 'application/zip');
    // Awaited below; until then, a failed write must not go unhandled.
    written.catch(() => undefined);
    for (const [index, photo] of photos.entries()) {
      const file = await this.storage.read(photo.originalKey);
      if (!file) continue;
      const folder = safeName(titles.get(photo.albumId.toHexString()) ?? 'Album', 'Album');
      // Numbered, so two photos with the same name never collide.
      const name = `${folder}/${String(index + 1).padStart(4, '0')}-${safeName(photo.originalName, 'photo')}`;
      zip.append(file.body, { name, date: photo.createdAt });
      // One file at a time, so a large export never holds many open at once.
      await new Promise<void>((resolve, reject) => {
        file.body.once('end', () => resolve());
        file.body.once('error', reject);
      });
    }
    await zip.finalize();
    const bytes = await written;
    await this.exports.updateOne(
      { _id: job._id, state: 'processing' },
      {
        $set: {
          state: 'ready',
          exportKey: key,
          bytes,
          photoCount: photos.length,
          finishedAt: new Date(),
          expiresAt: new Date(Date.now() + EXPORT_KEEP_DAYS * 86_400_000),
        },
      },
    );
  }

  private toDto(item: StoredExport): MediaExportDto {
    return {
      id: item._id.toHexString(),
      scope: item.scope,
      ...(item.albumId ? { albumId: item.albumId.toHexString() } : {}),
      state: item.state,
      ...(item.photoCount !== undefined ? { photoCount: item.photoCount } : {}),
      ...(item.bytes !== undefined ? { bytes: item.bytes } : {}),
      ...(item.state === 'ready'
        ? {
            downloadUrl: `/api/v1/weddings/${item.weddingId.toHexString()}/media-exports/${item._id.toHexString()}/download`,
          }
        : {}),
      ...(item.expiresAt ? { expiresAt: item.expiresAt } : {}),
      createdAt: item.createdAt,
    };
  }
}
