import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, type ClientSession, type Model } from 'mongoose';
import { parseObjectId } from '../../platform/mongo.js';
import type { AuthenticatedUser } from '../auth/sessions.service.js';
import { WeddingMembership, type MembershipRole } from './schemas/wedding-membership.schema.js';
import { WeddingSlug } from './schemas/wedding-slug.schema.js';
import { Wedding } from './schemas/wedding.schema.js';
import { SLUG_PATTERN } from './slug.js';
import { ownersOnly, weddingArchived, weddingNotFound } from './wedding-errors.js';
import { Traced } from '../../platform/tracing.js';

export interface WeddingAccess {
  wedding: Wedding & { _id: Types.ObjectId };
  role: MembershipRole;
  userId: Types.ObjectId;
}

/**
 * The one check behind every route under /weddings/{weddingId}: the user
 * must be an active member of that wedding (architecture: "all Mongo queries
 * must be wedding-scoped"). Anyone else gets 404, the same as for a wedding
 * that does not exist, so an ID reveals nothing. A member without the role
 * the action needs gets 403.
 */
@Traced()
@Injectable()
export class WeddingAccessService {
  constructor(
    @InjectModel(Wedding.name) private readonly weddings: Model<Wedding>,
    @InjectModel(WeddingMembership.name) private readonly memberships: Model<WeddingMembership>,
    @InjectModel(WeddingSlug.name) private readonly slugs: Model<WeddingSlug>,
  ) {}

  /**
   * The wedding at a web address, current or old, for the public website;
   * `moved` when the address was changed since (decision 0017). Nothing
   * about who may see it: the caller decides what is public.
   */
  async bySlug(
    slug: string,
  ): Promise<{ wedding: Wedding & { _id: Types.ObjectId }; moved: boolean } | null> {
    if (slug.length > 64 || !SLUG_PATTERN.test(slug)) return null;
    const known = await this.slugs.findOne({ slug }, { weddingId: 1 }).lean();
    if (!known) return null;
    const wedding = await this.weddings.findById(known.weddingId).lean();
    if (!wedding) return null;
    return { wedding, moved: wedding.slug !== slug };
  }

  /** Whether `slug` is free for this wedding: unused, or one of its own. */
  async slugAvailable(weddingId: Types.ObjectId, slug: string): Promise<boolean> {
    const known = await this.slugs.findOne({ slug }, { weddingId: 1 }).lean();
    return !known || known.weddingId.equals(weddingId);
  }

  async require(
    user: AuthenticatedUser,
    weddingId: string,
    roles: readonly MembershipRole[] = ['owner', 'manager'],
  ): Promise<WeddingAccess> {
    const id = parseObjectId(weddingId);
    if (!id) throw weddingNotFound();
    const userId = new Types.ObjectId(user.id);
    // Independent reads, so in parallel: this runs on every wedding route.
    // The wedding is read even for a non-member, but never returned to one.
    const [membership, wedding] = await Promise.all([
      this.memberships.findOne({ weddingId: id, userId, status: 'active' }, { role: 1 }).lean(),
      this.weddings.findById(id).lean(),
    ]);
    if (!membership || !wedding) throw weddingNotFound();
    if (!roles.includes(membership.role)) throw ownersOnly();
    return { wedding, role: membership.role, userId };
  }

  /**
   * Raises the wedding's archive write fence (schema document §6.3) in the
   * caller's transaction, or answers 409 WEDDING_ARCHIVED if the wedding is
   * no longer active. Every archive-sensitive write, in any module, calls
   * this in the same transaction. An archive committing at the same time
   * writes the same document, so one of the two transactions is retried and
   * then sees the other.
   */
  /** The wedding's active owners and managers. */
  async activeMembers(
    weddingId: Types.ObjectId,
  ): Promise<{ userId: Types.ObjectId; role: MembershipRole }[]> {
    return this.memberships.find({ weddingId, status: 'active' }, { userId: 1, role: 1 }).lean();
  }

  /**
   * Whether someone is an active owner or manager of the wedding, as tasks
   * may only be assigned to them (PRD TASK-05). Read in the caller's
   * transaction when one is given.
   */
  async isActiveMember(
    weddingId: Types.ObjectId,
    userId: Types.ObjectId,
    session?: ClientSession,
  ): Promise<boolean> {
    const membership = await this.memberships
      .findOne({ weddingId, userId, status: 'active' }, { _id: 1 })
      .session(session ?? null)
      .lean();
    return membership !== null;
  }

