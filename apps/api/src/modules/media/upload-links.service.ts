import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Types, type ClientSession, type Connection, type Model } from 'mongoose';
import { parseObjectId } from '../../platform/mongo.js';
import { RateLimiter } from '../../platform/rate-limit.js';
import { Traced } from '../../platform/tracing.js';
import type { AuthenticatedUser } from '../auth/sessions.service.js';
import { GUEST_RATE_LIMITS } from '../guests/guest-policy.js';
import { GuestsService } from '../guests/guests.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { WeddingAccessService } from '../weddings/wedding-access.service.js';
import { weddingArchived } from '../weddings/wedding-errors.js';
import { AlbumsService } from './albums.service.js';
import type {
  EmailUploadLinkResultDto,
  PhotoInviteAudience,
  PhotoInviteAudienceDto,
  UploadLinkDto,
  UploadLinksDto,
} from './dto/upload-link.dto.js';
import { albumNotFound, uploadLinkNotFound } from './media-errors.js';
import { UploadLinks } from './upload-links.js';
import { UploadCapability } from './schemas/upload-capability.schema.js';
import { UploadLinkEmail } from './schemas/upload-link-email.schema.js';

type StoredCapability = UploadCapability & { _id: Types.ObjectId };

/**
 * The couple's guest upload links (PRD PHOTO-02, PHOTO-08; decision 0019):
 * one per album and one general link per wedding, each shown with its QR
 * code, and each revocable or replaceable. The general link can also be
 * emailed to guests. Owners and managers only; every query is scoped to
 * the wedding the access check returned.
 */
