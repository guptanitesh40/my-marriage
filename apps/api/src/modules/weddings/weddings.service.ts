import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Types, type Connection, type Model, type UpdateQuery } from 'mongoose';
import { AuditService } from '../../platform/audit/audit.service.js';
import { AccountsService } from '../auth/accounts.service.js';
import type { AuthenticatedUser } from '../auth/sessions.service.js';
import type { MemberDto, MemberListDto } from './dto/member.dto.js';
import type { CreateWeddingDto } from './dto/create-wedding.dto.js';
import type { UpdateWeddingDto, WeddingVenueInputDto } from './dto/update-wedding.dto.js';
import { googleMapsUrl } from '../events/event-links.js';
import type { WeddingDto } from './dto/wedding.dto.js';
import { MEMBERSHIP_ROLES, WeddingMembership } from './schemas/wedding-membership.schema.js';
import { WeddingSlug } from './schemas/wedding-slug.schema.js';
import { Wedding, WEDDING_QUOTA_BYTES, type WeddingVenue } from './schemas/wedding.schema.js';
import { isFallbackBase, slugBase, withSuffix } from './slug.js';
import { WeddingAccessService } from './wedding-access.service.js';
import {
  deletionPending,
  fieldError,
  PAST_DATE_MESSAGE,
  slugTaken,
  weddingArchived,
} from './wedding-errors.js';
import { todayInIndia } from './wedding-policy.js';
import { duplicateKeyOn, toDate, toWeddingDto } from './wedding-records.js';
import { Traced } from '../../platform/tracing.js';

/** Couples plan weddings ahead: a new date must be today or later, in India. */
function refusePastDate(day: string): void {
  if (day < todayInIndia()) throw fieldError('weddingDate', PAST_DATE_MESSAGE);
}

/** Owners, then admins, then managers. */
const ROLE_ORDER = MEMBERSHIP_ROLES;

/** Tries before giving up on a free slug; a random suffix almost never collides twice. */
const SLUG_ATTEMPTS = 6;

