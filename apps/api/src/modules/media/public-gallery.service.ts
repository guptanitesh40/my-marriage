import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, type Model } from 'mongoose';
import { parseObjectId } from '../../platform/mongo.js';
import { ObjectStorage, type StoredObject } from '../../platform/storage/object-storage.js';
import { Traced } from '../../platform/tracing.js';
import { EventsService } from '../events/events.service.js';
import { WebsiteService } from '../website/website.service.js';
import { WeddingAccessService } from '../weddings/wedding-access.service.js';
import { AlbumsService } from './albums.service.js';
import type {
  PublicGalleryDto,
  PublicPhotoDto,
  PublicPhotoListDto,
} from './dto/public-gallery.dto.js';
import { albumNotFound, photoNotFound } from './media-errors.js';
import { PHOTO_LIST_LIMIT, PHOTO_SIZES, type PhotoSize } from './media-policy.js';
import { Photo } from './schemas/photo.schema.js';

/** An approved photo's copy, for anyone; `v` changes with the photo, so it can be cached. */
function publicImageUrl(slug: string, photoId: Types.ObjectId, size: PhotoSize): string {
  return `/api/v1/public/weddings/${encodeURIComponent(slug)}/photos/${photoId.toHexString()}/${size}`;
}

/**
 * The gallery on the published website (PRD PHOTO-04, PHOTO-07, SITE-03):
 * approved photos only, of albums still listed, and nothing at all while
 * the website is not published or its gallery is turned off (the default,
 * decision 0024). Checked on every request, files included,
 * so hiding a photo or unpublishing takes effect at once (browsers may
 * keep a copy for five minutes). The same data serves all three designs.
 */
@Traced()
@Injectable()
export class PublicGalleryService {
  constructor(
    @InjectModel(Photo.name) private readonly photos: Model<Photo>,
    private readonly access: WeddingAccessService,
    private readonly website: WebsiteService,
    private readonly albums: AlbumsService,
    private readonly events: EventsService,
    private readonly storage: ObjectStorage,
  ) {}

  async albumsOf(slug: string): Promise<PublicGalleryDto> {
    const site = await this.published(slug);
    if (!site) return { albums: [] };
    const [albums, events, rows] = await Promise.all([
      this.albums.openTo(site.weddingId),
      this.events.briefs(site.weddingId),
      this.photos.aggregate<{ _id: Types.ObjectId; count: number; latest: Types.ObjectId }>([
        { $match: { weddingId: site.weddingId, moderation: 'approved' } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$albumId', count: { $sum: 1 }, latest: { $first: '$_id' } } },
      ]),
    ]);
    const byEvent = new Map(events.map((event) => [event.id, event]));
    const stats = new Map(rows.map((row) => [row._id.toHexString(), row]));
    return {
      albums: albums.flatMap((album) => {
        const row = stats.get(album._id.toHexString());
        if (!row) return [];
        const event = album.eventId ? byEvent.get(album.eventId.toHexString()) : undefined;
        return [
          {
            id: album._id.toHexString(),
            title: event?.title ?? album.title,
            ...(event?.startDate ? { startDate: event.startDate } : {}),
            photoCount: row.count,
            coverUrl: publicImageUrl(site.slug, row.latest, 'thumb'),
          },
        ];
      }),
    };
  }

  async photosOf(slug: string, albumId: string): Promise<PublicPhotoListDto> {
    const site = await this.published(slug);
    const id = parseObjectId(albumId);
    const album = site && id ? await this.albums.listed(site.weddingId, id) : null;
    if (!site || !album) throw albumNotFound();
    const found = await this.photos
      .find({ weddingId: site.weddingId, albumId: album._id, moderation: 'approved' })
      .sort({ createdAt: -1, _id: -1 })
      .limit(PHOTO_LIST_LIMIT)
      .lean();
    return {
      photos: found.map((photo): PublicPhotoDto => ({
        id: photo._id.toHexString(),
        width: photo.width,
        height: photo.height,
        thumbUrl: publicImageUrl(site.slug, photo._id, 'thumb'),
        displayUrl: publicImageUrl(site.slug, photo._id, 'display'),
      })),
    };
  }

  /** An approved photo's copy, while the website shows its gallery; not found otherwise. */
  async image(slug: string, photoId: string, size: string): Promise<StoredObject> {
    if (!Object.hasOwn(PHOTO_SIZES, size)) throw photoNotFound();
    const site = await this.published(slug);
    const id = parseObjectId(photoId);
    const photo =
      site && id
        ? await this.photos
            .findOne({ _id: id, weddingId: site.weddingId, moderation: 'approved' })
            .lean()
        : null;
    // A photo of a deleted ceremony's album is no longer shown.
    const listed = photo ? await this.albums.listed(photo.weddingId, photo.albumId) : null;
    const file =
      photo && listed ? await this.storage.read(photo.derivativeKeys[size as PhotoSize]) : null;
    if (!file) throw photoNotFound();
    return file;
  }

  /** The wedding at this address, while its website is published with the gallery on. */
  private async published(
    slug: string,
  ): Promise<{ weddingId: Types.ObjectId; slug: string } | null> {
    const found = await this.access.bySlug(slug);
    if (!found) return null;
    const current = await this.website.galleryAddress(found.wedding._id);
    return current ? { weddingId: found.wedding._id, slug: current } : null;
  }
}
