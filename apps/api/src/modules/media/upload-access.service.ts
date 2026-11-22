import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, type Model } from 'mongoose';
import { parseObjectId } from '../../platform/mongo.js';
import { RateLimiter } from '../../platform/rate-limit.js';
import { Traced } from '../../platform/tracing.js';
import { EventsService } from '../events/events.service.js';
import { WebsiteService } from '../website/website.service.js';
import { WeddingAccessService } from '../weddings/wedding-access.service.js';
import { AlbumsService } from './albums.service.js';
import type { GuestAlbumDto, GuestUploadDto, UploadClosedReason } from './dto/upload-access.dto.js';
import type { CreateUploadDto, UploadDto } from './dto/upload.dto.js';
import {
  albumClosed,
  uploadLinkUnavailable,
  uploadNotFound,
  uploadSessionMissing,
} from './media-errors.js';
import { UPLOAD_LINK_LIMITS } from './media-policy.js';
import { UploadCapability } from './schemas/upload-capability.schema.js';
import { UploadIntent } from './schemas/upload-intent.schema.js';
import { UploadLinks, type UploadSession } from './upload-links.js';
import { UploadsService } from './uploads.service.js';

type StoredCapability = UploadCapability & { _id: Types.ObjectId };

/** A guest's upload session after its link, wedding and albums were checked again. */
interface GuestUploader {
  link: StoredCapability;
  session: UploadSession;
}

/**
 * Guests uploading through a link (PRD PHOTO-02, PHOTO-03, GUEST-07): no
 * account, no RSVP session. The link is exchanged for a short session
 * cookie that names only the link; every request checks the link is still
 * active, the wedding still active and the album still open, so revoking
 * or pausing works at once. A guest sees only whose wedding it is and the
 * albums open to them: never other guests' photos or names.
 */
@Traced()
@Injectable()
export class UploadAccessService {
  constructor(
    @InjectModel(UploadCapability.name) private readonly capabilities: Model<UploadCapability>,
    @InjectModel(UploadIntent.name) private readonly intents: Model<UploadIntent>,
    private readonly access: WeddingAccessService,
    private readonly albums: AlbumsService,
    private readonly events: EventsService,
    private readonly website: WebsiteService,
    private readonly uploads: UploadsService,
    private readonly links: UploadLinks,
    private readonly limiter: RateLimiter,
  ) {}

  /** Opens a link: a new session for it, and what the page shows. */
  async exchange(
    token: string,
    client: { ip: string },
  ): Promise<{ cookie: { value: string; expiresAt: Date }; view: GuestUploadDto }> {
    await this.limiter.consume(UPLOAD_LINK_LIMITS.exchangePerIp, client.ip);
    const link = await this.capabilities
      .findOne({ tokenHash: this.links.hash(token), status: 'active' })
      .lean();
    if (!link || this.expired(link)) throw uploadLinkUnavailable();
    return { cookie: this.links.newSession(link._id), view: await this.view(link) };
  }

  /** The page again, from the session cookie. */
  async current(cookie: string | undefined): Promise<GuestUploadDto> {
    const { link } = await this.uploader(cookie);
    return this.view(link);
  }

  /** A guest adds a photo to an album their link allows. */
  async initiate(cookie: string | undefined, input: CreateUploadDto): Promise<UploadDto> {
    const { link, session } = await this.uploader(cookie);
    const albumId = parseObjectId(input.albumId);
    if (!albumId) throw albumClosed();
    if (link.scope === 'album' && !link.albumId?.equals(albumId)) throw albumClosed();
    const album = await this.albums.listed(link.weddingId, albumId);
    if (!album?.isUploadEnabled) throw albumClosed();
    return this.limiter.spend(
      [
        { rule: UPLOAD_LINK_LIMITS.uploadsPerSession, subject: session.nonce },
        { rule: UPLOAD_LINK_LIMITS.uploadsPerLink, subject: link._id.toHexString() },
      ],
      () =>
        this.uploads.initiate(
          link.weddingId,
          albumId,
          { kind: 'link', capabilityId: link._id },
          input,
        ),
    );
  }

  /** A guest says a photo's upload finished; only uploads through the same link. */
  async complete(cookie: string | undefined, uploadId: string): Promise<UploadDto> {
    const { link } = await this.uploader(cookie);
    const id = parseObjectId(uploadId);
    const intent = id
      ? await this.intents.findOne({ _id: id, capabilityId: link._id }).lean()
      : null;
    if (!intent) throw uploadNotFound();
    return this.uploads.complete(intent);
  }

  /** The session's link, checked again: still active and not expired. */
  private async uploader(cookie: string | undefined): Promise<GuestUploader> {
    const session = this.links.readSession(cookie);
    if (!session) throw uploadSessionMissing();
    const link = await this.capabilities
      .findOne({ _id: session.capabilityId, status: 'active' })
      .lean();
    if (!link || this.expired(link)) throw uploadLinkUnavailable();
    return { link, session };
  }

  private expired(link: StoredCapability): boolean {
    return link.expiresAt !== undefined && link.expiresAt.getTime() <= Date.now();
  }

  /** Whose wedding, and where photos can go; why not, when nowhere. */
  private async view(link: StoredCapability): Promise<GuestUploadDto> {
    const couple = await this.access.coupleOf(link.weddingId);
    if (!couple) throw uploadLinkUnavailable();
    const [events, albums, site, storage] = await Promise.all([
      this.events.briefs(link.weddingId),
      this.albums.openTo(link.weddingId),
      this.website.publishedAddress(link.weddingId),
      this.access.storageLeft(link.weddingId),
    ]);
    const byEvent = new Map(events.map((event) => [event.id, event]));
    const describe = (album: (typeof albums)[number]): GuestAlbumDto => {
      const event = album.eventId ? byEvent.get(album.eventId.toHexString()) : undefined;
      return {
        id: album._id.toHexString(),
        title: event?.title ?? album.title,
        ...(event?.startDate ? { startDate: event.startDate } : {}),
        ...(event?.venueName ? { venueName: event.venueName } : {}),
      };
    };

    let own: GuestAlbumDto | undefined;
    let open = albums.filter((album) => album.isUploadEnabled);
    if (link.scope === 'album') {
      const album = link.albumId
        ? albums.find((candidate) => candidate._id.equals(link.albumId ?? ''))
        : undefined;
      // The album of a deleted ceremony: the link leads nowhere.
      if (!album) throw uploadLinkUnavailable();
      own = describe(album);
      open = album.isUploadEnabled ? [album] : [];
    }

    const closedReason: UploadClosedReason | undefined = !couple.active
      ? 'archived'
      : storage <= 0
        ? 'storage_full'
        : open.length === 0
          ? 'paused'
          : undefined;
    return {
      coupleName: couple.coupleName,
      scope: link.scope,
      ...(own ? { album: own } : {}),
      albums: closedReason ? [] : open.map(describe),
      open: !closedReason,
      ...(closedReason ? { closedReason } : {}),
      ...(site ? { websitePath: `/w/${encodeURIComponent(site)}` } : {}),
    };
  }
}