@Traced()
@Injectable()
export class WeddingsService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Wedding.name) private readonly weddings: Model<Wedding>,
    @InjectModel(WeddingMembership.name) private readonly memberships: Model<WeddingMembership>,
    @InjectModel(WeddingSlug.name) private readonly slugs: Model<WeddingSlug>,
    private readonly access: WeddingAccessService,
    private readonly accounts: AccountsService,
    private readonly audit: AuditService,
  ) {}

  /** The wedding's active members, for any of them (e.g. to assign a task). */
  async members(user: AuthenticatedUser, weddingId: string): Promise<MemberListDto> {
    const { wedding } = await this.access.require(user, weddingId);
    return { members: await this.memberDirectory(wedding._id) };
  }

  /**
   * The wedding's active members with their names: owners first, then
   * admins, then managers, each by name. Members whose account is gone are
   * left out.
   */
  async memberDirectory(weddingId: Types.ObjectId): Promise<MemberDto[]> {
    const members = await this.access.activeMembers(weddingId);
    const names = await this.accounts.displayNames(members.map((m) => m.userId));
    return members
      .flatMap((member) => {
        const displayName = names.get(member.userId.toHexString());
        return displayName
          ? [
              {
                userId: member.userId.toHexString(),
                displayName,
                role: member.role,
                ...(member.label ? { label: member.label } : {}),
              },
            ]
          : [];
      })
      .sort(
        (a, b) =>
          ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) ||
          a.displayName.localeCompare(b.displayName, 'en-IN'),
      );
  }

  /**
   * Creates an active wedding with the user as its first owner, in one
   * transaction (schema document §6.1): there is never a wedding without
   * its owner. A user may own several active weddings (decision 0020).
   */
  async create(user: AuthenticatedUser, input: CreateWeddingDto): Promise<WeddingDto> {
    if (input.weddingDate) refusePastDate(input.weddingDate);
    const userId = new Types.ObjectId(user.id);

    const base = slugBase(input.brideName, input.groomName);
    for (let attempt = 0; attempt < SLUG_ATTEMPTS; attempt += 1) {
      const slug = attempt === 0 && !isFallbackBase(base) ? base : withSuffix(base);
      try {
        const wedding = await this.connection.transaction(async (session) => {
          const weddingId = new Types.ObjectId();
          const now = new Date();
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
          // Reserves the address for good (decision 0017); taken, even as
          // another wedding's old address, means a new suffix.
          await this.slugs.create([{ slug, weddingId, current: true }], { session });
          return created;
        });
        return toWeddingDto(wedding, 'owner');
      } catch (error) {
        const duplicate = duplicateKeyOn(error);
        // Another couple has this address: the whole transaction rolled
        // back, so try again with a new one.
        if (duplicate === 'slug') continue;
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
   * One wedding, for its owners and managers, in any status: archived
   * weddings stay readable (PRD J4). Anyone else gets 404.
   */
  async get(user: AuthenticatedUser, weddingId: string): Promise<WeddingDto> {
    const { wedding, role } = await this.access.require(user, weddingId);
    return toWeddingDto(wedding, role);
  }

  /**
   * Changes the details of an active wedding (PRD WED-04), for any member,
   * including a new web address (decision 0017): the old one stays this
   * wedding's, in `wedding_slugs`, so its links redirect. A date already
   * stored may be in the past by now; only a new date must not be. One
   * transaction: the conditional write also raises the archive write fence
   * (schema document §6.3), so an edit never lands on an archived wedding,
   * and the audit log records which fields changed (never their values).
   */
  async update(
    user: AuthenticatedUser,
    weddingId: string,
    input: UpdateWeddingDto,
  ): Promise<WeddingDto> {
    const { wedding, role, userId } = await this.access.require(user, weddingId);
    if (wedding.status === 'deletion_pending') throw deletionPending();
    if (wedding.status !== 'active') throw weddingArchived();

    const stored = wedding.weddingDate?.toISOString().slice(0, 10);
    if (input.weddingDate && input.weddingDate !== stored) refusePastDate(input.weddingDate);

    const set: Partial<Wedding> = {};
    const unset: Partial<Record<keyof Wedding, 1>> = {};
    const changed: string[] = [];
    for (const field of ['brideName', 'groomName', 'city', 'state'] as const) {
      const value = input[field];
      if (value === undefined) continue;
      set[field] = value;
      changed.push(field);
    }
    if (input.weddingDate !== undefined) {
      if (input.weddingDate) set.weddingDate = toDate(input.weddingDate);
      else unset.weddingDate = 1;
      changed.push('weddingDate');
    }
    if (input.mainVenue !== undefined) {
      const venue = venueOf(input.mainVenue);
      if (venue) set.mainVenue = venue;
      else unset.mainVenue = 1;
      changed.push('mainVenue');
    }
    if (input.description !== undefined) {
      if (input.description) set.description = input.description;
      else unset.description = 1;
      changed.push('description');
    }
    const slug = input.slug !== undefined && input.slug !== wedding.slug ? input.slug : undefined;
    if (slug) {
      set.slug = slug;
      changed.push('slug');
    }
    const update: UpdateQuery<Wedding> = {
      $set: { ...set, lastSavedAt: new Date(), lastSavedBy: userId },
      ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}),
      $inc: { writeFenceVersion: 1 },
    };

    try {
      const updated = await this.connection.transaction(async (session) => {
        if (slug) {
          // An address this wedding used before can be taken back; any other
          // one in use or once used by another wedding cannot.
          const known = await this.slugs.findOne({ slug }).session(session).lean();
          if (known && !known.weddingId.equals(wedding._id)) throw slugTaken();
          if (known) {
            await this.slugs.updateOne(
              { _id: known._id },
              { $set: { current: true } },
              { session },
            );
          } else {
            await this.slugs.create([{ slug, weddingId: wedding._id, current: true }], {
              session,
            });
          }
          await this.slugs.updateOne(
            { slug: wedding.slug, weddingId: wedding._id },
            { $set: { current: false } },
            { session },
          );
        }
        const saved = await this.weddings
          .findOneAndUpdate({ _id: wedding._id, status: 'active' }, update, {
            returnDocument: 'after',
            session,
          })
          .lean();
        // Archived between the check above and this write.
        if (!saved) throw weddingArchived();
        await this.audit.record(session, {
          weddingId: wedding._id,
          actorUserId: userId,
          action: 'wedding.updated',
          entityType: 'wedding',
          entityId: wedding._id,
          safeDiff: { fields: changed.join(',') },
        });
        return saved;
      });
      return toWeddingDto(updated, role);
    } catch (error) {
      if (duplicateKeyOn(error) === 'slug') throw slugTaken();
      throw error;
    }
  }
}

/** The venue's known parts, or nothing when none is given. */
function venueOf(input: WeddingVenueInputDto | null): WeddingVenue | undefined {
  if (!input) return undefined;
  const mapsUrl = input.mapsUrl ? googleMapsUrl(input.mapsUrl) : null;
  if (!input.name && !input.address && !mapsUrl) return undefined;
  return {
    ...(input.name ? { name: input.name } : {}),
    ...(input.address ? { address: input.address } : {}),
    ...(mapsUrl ? { mapsUrl } : {}),
  };
}
