import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Types, type Connection, type Model } from 'mongoose';
import { AuditService } from '../../platform/audit/audit.service.js';
import { sha256 } from '../../platform/crypto.js';
import { parseObjectId } from '../../platform/mongo.js';
import { RateLimiter } from '../../platform/rate-limit.js';
import { AccountsService } from '../auth/accounts.service.js';
import type { ClientContext } from '../auth/auth-errors.js';
import { normalizeEmail } from '../auth/email.js';
import type { AuthenticatedUser } from '../auth/sessions.service.js';
import type { NotificationState } from '../notifications/notification.schema.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import type { CreateMemberInviteDto } from './dto/create-member-invite.dto.js';
import type { InvitePreviewDto } from './dto/invite-preview.dto.js';
import type { MemberInviteDto } from './dto/member-invite.dto.js';
import type { MyInviteDto } from './dto/my-invite.dto.js';
import type { WeddingDto } from './dto/wedding.dto.js';
import { MembershipInvite } from './schemas/membership-invite.schema.js';
import {
  ADMIN_ROLES,
  WeddingMembership,
  type MembershipRole,
} from './schemas/wedding-membership.schema.js';
import { Wedding } from './schemas/wedding.schema.js';
import { WeddingAccessService } from './wedding-access.service.js';
import {
  alreadyInvited,
  alreadyMember,
  alreadyOwner,
  fieldError,
  handOverStale,
  inviteEmailMismatch,
  inviteInvalid,
  inviteNotPending,
  ownerLimit,
  ownersOnly,
  weddingArchived,
} from './wedding-errors.js';
import { INVITE_TTL_MS, MAX_OWNERS, WEDDING_RATE_LIMITS } from './wedding-policy.js';
import { toWeddingDto } from './wedding-records.js';
import { Traced } from '../../platform/tracing.js';

type StoredInvite = MembershipInvite & { _id: Types.ObjectId };

/** Higher ranks first: accepting an invitation never lowers someone's role. */
const RANK: Record<MembershipRole, number> = { owner: 3, admin: 2, manager: 1 };

function inviteNotFound(): NotFoundException {
  return new NotFoundException({ code: 'INVITE_NOT_FOUND', message: 'Invitation not found.' });
}

function emailStatusOf(state: NotificationState | undefined): MemberInviteDto['emailStatus'] {
  if (state === 'sent' || state === 'delivered') return 'sent';
  if (state === 'queued' || state === 'processing' || state === undefined) return 'sending';
  return 'failed';
}

function isExpired(invite: StoredInvite, now = new Date()): boolean {
  return invite.status === 'pending' && invite.expiresAt <= now;
}

function toInviteDto(
  invite: StoredInvite,
  state: NotificationState | undefined,
  invitedByName?: string,
): MemberInviteDto {
  return {
    id: invite._id.toHexString(),
    email: invite.emailNormalized,
    role: invite.role,
    handOver: invite.handOver === true,
    status: isExpired(invite) ? 'expired' : invite.status,
    emailStatus: emailStatusOf(state),
    ...(invite.label ? { label: invite.label } : {}),
    ...(invitedByName ? { invitedByName } : {}),
    expiresAt: invite.expiresAt,
    createdAt: invite.createdAt,
  };
}

/**
 * Inviting people to a wedding's team, and accepting or declining (schema
 * document §6.2, decision 0020). Owners invite their partner as the second
 * owner, or hand over their own place to someone (decision 0025); owners
 * and admins invite admins and managers. Managers never manage the team.
 *
 * The email is requested in the transaction that records the invitation;
 * the worker sends it and creates the link (InviteEmailComposer). If the
 * email fails, the invitation and the wedding stay as they are, and it can
 * be resent. Every change is recorded in the audit log.
 */
