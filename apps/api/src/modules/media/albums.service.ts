import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { mongo, Types, type ClientSession, type Connection, type Model } from 'mongoose';
import { parseObjectId } from '../../platform/mongo.js';
import { Traced } from '../../platform/tracing.js';
import type { AuthenticatedUser } from '../auth/sessions.service.js';
import { EventsService, type EventBrief } from '../events/events.service.js';
import { WeddingAccessService } from '../weddings/wedding-access.service.js';
import { weddingArchived } from '../weddings/wedding-errors.js';
import type { CreateAlbumDto, UpdateAlbumDto } from './dto/album-input.dto.js';
import type { AlbumCountsDto, AlbumDto, AlbumListDto } from './dto/album.dto.js';
import { albumLimit, albumNotFound, eventAlbumTitle } from './media-errors.js';
import { ALBUM_LIMITS, GENERAL_ALBUM_TITLE } from './media-policy.js';
import { Album } from './schemas/album.schema.js';
import { Photo } from './schemas/photo.schema.js';

type StoredAlbum = Album & { _id: Types.ObjectId };

const DUPLICATE_KEY = 11000;

/** An album's photos and newest photo, for its card. */
interface AlbumStats {
  counts: AlbumCountsDto;
  coverPhotoId?: Types.ObjectId;
}

const NO_PHOTOS: AlbumStats = { counts: { pending: 0, approved: 0, total: 0 } };

/** The small copy of a photo, streamed by the API to the wedding's members. */
export function photoImageUrl(
  weddingId: Types.ObjectId,
  photoId: Types.ObjectId,
  size: 'thumb' | 'display',
): string {
  return `/api/v1/weddings/${weddingId.toHexString()}/photos/${photoId.toHexString()}/image/${size}`;
}

/**
 * A wedding's photo albums (PRD PHOTO-01), for its owners and managers.
 *
 * Every ceremony has an album and every wedding a general one. They are
 * made when the albums are first needed rather than when a ceremony is
 * added, so the events module knows nothing of photos and weddings that
 * existed before albums need no backfill (decision 0019). Unique indexes
 * keep it to one each however many requests make them at once.
 *
 * Every query is scoped to the wedding the access check returned.
 */
