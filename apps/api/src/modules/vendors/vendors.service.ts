import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Types, type ClientSession, type Connection, type Model, type UpdateQuery } from 'mongoose';
import { parseObjectId } from '../../platform/mongo.js';
import { Traced } from '../../platform/tracing.js';
import type { AuthenticatedUser } from '../auth/sessions.service.js';
import { EventsService } from '../events/events.service.js';
import { ADMIN_ROLES } from '../weddings/schemas/wedding-membership.schema.js';
import { WeddingAccessService } from '../weddings/wedding-access.service.js';
import { weddingArchived } from '../weddings/wedding-errors.js';
import type { CreateVendorDto } from './dto/create-vendor.dto.js';
import type { UpdateVendorDto } from './dto/update-vendor.dto.js';
import type { VendorDto, VendorListDto } from './dto/vendor.dto.js';
import { Vendor } from './schemas/vendor.schema.js';
import { unknownVendorEvents, vendorNotFound } from './vendor-errors.js';
import { VENDOR_LIST_LIMIT } from './vendor-policy.js';

type StoredVendor = Vendor & { _id: Types.ObjectId };

/** Deleted vendors are kept, but are no longer part of the directory. */
const NOT_DELETED = { deletedAt: null } as const;

/** The optional text fields, which are stored only when given. */
const OPTIONAL = ['contactName', 'phone', 'email', 'address', 'notes'] as const;

/** The IDs once each, in the order given. */
function distinctIds(ids: readonly string[]): Types.ObjectId[] {
  return [...new Set(ids.map((id) => id.toLowerCase()))].map((id) => new Types.ObjectId(id));
}

/**
 * A wedding's vendor directory (PRD VEND-01 to VEND-03), for its owners
 * and managers. Every query is scoped to the wedding the access check
 * returned, and linked events must be the wedding's own. Vendors are
 * private: nothing here is used by a public page.
 */
