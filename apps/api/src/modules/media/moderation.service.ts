import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Types, type ClientSession, type Connection, type Model } from 'mongoose';
import { parseObjectId } from '../../platform/mongo.js';
import { ObjectStorage } from '../../platform/storage/object-storage.js';
import { Traced } from '../../platform/tracing.js';
import { AccountsService } from '../auth/accounts.service.js';
import type { AuthenticatedUser } from '../auth/sessions.service.js';
import { WeddingAccessService, type WeddingAccess } from '../weddings/wedding-access.service.js';
import { ownersOnly, weddingArchived } from '../weddings/wedding-errors.js';
import type {
  BulkModerationResultDto,
  ModerationAction,
  PhotoDto,
  ReviewQueueDto,
} from './dto/photo.dto.js';
import { photoNotFound } from './media-errors.js';
import { PHOTO_LIST_LIMIT } from './media-policy.js';
import { Photo, type ModerationState } from './schemas/photo.schema.js';
import { KEPT, photoDto, type StoredPhoto } from './photos.service.js';
import { UploadsService } from './uploads.service.js';

/** The changes a review can make, from which states. */
const MOVES = {
  approve: { from: ['pending', 'hidden'], to: 'approved' },
  reject: { from: ['pending'], to: 'rejected' },
  hide: { from: ['approved'], to: 'hidden' },
  restore: { from: ['hidden'], to: 'approved' },
  remove: { from: KEPT, to: 'deleted' },
} as const satisfies Record<string, { from: readonly ModerationState[]; to: ModerationState }>;
type Move = keyof typeof MOVES;

/** What an archived wedding still allows its owners: taking photos down (PRD WED-06). */
const SAFETY: readonly Move[] = ['hide', 'remove'];

/**
 * Reviewing photos (PRD PHOTO-04): approve or reject what was uploaded,
 * hide an approved photo from the website or restore it, delete for good.
 * Only approved photos are ever public. Rejecting and deleting remove the
 * files and free their space (decision 0019); the record stays, so the
 * review is on record.
 *
 * An archived wedding is read-only, except that its owners can still hide
 * and delete photos, as safety actions.
 */
