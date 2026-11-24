import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import type { Connection, Model, Types } from 'mongoose';
import { AuditService } from '../../platform/audit/audit.service.js';
import { Traced } from '../../platform/tracing.js';
import { AccountsService } from '../auth/accounts.service.js';
import type { AuthenticatedUser } from '../auth/sessions.service.js';
import type { WeddingDto, WeddingSettingsDto } from './dto/wedding.dto.js';
import { DeletionJob } from './schemas/deletion-job.schema.js';
import { WeddingMembership } from './schemas/wedding-membership.schema.js';
import { Wedding } from './schemas/wedding.schema.js';
import { WeddingAccessService } from './wedding-access.service.js';
import { deletionPending, weddingNotFound } from './wedding-errors.js';
import { toWeddingDto } from './wedding-records.js';

const OWNERS = ['owner'] as const;

/**
 * A wedding's lifecycle (PRD WED-05 to WED-07, decision 0021): archiving,
 * requesting deletion and cancelling that request. Owners only; admins and
 * managers get 403 OWNER_REQUIRED.
 *
 * Each change is one conditional update of the wedding's status that also
 * raises its write fence, in a transaction with its audit record. A planning
 * write racing it either commits first or conflicts and finds the wedding no
 * longer active (schema document §6.3). Repeating a request answers with
 * the state already reached, so a double click or a retry is harmless.
 */