@Traced()
@Injectable()
export class UploadLinksService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(UploadCapability.name) private readonly capabilities: Model<UploadCapability>,
    @InjectModel(UploadLinkEmail.name) private readonly emails: Model<UploadLinkEmail>,
    private readonly access: WeddingAccessService,
    private readonly albums: AlbumsService,
    private readonly links: UploadLinks,
    private readonly guests: GuestsService,
    private readonly notifications: NotificationsService,
    private readonly limiter: RateLimiter,
  ) {}

  /** The wedding's active links: the general one and each album's. */
  async list(user: AuthenticatedUser, weddingId: string): Promise<UploadLinksDto> {
    const { wedding } = await this.access.require(user, weddingId);
    const active = await this.capabilities
      .find({ weddingId: wedding._id, status: 'active' })
      .sort({ createdAt: -1 })
      .lean();
    const general = active.find((link) => link.scope === 'wedding');
    const seen = new Set<string>();
    const albums = active.filter((link) => {
      if (link.scope !== 'album' || !link.albumId) return false;
      const key = link.albumId.toHexString();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return {
      ...(general ? { general: this.toDto(general) } : {}),
      albums: albums.map((link) => this.toDto(link)),
    };
  }

  /**
   * An album's link: the current one, or a new one when there is none or
   * `replace` asks to rotate it (the old link stops working at once).
   */
  async forAlbum(
    user: AuthenticatedUser,
    weddingId: string,
    albumId: string,
    replace = false,
  ): Promise<UploadLinkDto> {
    const { wedding, userId } = await this.access.require(user, weddingId);
    if (wedding.status !== 'active') throw weddingArchived();
    const id = parseObjectId(albumId);
    const album = id ? await this.albums.listed(wedding._id, id) : null;
    if (!album) throw albumNotFound();
    return this.issue(wedding._id, userId, { scope: 'album', albumId: album._id }, replace);
  }

  /** The general link, where guests choose the album; made or rotated as `forAlbum`. */
  async general(
    user: AuthenticatedUser,
    weddingId: string,
    replace = false,
  ): Promise<UploadLinkDto> {
    const { wedding, userId } = await this.access.require(user, weddingId);
    if (wedding.status !== 'active') throw weddingArchived();
    return this.issue(wedding._id, userId, { scope: 'wedding' }, replace);
  }

  /**
   * Turns a link off for good: guests with it, or a session from it, can
   * upload no more. Photos already uploaded stay. Allowed for an archived
   * wedding too: stopping uploads is a safety action.
   */
  async revoke(user: AuthenticatedUser, weddingId: string, linkId: string): Promise<void> {
    const { wedding, userId } = await this.access.require(user, weddingId);
    const id = parseObjectId(linkId);
    const revoked = id
      ? await this.capabilities.updateOne(
          { _id: id, weddingId: wedding._id, status: 'active' },
          { $set: { status: 'revoked', revokedAt: new Date(), revokedBy: userId } },
        )
      : null;
    if (!revoked || revoked.matchedCount === 0) throw uploadLinkNotFound();
  }

  /** How many guests each audience would email, for the choice in the share dialog. */
  async audiences(user: AuthenticatedUser, weddingId: string): Promise<PhotoInviteAudienceDto> {
    const { wedding } = await this.access.require(user, weddingId);
    const [all, attending] = await Promise.all([
      this.guests.photoRecipients(wedding._id, 'all'),
      this.guests.photoRecipients(wedding._id, 'attending'),
    ]);
    return { all: all.length, attending: attending.length };
  }

  /**
   * Emails the general link to guests: all with an address, or those
   * attending a ceremony. The link is made if there is none. Each email is
   * written by the worker when sent, with the link as it is then; one whose
   * link was revoked meanwhile is not sent. Counted against the wedding's
   * daily guest email allowance.
   */
  async email(
    user: AuthenticatedUser,
    weddingId: string,
    audience: PhotoInviteAudience,
  ): Promise<EmailUploadLinkResultDto> {
    const { wedding, userId } = await this.access.require(user, weddingId);
    if (wedding.status !== 'active') throw weddingArchived();
    const recipients = await this.guests.photoRecipients(wedding._id, audience);
    if (recipients.length === 0) return { queued: 0 };

    const link = await this.issue(wedding._id, userId, { scope: 'wedding' }, false);
    const capabilityId = new Types.ObjectId(link.id);
    await this.limiter.spend(
      [
        {
          rule: GUEST_RATE_LIMITS.inviteEmailsPerWedding,
          subject: wedding._id.toHexString(),
          amount: recipients.length,
        },
      ],
      () =>
        this.connection.transaction(async (session) => {
          await this.access.raiseWriteFence(wedding._id, session);
          const ids = recipients.map(() => new Types.ObjectId());
          await this.notifications.requestEmails(
            session,
            recipients.map((recipient, index) => ({
              id: ids[index] ?? new Types.ObjectId(),
              kind: 'photo_upload_invite' as const,
              weddingId: wedding._id,
              recipientEmailNormalized: recipient.emailNormalized,
            })),
          );
          await this.emails.insertMany(
            recipients.map((recipient, index) => ({
              weddingId: wedding._id,
              capabilityId,
              guestId: recipient.guestId,
              guestName: recipient.name,
              emailNormalized: recipient.emailNormalized,
              notificationId: ids[index],
              requestedBy: userId,
            })),
            { session },
          );
        }),
    );
    return { queued: recipients.length };
  }

  /** The current link of that kind, or a new one (replacing it when asked). */
  private async issue(
    weddingId: Types.ObjectId,
    userId: Types.ObjectId,
    target: { scope: 'album'; albumId: Types.ObjectId } | { scope: 'wedding' },
    replace: boolean,
  ): Promise<UploadLinkDto> {
    const filter = {
      weddingId,
      status: 'active' as const,
      ...(target.scope === 'album'
        ? { scope: 'album' as const, albumId: target.albumId }
        : { scope: 'wedding' as const }),
    };
    const made = await this.connection.transaction(async (session) => {
      // Fenced: two requests at once conflict on it, so only one makes a link.
      await this.access.raiseWriteFence(weddingId, session);
      const current = await this.capabilities.findOne(filter).session(session).lean();
      if (current && !replace) return current;
      if (current) await this.retire(current, userId, session);
      const id = new Types.ObjectId();
      const [link] = await this.capabilities.create(
        [
          {
            _id: id,
            ...filter,
            tokenHash: this.links.hash(this.links.token(id)),
            createdBy: userId,
            ...(current ? { rotatedFromId: current._id } : {}),
          },
        ],
        { session },
      );
      return link?.toObject() ?? null;
    });
    if (!made) throw new Error('The upload link was not made');
    return this.toDto(made);
  }

  private async retire(
    link: StoredCapability,
    userId: Types.ObjectId,
    session: ClientSession,
  ): Promise<void> {
    await this.capabilities.updateOne(
      { _id: link._id, status: 'active' },
      { $set: { status: 'revoked', revokedAt: new Date(), revokedBy: userId } },
      { session },
    );
  }

  private toDto(link: StoredCapability): UploadLinkDto {
    return {
      id: link._id.toHexString(),
      scope: link.scope,
      ...(link.albumId ? { albumId: link.albumId.toHexString() } : {}),
      url: this.links.url(link._id),
      createdAt: link.createdAt,
    };
  }
}