@Traced()
@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Photo.name) private readonly photos: Model<Photo>,
    private readonly access: WeddingAccessService,
    private readonly storage: ObjectStorage,
    private readonly accounts: AccountsService,
    private readonly uploads: UploadsService,
  ) {}

  /** Photos waiting for review across every album, oldest first. */
  async queue(user: AuthenticatedUser, weddingId: string): Promise<ReviewQueueDto> {
    const { wedding } = await this.access.require(user, weddingId);
    const filter = { weddingId: wedding._id, moderation: 'pending' as const };
    const [found, total, processing] = await Promise.all([
      this.photos.find(filter).sort({ createdAt: 1, _id: 1 }).limit(PHOTO_LIST_LIMIT).lean(),
      this.photos.countDocuments(filter),
      this.uploads.processing(wedding._id),
    ]);
    const names = await this.accounts.displayNames(
      found.flatMap((photo) => (photo.uploadedBy ? [photo.uploadedBy] : [])),
    );
    return { photos: found.map((photo) => photoDto(photo, names)), total, processing };
  }

  /** How many photos wait for review and how many are approved, for the overview. Access is the caller's. */
  async counts(weddingId: Types.ObjectId): Promise<{ awaitingReview: number; approved: number }> {
    const [awaitingReview, approved] = await Promise.all([
      this.photos.countDocuments({ weddingId, moderation: 'pending' }),
      this.photos.countDocuments({ weddingId, moderation: 'approved' }),
    ]);
    return { awaitingReview, approved };
  }

  async change(
    user: AuthenticatedUser,
    weddingId: string,
    photoId: string,
    move: Move,
  ): Promise<PhotoDto> {
    const access = await this.allowed(user, weddingId, move);
    const id = parseObjectId(photoId);
    if (!id) throw photoNotFound();
    const [changed] = await this.apply(access, [id], move);
    if (!changed) {
      const photo = await this.photos
        .findOne({ _id: id, weddingId: access.wedding._id, moderation: { $in: KEPT } })
        .lean();
      // Already in that state: the same answer as changing it.
      if (photo?.moderation === MOVES[move].to) return photoDto(photo, new Map());
      throw photoNotFound();
    }
    return photoDto(changed, await this.namesOf([changed]));
  }

  /** Approves or rejects several photos; those already reviewed are left as they are. */
  async bulk(
    user: AuthenticatedUser,
    weddingId: string,
    photoIds: readonly string[],
    action: ModerationAction,
  ): Promise<BulkModerationResultDto> {
    const access = await this.allowed(user, weddingId, action);
    const ids = [...new Set(photoIds)].flatMap((id) => {
      const parsed = parseObjectId(id);
      return parsed ? [parsed] : [];
    });
    return { changed: (await this.apply(access, ids, action)).length };
  }

  /** The member may make this change to this wedding now. */
  private async allowed(
    user: AuthenticatedUser,
    weddingId: string,
    move: Move,
  ): Promise<WeddingAccess> {
    const access = await this.access.require(user, weddingId);
    if (access.wedding.status !== 'active') {
      if (!SAFETY.includes(move)) throw weddingArchived();
      if (access.role !== 'owner') throw ownersOnly();
    }
    return access;
  }

  /**
   * Moves the photos still in a state the change applies to, in one
   * transaction with the write fence (none for an archived wedding's safety
   * actions), then removes the files of rejected and deleted ones.
   */
  private async apply(
    { wedding, userId }: WeddingAccess,
    ids: readonly Types.ObjectId[],
    move: Move,
  ): Promise<StoredPhoto[]> {
    if (ids.length === 0) return [];
    const { from, to } = MOVES[move];
    const dropsFiles = to === 'rejected' || to === 'deleted';
    const changed = await this.connection.transaction(async (session: ClientSession) => {
      if (wedding.status === 'active') await this.access.raiseWriteFence(wedding._id, session);
      const targets = await this.photos
        .find({ _id: { $in: ids }, weddingId: wedding._id, moderation: { $in: from } })
        .session(session)
        .lean();
      if (targets.length === 0) return [];
      const now = new Date();
      await this.photos.updateMany(
        { _id: { $in: targets.map((photo) => photo._id) }, moderation: { $in: from } },
        {
          $set: {
            moderation: to,
            ...(to === 'approved' ? { approvedBy: userId, approvedAt: now } : {}),
          },
        },
        { session },
      );
      if (dropsFiles) {
        const bytes = targets.reduce(
          (sum, photo) =>
            sum + photo.byteCounts.original + photo.byteCounts.display + photo.byteCounts.thumb,
          0,
        );
        await this.access.freeStorage(wedding._id, bytes, session);
      }
      return targets.map((photo) => ({
        ...photo,
        moderation: to,
        ...(to === 'approved' ? { approvedBy: userId, approvedAt: now } : {}),
      }));
    });
    if (dropsFiles) await this.removeFiles(changed);
    return changed;
  }

  /** Best effort: a file left behind is only space, never shown again. */
  private async removeFiles(photos: readonly StoredPhoto[]): Promise<void> {
    for (const photo of photos) {
      for (const key of [
        photo.originalKey,
        photo.derivativeKeys.display,
        photo.derivativeKeys.thumb,
      ]) {
        await this.storage.delete(key).catch((error: unknown) =>
          this.logger.warn('Photo file not removed', {
            photoId: photo._id.toHexString(),
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      }
    }
  }

  private namesOf(photos: readonly StoredPhoto[]): Promise<Map<string, string>> {
    return this.accounts.displayNames(
      photos.flatMap((photo) => (photo.uploadedBy ? [photo.uploadedBy] : [])),
    );
  }
}