@Traced()
@Injectable()
export class WeddingLifecycleService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Wedding.name) private readonly weddings: Model<Wedding>,
    @InjectModel(WeddingMembership.name) private readonly memberships: Model<WeddingMembership>,
    @InjectModel(DeletionJob.name) private readonly jobs: Model<DeletionJob>,
    private readonly access: WeddingAccessService,
    private readonly accounts: AccountsService,
    private readonly audit: AuditService,
  ) {}

  /** The settings page, for any member: the wedding and who changed what, when. */
  async settings(user: AuthenticatedUser, weddingId: string): Promise<WeddingSettingsDto> {
    const { wedding, role } = await this.access.require(user, weddingId);
    const request =
      wedding.status === 'deletion_pending'
        ? await this.jobs
            .findOne(
              { weddingId: wedding._id, state: 'requested' },
              { requestedAt: 1, requestedBy: 1 },
            )
            .lean()
        : null;
    const people = [wedding.lastSavedBy, wedding.archivedBy, request?.requestedBy].filter(
      (id): id is Types.ObjectId => id !== undefined,
    );
    const names = await this.accounts.displayNames(people);
    const nameOf = (id: Types.ObjectId | undefined) => {
      const name = id ? names.get(id.toHexString()) : undefined;
      return name ? { byName: name } : {};
    };
    return {
      wedding: toWeddingDto(wedding, role),
      ...(wedding.lastSavedAt
        ? { lastSaved: { at: wedding.lastSavedAt.toISOString(), ...nameOf(wedding.lastSavedBy) } }
        : {}),
      ...(wedding.archivedAt
        ? { archived: { at: wedding.archivedAt.toISOString(), ...nameOf(wedding.archivedBy) } }
        : {}),
      ...(request
        ? {
            deletionRequest: {
              requestedAt: request.requestedAt.toISOString(),
              ...nameOf(request.requestedBy),
            },
          }
        : {}),
    };
  }

  /**
   * Archives an active wedding: read-only for everyone from then on, its
   * published website and approved photos still up. Not undone in the app
   * (PRD: reopening is not an MVP workflow). 409 WEDDING_DELETION_PENDING
   * while deletion is requested.
   */
  async archive(user: AuthenticatedUser, weddingId: string): Promise<WeddingDto> {
    const { wedding, userId } = await this.access.require(user, weddingId, OWNERS);
    if (wedding.status === 'archived') return toWeddingDto(wedding, 'owner');
    if (wedding.status === 'deletion_pending') throw deletionPending();

    const archived = await this.connection.transaction(async (session) => {
      const updated = await this.weddings
        .findOneAndUpdate(
          { _id: wedding._id, status: 'active' },
          {
            $set: { status: 'archived', archivedAt: new Date(), archivedBy: userId },
            $inc: { writeFenceVersion: 1 },
          },
          { returnDocument: 'after', session },
        )
        .lean();
      if (!updated) return null;
      await this.memberships.updateMany(
        { weddingId: wedding._id, role: 'owner', activeOwned: true },
        { $set: { activeOwned: false } },
        { session },
      );
      await this.audit.record(session, {
        weddingId: wedding._id,
        actorUserId: userId,
        action: 'wedding.archived',
        entityType: 'wedding',
        entityId: wedding._id,
      });
      return updated;
    });
    if (archived) return toWeddingDto(archived, 'owner');
    // Its status changed since it was read: archived by the other owner,
    // or deletion requested.
    return this.archivedNow(wedding._id);
  }

  /**
   * Requests deletion of an active or archived wedding: a soft delete
   * (decision 0021). The wedding becomes `deletion_pending`, read-only for
   * its team, and its website, gallery, invitation and upload pages go
   * offline. Nothing is erased; an owner can cancel while it waits.
   */
  async requestDeletion(user: AuthenticatedUser, weddingId: string): Promise<WeddingSettingsDto> {
    const { wedding, userId } = await this.access.require(user, weddingId, OWNERS);
    if (wedding.status !== 'deletion_pending') {
      await this.connection.transaction(async (session) => {
        const before = await this.weddings
          .findOneAndUpdate(
            { _id: wedding._id, status: { $in: ['active', 'archived'] } },
            { $set: { status: 'deletion_pending' }, $inc: { writeFenceVersion: 1 } },
            { returnDocument: 'before', session, projection: { status: 1 } },
          )
          .lean();
        // Requested by the other owner since it was read.
        if (!before) return;
        const now = new Date();
        const [job] = await this.jobs.create(
          [
            {
              weddingId: wedding._id,
              requestedBy: userId,
              state: 'requested',
              requestedAt: now,
              previousStatus: before.status,
            },
          ],
          { session },
        );
        await this.audit.record(session, {
          weddingId: wedding._id,
          actorUserId: userId,
          action: 'wedding.deletion_requested',
          entityType: 'deletion_job',
          ...(job ? { entityId: job._id } : {}),
          safeDiff: { previousStatus: before.status },
        });
      });
    }
    return this.settings(user, weddingId);
  }

  /**
   * Withdraws a waiting deletion request: the wedding returns to what it
   * was, active or archived, and its pages come back. Without a waiting
   * request, answers with the wedding as it is.
   */
  async cancelDeletion(user: AuthenticatedUser, weddingId: string): Promise<WeddingSettingsDto> {
    const { wedding, userId } = await this.access.require(user, weddingId, OWNERS);
    if (wedding.status === 'deletion_pending') {
      await this.connection.transaction(async (session) => {
        const job = await this.jobs
          .findOneAndUpdate(
            { weddingId: wedding._id, state: 'requested' },
            { $set: { state: 'cancelled', cancelledAt: new Date(), cancelledBy: userId } },
            { returnDocument: 'after', session },
          )
          .lean();
        // Cancelled by the other owner since it was read.
        if (!job) return;
        await this.weddings.updateOne(
          { _id: wedding._id, status: 'deletion_pending' },
          { $set: { status: job.previousStatus }, $inc: { writeFenceVersion: 1 } },
          { session },
        );
        await this.audit.record(session, {
          weddingId: wedding._id,
          actorUserId: userId,
          action: 'wedding.deletion_cancelled',
          entityType: 'deletion_job',
          entityId: job._id,
          safeDiff: { restoredStatus: job.previousStatus },
        });
      });
    }
    return this.settings(user, weddingId);
  }

  /** The wedding, if it is archived now; 409 if deletion was requested instead. */
  private async archivedNow(weddingId: Types.ObjectId): Promise<WeddingDto> {
    const current = await this.weddings.findById(weddingId).lean();
    if (!current) throw weddingNotFound();
    if (current.status !== 'archived') throw deletionPending();
    return toWeddingDto(current, 'owner');
  }
}