  /**
   * The couple's names and whether the wedding is active, for a guest's
   * invitation page; nothing private.
   */
  async coupleOf(
    weddingId: Types.ObjectId,
  ): Promise<{ coupleName: string; place: string; slug: string; active: boolean } | null> {
    const wedding = await this.weddings
      .findById(weddingId, { brideName: 1, groomName: 1, city: 1, state: 1, slug: 1, status: 1 })
      .lean();
    if (!wedding) return null;
    return {
      coupleName: `${wedding.brideName} & ${wedding.groomName}`,
      place: [wedding.city, wedding.state].filter(Boolean).join(', '),
      slug: wedding.slug,
      active: wedding.status === 'active',
    };
  }

  async raiseWriteFence(weddingId: Types.ObjectId, session: ClientSession): Promise<void> {
    const fenced = await this.weddings.updateOne(
      { _id: weddingId, status: 'active' },
      { $inc: { writeFenceVersion: 1 } },
      { session },
    );
    if (fenced.matchedCount === 0) throw weddingArchived();
  }

  /**
   * Sets aside `bytes` of the wedding's photo storage for an upload, in the
   * caller's transaction, and raises the write fence (schema document
   * §6.6). One conditional update, so uploads at the same time can never
   * together pass the limit. False when the storage would overflow; 409
   * WEDDING_ARCHIVED when the wedding is no longer active.
   */
  async reserveStorage(
    weddingId: Types.ObjectId,
    bytes: number,
    session: ClientSession,
  ): Promise<boolean> {
    const reserved = await this.weddings.updateOne(
      {
        _id: weddingId,
        status: 'active',
        $expr: {
          $lte: [
            { $add: ['$quota.usedBytes', '$quota.reservedBytes', bytes] },
            '$quota.limitBytes',
          ],
        },
      },
      { $inc: { 'quota.reservedBytes': bytes, writeFenceVersion: 1 } },
      { session },
    );
    if (reserved.matchedCount === 1) return true;
    await this.raiseWriteFence(weddingId, session);
    return false;
  }

  /**
   * Turns an upload's reservation into the bytes it really keeps, which may
   * be more or less. False, changing nothing, when the extra would pass the
   * limit. Not fenced: the upload was accepted while the wedding was active.
   */
  async settleStorage(
    weddingId: Types.ObjectId,
    reservedBytes: number,
    keptBytes: number,
    session: ClientSession,
  ): Promise<boolean> {
    const settled = await this.weddings.updateOne(
      {
        _id: weddingId,
        'quota.reservedBytes': { $gte: reservedBytes },
        $expr: {
          $lte: [
            {
              $add: [
                '$quota.usedBytes',
                { $subtract: ['$quota.reservedBytes', reservedBytes] },
                keptBytes,
              ],
            },
            '$quota.limitBytes',
          ],
        },
      },
      { $inc: { 'quota.reservedBytes': -reservedBytes, 'quota.usedBytes': keptBytes } },
      { session },
    );
    return settled.matchedCount === 1;
  }

  /** Frees the space of photos whose files were removed. */
  async freeStorage(
    weddingId: Types.ObjectId,
    bytes: number,
    session: ClientSession,
  ): Promise<void> {
    await this.weddings.updateOne(
      { _id: weddingId },
      [
        {
          $set: {
            'quota.usedBytes': { $max: [0, { $subtract: ['$quota.usedBytes', bytes] }] },
          },
        },
      ],
      { session, updatePipeline: true },
    );
  }

  /** Photo storage not yet used or set aside, in bytes; 0 when full. */
  async storageLeft(weddingId: Types.ObjectId): Promise<number> {
    const wedding = await this.weddings.findById(weddingId, { quota: 1 }).lean();
    if (!wedding) return 0;
    const { limitBytes, usedBytes, reservedBytes } = wedding.quota;
    return Math.max(0, limitBytes - usedBytes - reservedBytes);
  }

  /** Gives back an upload's reservation; the caller makes sure it happens once. */
  async releaseStorage(
    weddingId: Types.ObjectId,
    reservedBytes: number,
    session: ClientSession,
  ): Promise<void> {
    await this.weddings.updateOne(
      { _id: weddingId, 'quota.reservedBytes': { $gte: reservedBytes } },
      { $inc: { 'quota.reservedBytes': -reservedBytes } },
      { session },
    );
  }
}