@Traced()
@Injectable()
export class MemberInvitesService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(MembershipInvite.name) private readonly invites: Model<MembershipInvite>,
    @InjectModel(WeddingMembership.name) private readonly memberships: Model<WeddingMembership>,
    @InjectModel(Wedding.name) private readonly weddings: Model<Wedding>,
    private readonly access: WeddingAccessService,
    private readonly notifications: NotificationsService,
    private readonly accounts: AccountsService,
    private readonly audit: AuditService,
    private readonly limiter: RateLimiter,
  ) {}

  /**
   * Invites someone. The partner (`owner`): owners only, and a new
   * invitation replaces a pending one. A hand-over (`owner` with
   * `handOver`): owners only, for their own place, so it needs no free
   * seat; it replaces their own pending hand-over, and may go to an admin
   * or a manager already on the team. Admins and managers: owners and
   * admins. 409 ALREADY_MEMBER for someone on the team with this role or
   * a higher one (ALREADY_OWNER for a hand-over), ALREADY_INVITED for
   * someone with a pending invitation.
   */
  async create(
    user: AuthenticatedUser,
    weddingId: string,
    input: CreateMemberInviteDto,
  ): Promise<MemberInviteDto> {
    const { wedding, userId, role } = await this.access.require(user, weddingId, ADMIN_ROLES);
    const handOver = input.handOver === true;
    if (handOver && input.role !== 'owner') {
      throw fieldError('handOver', 'Only an owner’s place can be handed over.');
    }
    if (input.role === 'owner' && role !== 'owner') throw ownersOnly();
    if (wedding.status !== 'active') throw weddingArchived();
    const email = normalizeEmail(input.email);
    if (email === normalizeEmail(user.email)) {
      throw fieldError('email', 'This is your own address. Enter theirs.');
    }
    // A hand-over gives away the sender's own seat, so it needs no free one.
    if (input.role === 'owner' && !handOver) await this.requireOwnerSeat(wedding._id);
    // What a new owner invitation replaces: the partner's pending one, or
    // this owner's own pending hand-over. Never the other owner's.
    const replaces =
      input.role !== 'owner'
        ? null
        : handOver
          ? { role: 'owner' as const, handOver: true, invitedBy: userId }
          : { role: 'owner' as const, handOver: { $ne: true } };
    const inviteeId = await this.accounts.idByEmail(email);
    const label = input.label || undefined;

    const emailBudget = {
      rule: WEDDING_RATE_LIMITS.inviteEmailsPerWedding,
      subject: wedding._id.toHexString(),
    };
    const invite = await this.limiter.spend([emailBudget], () =>
      this.connection.transaction(async (session) => {
        // The fence first: two invitations to one wedding at once conflict
        // here, so the checks below always see the other one.
        await this.access.raiseWriteFence(wedding._id, session);
        const now = new Date();
        // A member may be invited to a higher role (a manager as the partner),
        // never to the one they have or a lower one.
        const current = inviteeId
          ? await this.access.activeMembership(wedding._id, inviteeId, session)
          : null;
        if (current && RANK[current.role] >= RANK[input.role]) {
          throw handOver ? alreadyOwner() : alreadyMember();
        }
        const pending = await this.invites
          .findOne(
            {
              weddingId: wedding._id,
              emailNormalized: email,
              status: 'pending',
              expiresAt: { $gt: now },
            },
            { role: 1, handOver: 1, invitedBy: 1 },
          )
          .session(session)
          .lean();
        const replaceable =
          pending?.role === 'owner' &&
          (handOver
            ? pending.handOver === true && pending.invitedBy.equals(userId)
            : pending.handOver !== true);
        if (pending && !(replaces && replaceable)) throw alreadyInvited();
        if (replaces) {
          // One partner seat, and one place of each owner: the new invitation
          // replaces the pending one for it.
          await this.invites.updateMany(
            { weddingId: wedding._id, status: 'pending', ...replaces },
            { $set: { status: 'revoked', revokedAt: now, revokedBy: userId, tokenHashes: [] } },
            { session },
          );
        }
        const notificationId = await this.notifications.requestEmail(session, {
          kind: 'member_invite',
          weddingId: wedding._id,
          recipientEmailNormalized: email,
        });
        const [created] = await this.invites.create(
          [
            {
              weddingId: wedding._id,
              emailNormalized: email,
              role: input.role,
              status: 'pending',
              tokenHashes: [],
              expiresAt: new Date(now.getTime() + INVITE_TTL_MS),
              notificationId,
              invitedBy: userId,
              ...(handOver ? { handOver: true } : {}),
              ...(label ? { label } : {}),
            },
          ],
          { session },
        );
        if (!created) throw new Error('Invitation was not created');
        await this.audit.record(session, {
          weddingId: wedding._id,
          actorUserId: userId,
          action: 'member_invite.created',
          entityType: 'membership_invite',
          entityId: created._id,
          safeDiff: { role: input.role, ...(handOver ? { handOver: true } : {}) },
        });
        return created.toObject();
      }),
    );
    return toInviteDto(invite, 'queued', await this.accounts.displayName(userId));
  }

  /**
   * Sends a pending invitation again with a new link, which works for 7 days
   * from now; earlier links stop working at once. Also renews one that
   * expired. The partner's invitation: owners only.
   */
  async resend(
    user: AuthenticatedUser,
    weddingId: string,
    inviteId: string,
  ): Promise<MemberInviteDto> {
    const { wedding, userId, role } = await this.access.require(user, weddingId, ADMIN_ROLES);
    if (wedding.status !== 'active') throw weddingArchived();
    const found = await this.ownInvite(wedding._id, inviteId);
    if (found.role === 'owner') {
      if (role !== 'owner') throw ownersOnly();
      if (!found.handOver) await this.requireOwnerSeat(wedding._id);
    }

    // Both limits are given back if the invitation is not found or the
    // write fails: only an email actually queued counts.
    const hits = [
      { rule: WEDDING_RATE_LIMITS.inviteResendPerInvite, subject: inviteId },
      { rule: WEDDING_RATE_LIMITS.inviteEmailsPerWedding, subject: wedding._id.toHexString() },
    ];
    const invite = await this.limiter.spend(hits, () =>
      this.connection.transaction(async (session) => {
        await this.access.raiseWriteFence(wedding._id, session);
        const notificationId = new Types.ObjectId();
        const renewed = await this.invites
          .findOneAndUpdate(
            { _id: found._id, weddingId: wedding._id, status: 'pending' },
            {
              $set: {
                notificationId,
                tokenHashes: [],
                expiresAt: new Date(Date.now() + INVITE_TTL_MS),
              },
            },
            { returnDocument: 'after', session },
          )
          .lean();
        if (!renewed) throw inviteNotPending();
        await this.notifications.requestEmail(
          session,
          {
            kind: 'member_invite',
            weddingId: wedding._id,
            recipientEmailNormalized: renewed.emailNormalized,
          },
          notificationId,
        );
        await this.audit.record(session, {
          weddingId: wedding._id,
          actorUserId: userId,
          action: 'member_invite.resent',
          entityType: 'membership_invite',
          entityId: renewed._id,
        });
        return renewed;
      }),
    );
    return toInviteDto(invite, 'queued', await this.accounts.displayName(invite.invitedBy));
  }

  /**
   * Withdraws a pending invitation: its links stop working at once and its
   * email is no longer sent. The partner's invitation: owners only.
   * Withdrawing one already withdrawn answers the same.
   */
  async revoke(
    user: AuthenticatedUser,
    weddingId: string,
    inviteId: string,
  ): Promise<MemberInviteDto> {
    const { wedding, userId, role } = await this.access.require(user, weddingId, ADMIN_ROLES);
    if (wedding.status !== 'active') throw weddingArchived();
    const found = await this.ownInvite(wedding._id, inviteId);
    if (found.role === 'owner' && role !== 'owner') throw ownersOnly();
    if (found.status === 'revoked') return this.view(found);

    const revoked = await this.connection.transaction(async (session) => {
      await this.access.raiseWriteFence(wedding._id, session);
      const changed = await this.invites
        .findOneAndUpdate(
          { _id: found._id, status: 'pending' },
          {
            $set: { status: 'revoked', revokedAt: new Date(), revokedBy: userId, tokenHashes: [] },
          },
          { returnDocument: 'after', session },
        )
        .lean();
      if (!changed) throw inviteNotPending();
      await this.audit.record(session, {
        weddingId: wedding._id,
        actorUserId: userId,
        action: 'member_invite.revoked',
        entityType: 'membership_invite',
        entityId: changed._id,
        safeDiff: { role: changed.role },
      });
      return changed;
    });
    return this.view(revoked);
  }

  /** The wedding's invitations, newest first, for its owners and admins. */
  async list(user: AuthenticatedUser, weddingId: string): Promise<MemberInviteDto[]> {
    const { wedding } = await this.access.require(user, weddingId, ADMIN_ROLES);
    return this.invitesOf(wedding._id);
  }

  /** The latest invitations of a wedding, for the team page (its caller checks access). */
  async invitesOf(weddingId: Types.ObjectId): Promise<MemberInviteDto[]> {
    const invites = await this.invites.find({ weddingId }).sort({ createdAt: -1 }).limit(50).lean();
    const [states, names] = await Promise.all([
      this.notifications.states(invites.map((invite) => invite.notificationId)),
      this.accounts.displayNames([...new Set(invites.map((invite) => invite.invitedBy))]),
    ]);
    return invites.map((invite) =>
      toInviteDto(
        invite,
        states.get(invite.notificationId.toHexString()),
        names.get(invite.invitedBy.toHexString()),
      ),
    );
  }

  /** Invitations still waiting for an answer and not expired, for the overview. Access is the caller's. */
  async pendingCount(weddingId: Types.ObjectId, now: Date): Promise<number> {
    return this.invites.countDocuments({ weddingId, status: 'pending', expiresAt: { $gt: now } });
  }

  /** What an invitation link is for, to its holder (public: they may not have an account yet). */
  async preview(token: string, client: ClientContext): Promise<InvitePreviewDto> {
    await this.limiter.consume(WEDDING_RATE_LIMITS.inviteTokenPerIp, client.ip);
    const invite = await this.findByToken(token);
    if (
      !invite ||
      (invite.status !== 'pending' && invite.status !== 'accepted') ||
      isExpired(invite)
    ) {
      throw inviteInvalid();
    }
    const wedding = await this.weddings.findById(invite.weddingId).lean();
    if (!wedding || wedding.status !== 'active') throw inviteInvalid();
    const invitedByName = await this.accounts.displayName(invite.invitedBy);
    return {
      brideName: wedding.brideName,
      groomName: wedding.groomName,
      city: wedding.city,
      state: wedding.state,
      ...(invitedByName ? { invitedByName } : {}),
      email: invite.emailNormalized,
      role: invite.role,
      handOver: invite.handOver === true,
      status: invite.status,
      expiresAt: invite.expiresAt,
    };
  }

  /**
   * The pending invitations sent to the signed-in account's own (verified)
   * address, newest first, for weddings that are still active. Lets an
   * invitee who arrives without the link see what is waiting for them.
   */
  async listMine(user: AuthenticatedUser): Promise<MyInviteDto[]> {
    const invites = await this.invites
      .find({
        emailNormalized: normalizeEmail(user.email),
        status: 'pending',
        expiresAt: { $gt: new Date() },
      })
      .sort({ createdAt: -1 })
      .lean();
    if (invites.length === 0) return [];
    const weddings = await this.weddings
      .find({ _id: { $in: invites.map((invite) => invite.weddingId) }, status: 'active' })
      .lean();
    const byId = new Map(weddings.map((wedding) => [wedding._id.toHexString(), wedding]));
    const result: MyInviteDto[] = [];
    for (const invite of invites) {
      const wedding = byId.get(invite.weddingId.toHexString());
      if (!wedding) continue;
      const invitedByName = await this.accounts.displayName(invite.invitedBy);
      result.push({
        id: invite._id.toHexString(),
        brideName: wedding.brideName,
        groomName: wedding.groomName,
        city: wedding.city,
        state: wedding.state,
        ...(wedding.weddingDate
          ? { weddingDate: wedding.weddingDate.toISOString().slice(0, 10) }
          : {}),
        ...(invitedByName ? { invitedByName } : {}),
        role: invite.role,
        handOver: invite.handOver === true,
        expiresAt: invite.expiresAt,
      });
    }
    return result;
  }

  /**
   * Accepts an invitation as the signed-in, verified account it was sent to,
   * from the link in the email. See `join`.
   */
  async accept(user: AuthenticatedUser, token: string, client: ClientContext): Promise<WeddingDto> {
    await this.limiter.consume(WEDDING_RATE_LIMITS.inviteTokenPerIp, client.ip);
    const invite = await this.findByToken(token);
    if (!invite) throw inviteInvalid();
    // The link must still be the current one when the acceptance is written.
    return this.join(user, invite, { tokenHashes: sha256(token) });
  }

  /**
   * Accepts an invitation without the link: the signed-in account's
   * verified address is the one it was sent to (decision 0008). Anyone else
   * gets 404, the same as for an invitation that does not exist.
   */
  async acceptById(user: AuthenticatedUser, inviteId: string): Promise<WeddingDto> {
    return this.join(user, await this.addressedTo(user, inviteId), {});
  }

  /**
   * Declines an invitation from its link, as the account it was sent to:
   * it stops working, and the person can be invited again later.
   */
  async decline(user: AuthenticatedUser, token: string, client: ClientContext): Promise<void> {
    await this.limiter.consume(WEDDING_RATE_LIMITS.inviteTokenPerIp, client.ip);
    const invite = await this.findByToken(token);
    if (!invite) throw inviteInvalid();
    await this.refuse(user, invite, { tokenHashes: sha256(token) });
  }

  /** Declines an invitation sent to the signed-in account's address, without the link. */
  async declineById(user: AuthenticatedUser, inviteId: string): Promise<void> {
    await this.refuse(user, await this.addressedTo(user, inviteId), {});
  }

  private async refuse(
    user: AuthenticatedUser,
    invite: StoredInvite,
    stillValid: { tokenHashes?: string },
  ): Promise<void> {
    if (invite.status !== 'pending' || isExpired(invite)) throw inviteInvalid();
    if (invite.emailNormalized !== normalizeEmail(user.email)) throw inviteEmailMismatch();
    const userId = new Types.ObjectId(user.id);
    await this.connection.transaction(async (session) => {
      const declined = await this.invites.updateOne(
        { _id: invite._id, status: 'pending', ...stillValid },
        { $set: { status: 'declined', declinedAt: new Date(), tokenHashes: [] } },
        { session },
      );
      if (declined.matchedCount === 0) throw inviteInvalid();
      await this.audit.record(session, {
        weddingId: invite.weddingId,
        actorUserId: userId,
        action: 'member_invite.declined',
        entityType: 'membership_invite',
        entityId: invite._id,
      });
    });
  }

  /**
   * Adds the account to the invitation's wedding with the invitation's
   * role, in one transaction that also marks the invitation accepted and
   * raises the wedding's write fence. Two owners at most is counted inside
   * it, and the fence write makes simultaneous acceptances for one wedding
   * conflict, so MongoDB retries the later one, which then sees the first.
   * Joining never lowers a role: an owner invited as a manager stays an
   * owner. Someone removed before is made active again. Accepting the same
   * invitation again succeeds. Owning or managing other weddings does not
   * matter (decision 0020).
   *
   * A hand-over (decision 0025) swaps two places in the same transaction:
   * the account becomes an owner and the sender, who must still be an
   * active owner, becomes an admin. The number of owners does not change.
   */
  private async join(
    user: AuthenticatedUser,
    invite: StoredInvite,
    stillValid: { tokenHashes?: string },
  ): Promise<WeddingDto> {
    const userId = new Types.ObjectId(user.id);

    if (invite.status === 'accepted' && invite.acceptedBy?.equals(userId)) {
      // A spent invitation proves nothing on its own: answer only while the
      // account is still an active member of a wedding that is still active.
      const [membership, wedding] = await Promise.all([
        this.memberships
          .findOne({ weddingId: invite.weddingId, userId, status: 'active' }, { role: 1 })
          .lean(),
        this.weddings.findById(invite.weddingId).lean(),
      ]);
      if (membership && wedding?.status === 'active') {
        return toWeddingDto(wedding, membership.role);
      }
      throw inviteInvalid();
    }
    if (invite.status !== 'pending' || isExpired(invite)) throw inviteInvalid();
    if (invite.emailNormalized !== normalizeEmail(user.email)) throw inviteEmailMismatch();

    const { wedding, role } = await this.connection.transaction(async (session) => {
      const now = new Date();
      const wedding = await this.weddings
        .findOne({ _id: invite.weddingId }, null, { session })
        .lean();
      if (!wedding) throw inviteInvalid();
      if (wedding.status !== 'active') throw weddingArchived();

      const current = await this.access.activeMembership(wedding._id, userId, session);
      const handOver = invite.handOver === true && invite.role === 'owner';
      if (handOver && current?.role === 'owner') throw alreadyOwner();
      const role: MembershipRole =
        current && RANK[current.role] >= RANK[invite.role] ? current.role : invite.role;
      if (role === 'owner' && current?.role !== 'owner') {
        // The sender of a hand-over gives up their seat in this transaction.
        const leaving = handOver ? [userId, invite.invitedBy] : [userId];
        const owners = await this.memberships.countDocuments(
          { weddingId: wedding._id, role: 'owner', status: 'active', userId: { $nin: leaving } },
          { session },
        );
        if (owners >= MAX_OWNERS) throw ownerLimit();
      }
      if (handOver) {
        // Only while the sender is still an active owner of this wedding.
        const stepped = await this.memberships.updateOne(
          { weddingId: wedding._id, userId: invite.invitedBy, role: 'owner', status: 'active' },
          { $set: { role: 'admin', activeOwned: false } },
          { session },
        );
        if (stepped.matchedCount === 0) throw handOverStale();
      }

      if (!current || current.role !== role) {
        await this.memberships.updateOne(
          { weddingId: wedding._id, userId },
          {
            $set: {
              role,
              status: 'active',
              activeOwned: role === 'owner',
              ...(current ? {} : { joinedAt: now }),
              ...(invite.label ? { label: invite.label } : {}),
            },
            $unset: { removedAt: 1, removedBy: 1 },
          },
          { upsert: true, session },
        );
      }
      // The invitation must still be valid now, not only when it was looked
      // up: it may expire, be replaced, withdrawn or (for a link) resent.
      const accepted = await this.invites.updateOne(
        { _id: invite._id, status: 'pending', expiresAt: { $gt: now }, ...stillValid },
        { $set: { status: 'accepted', acceptedBy: userId, acceptedAt: now } },
        { session },
      );
      if (accepted.matchedCount === 0) throw inviteInvalid();
      const fenced = await this.weddings.updateOne(
        { _id: wedding._id, status: 'active', writeFenceVersion: wedding.writeFenceVersion },
        { $inc: { writeFenceVersion: 1 } },
        { session },
      );
      if (fenced.matchedCount === 0) throw weddingArchived();
      await this.audit.record(session, {
        weddingId: wedding._id,
        actorUserId: userId,
        action: 'member.joined',
        entityType: 'membership',
        entityId: userId,
        safeDiff: { role, inviteId: invite._id.toHexString() },
      });
      if (handOver) {
        await this.audit.record(session, {
          weddingId: wedding._id,
          actorUserId: userId,
          action: 'member.ownership_handed_over',
          entityType: 'membership',
          entityId: invite.invitedBy,
          safeDiff: {
            from: invite.invitedBy.toHexString(),
            to: userId.toHexString(),
            fromRole: 'admin',
            inviteId: invite._id.toHexString(),
          },
        });
      }
      return { wedding, role };
    });
    return toWeddingDto(wedding, role);
  }

  private async findByToken(token: string): Promise<StoredInvite | null> {
    return this.invites.findOne({ tokenHashes: sha256(token) }).lean();
  }

  /** An invitation of this wedding, or 404. */
  private async ownInvite(weddingId: Types.ObjectId, inviteId: string): Promise<StoredInvite> {
    const id = parseObjectId(inviteId);
    const invite = id ? await this.invites.findOne({ _id: id, weddingId }).lean() : null;
    if (!invite) throw inviteNotFound();
    return invite;
  }

  /** An invitation sent to the signed-in account's address, or 404 as for none. */
  private async addressedTo(user: AuthenticatedUser, inviteId: string): Promise<StoredInvite> {
    const id = parseObjectId(inviteId);
    const invite = id ? await this.invites.findById(id).lean() : null;
    if (!invite || invite.emailNormalized !== normalizeEmail(user.email)) throw inviteNotFound();
    return invite;
  }

  private async view(invite: StoredInvite): Promise<MemberInviteDto> {
    const [states, invitedByName] = await Promise.all([
      this.notifications.states([invite.notificationId]),
      this.accounts.displayName(invite.invitedBy),
    ]);
    return toInviteDto(invite, states.get(invite.notificationId.toHexString()), invitedByName);
  }

  /** Inviting is pointless, and accepting impossible, once two owners exist. */
  private async requireOwnerSeat(weddingId: Types.ObjectId): Promise<void> {
    const owners = await this.memberships.countDocuments({
      weddingId,
      role: 'owner',
      status: 'active',
    });
    if (owners >= MAX_OWNERS) throw ownerLimit();
  }
}
