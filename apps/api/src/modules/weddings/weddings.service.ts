import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Types, type Connection, type Model } from 'mongoose';
import type { AuthenticatedUser } from '../auth/sessions.service.js';
import type { CreateWeddingDto } from './dto/create-wedding.dto.js';
import type { UpdateWeddingDto } from './dto/update-wedding.dto.js';
import type { WeddingDto } from './dto/wedding.dto.js';
import { WeddingMembership } from './schemas/wedding-membership.schema.js';
import { Wedding, WEDDING_QUOTA_BYTES } from './schemas/wedding.schema.js';
import { isFallbackBase, slugBase, withSuffix } from './slug.js';
import { WeddingAccessService } from './wedding-access.service.js';
import {
  fieldError,
  ownerActiveLimit,
  PAST_DATE_MESSAGE,
  weddingArchived,
} from './wedding-errors.js';
import { todayInIndia } from './wedding-policy.js';
import { duplicateKeyOn, toDate, toWeddingDto } from './wedding-records.js';
import { Traced } from '../../platform/tracing.js';

/** Couples plan weddings ahead: a new date must be today or later, in India. */
function refusePastDate(day: string): void {
  if (day < todayInIndia()) throw fieldError('weddingDate', PAST_DATE_MESSAGE);
}

/** Tries before giving up on a free slug; a random suffix almost never collides twice. */
const SLUG_ATTEMPTS = 6;

@Traced()
@Injectable()
export class WeddingsService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Wedding.name) private readonly weddings: Model<Wedding>,
    @InjectModel(WeddingMembership.name) private readonly memberships: Model<WeddingMembership>,
    private readonly access: WeddingAccessService,
  ) {}

  /**
   * Creates an active wedding with the user as its first owner, in one
   * transaction (schema document §6.1): there is never a wedding without
   * its owner. The partial unique index on memberships is what enforces one
   * active owned wedding per user, even for simultaneous requests; the
   * check before it only answers the common case without a transaction.
   * So a repeated submission cannot create a second wedding: it gets 409.
   */
  async create(user: AuthenticatedUser, input: CreateWeddingDto): Promise<WeddingDto> {
    if (input.weddingDate) refusePastDate(input.weddingDate);
    const userId = new Types.ObjectId(user.id);
    const owned = await this.memberships.exists({
      userId,
      role: 'owner',
      status: 'active',
      activeOwned: true,
    });
    if (owned) throw ownerActiveLimit();

    const base = slugBase(input.brideName, input.groomName);
    for (let attempt = 0; attempt < SLUG_ATTEMPTS; attempt += 1) {
      const slug = attempt === 0 && !isFallbackBase(base) ? base : withSuffix(base);
      try {
        const wedding = await this.connection.transaction(async (session) => {
          const weddingId = new Types.ObjectId();
          const now = new Date();
          // The membership first: if the user already owns a wedding, this
          // is where the transaction stops.
          await this.memberships.create(
            [
              {
                weddingId,
                userId,
                role: 'owner',
                status: 'active',
                activeOwned: true,
                joinedAt: now,
              },
            ],
            { session },
          );
          const [created] = await this.weddings.create(
            [
              {
                _id: weddingId,
                slug,
                brideName: input.brideName,
                groomName: input.groomName,
                city: input.city,
                state: input.state,
                ...(input.weddingDate ? { weddingDate: toDate(input.weddingDate) } : {}),
                status: 'active',
                writeFenceVersion: 0,
                quota: { limitBytes: WEDDING_QUOTA_BYTES, usedBytes: 0, reservedBytes: 0 },
                createdBy: userId,
              },
            ],
            { session },
          );
          if (!created) throw new Error('Wedding was not created');
          return created;
        });
        return toWeddingDto(wedding, 'owner');
      } catch (error) {
        const duplicate = duplicateKeyOn(error);
        // Another couple has this address: the whole transaction rolled
        // back, so try again with a new one.
        if (duplicate === 'slug') continue;
        if (duplicate === 'activeOwned') throw ownerActiveLimit();
        throw error;
      }
    }
    throw new Error(`No free slug for "${base}" after ${SLUG_ATTEMPTS} attempts`);
  }

  /** The weddings the user is an active member of, newest first. */
  async listFor(user: AuthenticatedUser): Promise<WeddingDto[]> {
    const memberships = await this.memberships
      .find({ userId: new Types.ObjectId(user.id), status: 'active' }, { weddingId: 1, role: 1 })
      .lean();
    if (memberships.length === 0) return [];
    const roles = new Map(memberships.map((m) => [m.weddingId.toHexString(), m.role]));
    const weddings = await this.weddings
      .find({ _id: { $in: memberships.map((m) => m.weddingId) } })
      .sort({ createdAt: -1 })
      .lean();
    return weddings.flatMap((wedding) => {
      const role = roles.get(wedding._id.toHexString());
      return role ? [toWeddingDto(wedding, role)] : [];
    });
  }

  /**
   * Changes the details of an active wedding (PRD WED-04), for its owners and
   * managers. The slug stays: renaming the web address comes with the website.
   * A date already stored may be in the past by now; only a new date must
   * not be. One atomic write, which also raises the archive write fence
   * (schema document §6.3), so an edit never lands on an archived wedding.
   */
  async update(
    user: AuthenticatedUser,
    weddingId: string,
    input: UpdateWeddingDto,
  ): Promise<WeddingDto> {
    const { wedding, role } = await this.access.require(user, weddingId);
    if (wedding.status !== 'active') throw weddingArchived();

    const stored = wedding.weddingDate?.toISOString().slice(0, 10);
    if (input.weddingDate && input.weddingDate !== stored) refusePastDate(input.weddingDate);

    const set: Partial<Wedding> = {};
    for (const field of ['brideName', 'groomName', 'city', 'state'] as const) {
      const value = input[field];
      if (value !== undefined) set[field] = value;
    }
    if (input.weddingDate) set.weddingDate = toDate(input.weddingDate);

    const updated = await this.weddings
      .findOneAndUpdate(
        { _id: wedding._id, status: 'active' },
        {
          $set: set,
          ...(input.weddingDate === null ? { $unset: { weddingDate: 1 } } : {}),
          $inc: { writeFenceVersion: 1 },
        },
        { returnDocument: 'after' },
      )
      .lean();
    // Archived between the check above and this write.
    if (!updated) throw weddingArchived();
    return toWeddingDto(updated, role);
  }
}