@Traced()
@Injectable()
export class VendorsService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Vendor.name) private readonly vendors: Model<Vendor>,
    private readonly access: WeddingAccessService,
    private readonly events: EventsService,
  ) {}

  /** The wedding's vendors by name, at most VENDOR_LIST_LIMIT. Archived weddings stay readable. */
  async list(user: AuthenticatedUser, weddingId: string): Promise<VendorListDto> {
    const { wedding } = await this.access.require(user, weddingId);
    const [found, events] = await Promise.all([
      this.vendors
        .find({ weddingId: wedding._id, ...NOT_DELETED })
        .collation({ locale: 'en', strength: 2 })
        .sort({ name: 1, _id: 1 })
        .limit(VENDOR_LIST_LIMIT + 1)
        .lean(),
      this.events.titles(wedding._id),
    ]);
    return {
      vendors: found.slice(0, VENDOR_LIST_LIMIT).map((vendor) => this.toDto(vendor, events)),
      truncated: found.length > VENDOR_LIST_LIMIT,
    };
  }

  async get(user: AuthenticatedUser, weddingId: string, vendorId: string): Promise<VendorDto> {
    const { wedding } = await this.access.require(user, weddingId);
    const id = parseObjectId(vendorId);
    if (!id) throw vendorNotFound();
    const vendor = await this.vendors
      .findOne({ _id: id, weddingId: wedding._id, ...NOT_DELETED })
      .lean();
    if (!vendor) throw vendorNotFound();
    return this.toDto(vendor, await this.events.titles(wedding._id));
  }

  /**
   * Adds a vendor to an active wedding. Its events are checked, and the
   * vendor written, in one transaction with the archive write fence.
   */
  async create(
    user: AuthenticatedUser,
    weddingId: string,
    input: CreateVendorDto,
  ): Promise<VendorDto> {
    const { wedding } = await this.access.require(user, weddingId);
    if (wedding.status !== 'active') throw weddingArchived();
    const eventIds = distinctIds(input.eventIds ?? []);
    const record: Omit<Vendor, 'createdAt' | 'updatedAt'> = {
      weddingId: wedding._id,
      name: input.name,
      category: input.category,
      eventIds,
    };
    for (const field of OPTIONAL) {
      const value = input[field];
      if (value) record[field] = value;
    }

    const created = await this.connection.transaction(async (session) => {
      if ((await this.events.countExisting(wedding._id, eventIds, session)) !== eventIds.length) {
        throw unknownVendorEvents();
      }
      await this.access.raiseWriteFence(wedding._id, session);
      const [vendor] = await this.vendors.create([record], { session });
      return vendor;
    });
    if (!created) throw new Error('The vendor was not created');
    return this.toDto(created.toObject(), await this.events.titles(wedding._id));
  }

  /**
   * Changes a vendor of an active wedding. The vendor is read and written in
   * one transaction with the write fence, so a change never lands on an
   * archived wedding or links a just-deleted event.
   */
  async update(
    user: AuthenticatedUser,
    weddingId: string,
    vendorId: string,
    input: UpdateVendorDto,
  ): Promise<VendorDto> {
    const { wedding } = await this.access.require(user, weddingId);
    if (wedding.status !== 'active') throw weddingArchived();
    const id = parseObjectId(vendorId);
    if (!id) throw vendorNotFound();
    const filter = { _id: id, weddingId: wedding._id, ...NOT_DELETED };
    const eventIds = input.eventIds ? distinctIds(input.eventIds) : undefined;

    const updated = await this.connection.transaction(async (session) => {
      const exists = await this.vendors.exists(filter).session(session);
      if (!exists) throw vendorNotFound();
      if (
        eventIds &&
        (await this.events.countExisting(wedding._id, eventIds, session)) !== eventIds.length
      ) {
        throw unknownVendorEvents();
      }
      await this.access.raiseWriteFence(wedding._id, session);
      return this.vendors
        .findOneAndUpdate(filter, this.changeOf(input, eventIds), {
          returnDocument: 'after',
          session,
        })
        .lean();
    });
    if (!updated) throw vendorNotFound();
    return this.toDto(updated, await this.events.titles(wedding._id));
  }

  /**
   * Deletes a vendor (owners and admins, as for events). The record is kept,
   * marked with when and by whom, so expenses that name it keep their
   * history; it leaves the directory. Deleting it again answers not found.
   */
  async remove(user: AuthenticatedUser, weddingId: string, vendorId: string): Promise<void> {
    const { wedding, userId } = await this.access.require(user, weddingId, ADMIN_ROLES);
    if (wedding.status !== 'active') throw weddingArchived();
    const id = parseObjectId(vendorId);
    if (!id) throw vendorNotFound();

    await this.connection.transaction(async (session) => {
      await this.access.raiseWriteFence(wedding._id, session);
      const deleted = await this.vendors.updateOne(
        { _id: id, weddingId: wedding._id, ...NOT_DELETED },
        { $set: { deletedAt: new Date(), deletedBy: userId } },
        { session },
      );
      if (deleted.matchedCount === 0) throw vendorNotFound();
    });
  }

  /**
   * Whether a vendor belongs to the wedding and is not deleted, read in the
   * caller's transaction (expenses link to vendors).
   */
  async exists(
    weddingId: Types.ObjectId,
    vendorId: Types.ObjectId,
    session: ClientSession,
  ): Promise<boolean> {
    const vendor = await this.vendors
      .exists({ _id: vendorId, weddingId, ...NOT_DELETED })
      .session(session);
    return vendor !== null;
  }

  /**
   * The names of some of the wedding's vendors, including deleted ones, so
   * expenses that name them keep their history (PRD EXP-05).
   */
  async labels(
    weddingId: Types.ObjectId,
    vendorIds: readonly Types.ObjectId[],
  ): Promise<Map<string, { name: string; deleted: boolean }>> {
    if (vendorIds.length === 0) return new Map();
    const vendors = await this.vendors
      .find({ _id: { $in: vendorIds }, weddingId }, { name: 1, deletedAt: 1 })
      .lean();
    return new Map(
      vendors.map((vendor) => [
        vendor._id.toHexString(),
        { name: vendor.name, deleted: Boolean(vendor.deletedAt) },
      ]),
    );
  }

  /** The update that applies `input`: left out stays, empty or null removes. */
  private changeOf(input: UpdateVendorDto, eventIds?: Types.ObjectId[]): UpdateQuery<Vendor> {
    const set: Partial<Vendor> = {};
    const unset: Record<string, 1> = {};
    if (input.name !== undefined) set.name = input.name;
    if (input.category !== undefined) set.category = input.category;
    for (const field of OPTIONAL) {
      const value = input[field];
      if (value === undefined) continue;
      if (value) set[field] = value;
      else unset[field] = 1;
    }
    if (eventIds) set.eventIds = eventIds;
    return {
      $set: set,
      ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}),
    };
  }

  /**
   * The vendor with its events named, in the wedding's order. Events deleted
   * since are left out; their IDs stay stored so nothing is silently lost.
   */
  private toDto(vendor: StoredVendor, events: Map<string, string>): VendorDto {
    const linked = new Set(vendor.eventIds.map((id) => id.toHexString()));
    return {
      id: vendor._id.toHexString(),
      name: vendor.name,
      category: vendor.category,
      ...(vendor.contactName ? { contactName: vendor.contactName } : {}),
      ...(vendor.phone ? { phone: vendor.phone } : {}),
      ...(vendor.email ? { email: vendor.email } : {}),
      ...(vendor.address ? { address: vendor.address } : {}),
      ...(vendor.notes ? { notes: vendor.notes } : {}),
      events: [...events].filter(([id]) => linked.has(id)).map(([id, title]) => ({ id, title })),
      createdAt: vendor.createdAt,
      updatedAt: vendor.updatedAt,
    };
  }
}