@Traced()
@Injectable()
export class AlbumsService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Album.name) private readonly albums: Model<Album>,
    @InjectModel(Photo.name) private readonly photos: Model<Photo>,
    private readonly access: WeddingAccessService,
    private readonly events: EventsService,
  ) {}

  /** The wedding's albums. Archived weddings stay readable but get no new albums. */
  async list(user: AuthenticatedUser, weddingId: string): Promise<AlbumListDto> {
    const { wedding } = await this.access.require(user, weddingId);
    const events = await this.events.briefs(wedding._id);
    let albums = await this.albums.find({ weddingId: wedding._id }).lean();
    if (wedding.status === 'active' && (await this.ensureAutomatic(wedding._id, events, albums))) {
      albums = await this.albums.find({ weddingId: wedding._id }).lean();
    }
    const stats = await this.stats(wedding._id);
    return { albums: this.ordered(albums, events, stats) };
  }

  /**
   * The wedding's listed albums in the Albums page's order, for a guest's
   * upload page: event albums of ceremonies still on, the general album
   * and the couple's own. Read only; makes no albums.
   */
  async openTo(weddingId: Types.ObjectId): Promise<StoredAlbum[]> {
    const events = (await this.events.briefs(weddingId)).filter((event) => !event.cancelled);
    const order = new Map(events.map((event, index) => [event.id, index]));
    const albums = await this.albums.find({ weddingId }).lean();
    const rank = (album: StoredAlbum) =>
      album.kind === 'event'
        ? (order.get(album.eventId?.toHexString() ?? '') ?? -1)
        : album.kind === 'general'
          ? events.length
          : events.length + 1 + album.sortOrder;
    return albums
      .filter((album) => album.kind !== 'event' || rank(album) >= 0)
      .sort((a, b) => rank(a) - rank(b) || a.createdAt.getTime() - b.createdAt.getTime());
  }

  /** Every album of the wedding, listed or not, for names in exports. */
  async allOf(weddingId: Types.ObjectId): Promise<StoredAlbum[]> {
    const [albums, events] = await Promise.all([
      this.albums.find({ weddingId }).lean(),
      this.events.titles(weddingId),
    ]);
    return albums.map((album) => ({
      ...album,
      title: (album.eventId ? events.get(album.eventId.toHexString()) : undefined) ?? album.title,
    }));
  }

  /** The wedding an album belongs to, for routes that name only the album. */
  async weddingOf(albumId: Types.ObjectId): Promise<Types.ObjectId | null> {
    const album = await this.albums.findById(albumId, { weddingId: 1 }).lean();
    return album?.weddingId ?? null;
  }

  /**
   * One of the wedding's listed albums (not a deleted ceremony's), read in
   * the caller's transaction when one is given; null otherwise.
   */
  async listed(
    weddingId: Types.ObjectId,
    albumId: Types.ObjectId,
    session?: ClientSession,
  ): Promise<StoredAlbum | null> {
    const album = await this.albums
      .findOne({ _id: albumId, weddingId })
      .session(session ?? null)
      .lean();
    if (!album) return null;
    if (album.kind === 'event' && album.eventId) {
      return (await this.events.exists(weddingId, album.eventId, session)) ? album : null;
    }
    return album;
  }

  /** Adds an album of the couple's own to an active wedding. */
  async create(
    user: AuthenticatedUser,
    weddingId: string,
    input: CreateAlbumDto,
  ): Promise<AlbumDto> {
    const { wedding, userId } = await this.access.require(user, weddingId);
    if (wedding.status !== 'active') throw weddingArchived();

    const created = await this.connection.transaction(async (session) => {
      // The fence first: two creations at once conflict on it, so the
      // count below never misses the other one.
      await this.access.raiseWriteFence(wedding._id, session);
      const custom = await this.albums
        .countDocuments({ weddingId: wedding._id, kind: 'custom' })
        .session(session);
      if (custom >= ALBUM_LIMITS.customAlbums) throw albumLimit();
      const [album] = await this.albums.create(
        [
          {
            weddingId: wedding._id,
            title: input.title,
            kind: 'custom',
            isUploadEnabled: true,
            sortOrder: custom,
            createdBy: userId,
          },
        ],
        { session },
      );
      return album;
    });
    if (!created) throw new Error('The album was not created');
    return this.toDto(created.toObject(), new Map());
  }

  /**
   * Renames an album or pauses its upload links. An event album keeps its
   * ceremony's name; an album whose ceremony was deleted cannot be changed.
   */
  async update(
    user: AuthenticatedUser,
    weddingId: string,
    albumId: string,
    input: UpdateAlbumDto,
  ): Promise<AlbumDto> {
    const { wedding } = await this.access.require(user, weddingId);
    if (wedding.status !== 'active') throw weddingArchived();
    const id = parseObjectId(albumId);
    if (!id) throw albumNotFound();
    const events = new Map((await this.events.briefs(wedding._id)).map((e) => [e.id, e]));

    const updated = await this.connection.transaction(async (session) => {
      const album = await this.albums
        .findOne({ _id: id, weddingId: wedding._id })
        .session(session)
        .lean();
      if (!album || !this.isListed(album, events)) throw albumNotFound();
      if (input.title !== undefined && album.kind === 'event') throw eventAlbumTitle();
      await this.access.raiseWriteFence(wedding._id, session);
      return this.albums
        .findOneAndUpdate(
          { _id: id, weddingId: wedding._id },
          {
            $set: {
              ...(input.title !== undefined ? { title: input.title } : {}),
              ...(input.isUploadEnabled !== undefined
                ? { isUploadEnabled: input.isUploadEnabled }
                : {}),
            },
          },
          { returnDocument: 'after', session },
        )
        .lean();
    });
    if (!updated) throw albumNotFound();
    return this.toDto(
      updated,
      events,
      (await this.stats(wedding._id)).get(updated._id.toHexString()),
    );
  }

  /**
   * Makes the albums the wedding should have and does not; false when it
   * has them all. Each is an upsert, so a request that loses the race to
   * another simply finds the album there. Not fenced: an album for an
   * existing ceremony changes nothing a guest or the archive depends on.
   */
  private async ensureAutomatic(
    weddingId: Types.ObjectId,
    events: readonly EventBrief[],
    albums: readonly StoredAlbum[],
  ): Promise<boolean> {
    const have = new Set(
      albums.flatMap((album) => (album.eventId ? [album.eventId.toHexString()] : [])),
    );
    const missing = events.filter((event) => !have.has(event.id));
    const upserts = [
      ...missing.map((event) => ({
        updateOne: {
          filter: { weddingId, kind: 'event' as const, eventId: new Types.ObjectId(event.id) },
          update: { $setOnInsert: { title: event.title, isUploadEnabled: true, sortOrder: 0 } },
          upsert: true,
        },
      })),
      ...(albums.some((album) => album.kind === 'general')
        ? []
        : [
            {
              updateOne: {
                filter: { weddingId, kind: 'general' as const },
                update: {
                  $setOnInsert: { title: GENERAL_ALBUM_TITLE, isUploadEnabled: true, sortOrder: 0 },
                },
                upsert: true,
              },
            },
          ]),
    ];
    if (upserts.length === 0) return false;
    try {
      await this.albums.bulkWrite(upserts, { ordered: false });
    } catch (error) {
      // Another request made the same album first; it is there either way.
      if (!(error instanceof mongo.MongoBulkWriteError) || !this.onlyDuplicates(error)) throw error;
    }
    return true;
  }

  private onlyDuplicates(error: InstanceType<typeof mongo.MongoBulkWriteError>): boolean {
    const errors: readonly mongo.WriteError[] = Array.isArray(error.writeErrors)
      ? error.writeErrors
      : [error.writeErrors];
    return errors.length > 0 && errors.every((write) => write.code === DUPLICATE_KEY);
  }

  /**
   * An album whose ceremony was deleted is kept, with whatever photos it
   * holds, but is not listed.
   */
  private isListed(album: StoredAlbum, events: ReadonlyMap<string, EventBrief>): boolean {
    return (
      album.kind !== 'event' || (album.eventId ? events.has(album.eventId.toHexString()) : false)
    );
  }

  /** Event albums in the Events page's order, then the general album, then the couple's own. */
  private ordered(
    albums: readonly StoredAlbum[],
    events: readonly EventBrief[],
    stats: ReadonlyMap<string, AlbumStats>,
  ): AlbumDto[] {
    const byEvent = new Map(events.map((event) => [event.id, event]));
    const eventOrder = new Map(events.map((event, index) => [event.id, index]));
    const rank = (album: StoredAlbum) =>
      album.kind === 'event'
        ? (eventOrder.get(album.eventId?.toHexString() ?? '') ?? 0)
        : album.kind === 'general'
          ? events.length
          : events.length + 1 + album.sortOrder;
    return albums
      .filter((album) => this.isListed(album, byEvent))
      .sort((a, b) => rank(a) - rank(b) || a.createdAt.getTime() - b.createdAt.getTime())
      .map((album) => this.toDto(album, byEvent, stats.get(album._id.toHexString())));
  }

  /**
   * Each album's photos by review state, and its newest photo that is not
   * rejected or deleted, in one pass over the wedding's photos.
   */
  private async stats(weddingId: Types.ObjectId): Promise<Map<string, AlbumStats>> {
    const rows = await this.photos.aggregate<{
      _id: Types.ObjectId;
      pending: number;
      approved: number;
      total: number;
      latest: Types.ObjectId;
    }>([
      { $match: { weddingId, moderation: { $in: ['pending', 'approved', 'hidden'] } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$albumId',
          pending: { $sum: { $cond: [{ $eq: ['$moderation', 'pending'] }, 1, 0] } },
          approved: { $sum: { $cond: [{ $eq: ['$moderation', 'approved'] }, 1, 0] } },
          total: { $sum: 1 },
          latest: { $first: '$_id' },
        },
      },
    ]);
    return new Map(
      rows.map((row) => [
        row._id.toHexString(),
        {
          counts: { pending: row.pending, approved: row.approved, total: row.total },
          coverPhotoId: row.latest,
        },
      ]),
    );
  }

  private toDto(
    album: StoredAlbum,
    events: ReadonlyMap<string, EventBrief>,
    stats: AlbumStats = NO_PHOTOS,
  ): AlbumDto {
    const event = album.eventId ? events.get(album.eventId.toHexString()) : undefined;
    return {
      id: album._id.toHexString(),
      kind: album.kind,
      title: event?.title ?? album.title,
      ...(event
        ? {
            event: {
              id: event.id,
              title: event.title,
              ...(event.startDate ? { startDate: event.startDate } : {}),
              ...(event.startTime ? { startTime: event.startTime } : {}),
              ...(event.venueName ? { venueName: event.venueName } : {}),
              cancelled: event.cancelled,
              completed: event.completed,
            },
          }
        : {}),
      isUploadEnabled: album.isUploadEnabled,
      counts: stats.counts,
      ...(stats.coverPhotoId
        ? { coverUrl: photoImageUrl(album.weddingId, stats.coverPhotoId, 'thumb') }
        : {}),
      createdAt: album.createdAt,
      updatedAt: album.updatedAt,
    };
  }
}
