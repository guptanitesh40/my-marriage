import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Types, type ClientSession, type Connection, type Model } from 'mongoose';
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
import type { WeddingDto } from './dto/wedding.dto.js';
import { MembershipInvite } from './schemas/membership-invite.schema.js';
import { WeddingMembership } from './schemas/wedding-membership.schema.js';
import { Wedding } from './schemas/wedding.schema.js';
import { WeddingAccessService } from './wedding-access.service.js';
import {
  fieldError,
  inviteEmailMismatch,
  inviteInvalid,
  ownerLimit,
  weddingArchived,
} from './wedding-errors.js';
import { INVITE_TTL_MS, MAX_OWNERS, WEDDING_RATE_LIMITS } from './wedding-policy.js';
import { duplicateKeyOn, toWeddingDto } from './wedding-records.js';
import { Traced } from '../../platform/tracing.js';

type StoredInvite = MembershipInvite & { _id: Types.ObjectId };

/** For an invitee who already owns a wedding (PRD 7.4): no silent second one. */
function ownerActiveLimitOnAccept(): ConflictException {
  return new ConflictException({
    code: 'OWNER_ACTIVE_LIMIT',
    message:
      'You already own an active wedding, and an account can own one at a time. To join this wedding as an owner, archive yours first.',
  });
}

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

function toInviteDto(invite: StoredInvite, state: NotificationState | undefined): MemberInviteDto {
  return {
    id: invite._id.toHexString(),
    email: invite.emailNormalized,
    role: invite.role,
    status: isExpired(invite) ? 'expired' : invite.status,
    emailStatus: emailStatusOf(state),
    expiresAt: invite.expiresAt,
    createdAt: invite.createdAt,
  };
}

/**
 * Inviting a partner as the wedding's second owner, and accepting
 * (schema document §6.2). Managers' invitations come with PRD TEAM-01.
 *
 * The email is requested in the transaction that records the invitation;
 * the worker sends it and creates the link (InviteEmailComposer). If the
 * email fails, the invitation and the wedding stay as they are, and the
 * owner can resend it.
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
    private readonly limiter: RateLimiter,
  ) {}

  /** Invites the partner. Owners only; a new invitation replaces a pending one. */
  async create(
    user: AuthenticatedUser,
    weddingId: string,
    input: CreateMemberInviteDto,
  ): Promise<MemberInviteDto> {
    const { wedding, userId } = await this.access.require(user, weddingId, ['owner']);
    if (wedding.status !== 'active') throw weddingArchived();
    const email = normalizeEmail(input.email);
    if (email === normalizeEmail(user.email)) {
      throw fieldError('email', 'This is your own address. Enter your partner’s email.');
    }
    await this.requireOwnerSeat(wedding._id);

    const emailBudget = {
      rule: WEDDING_RATE_LIMITS.inviteEmailsPerWedding,
      subject: wedding._id.toHexString(),
    };
    const invite = await this.limiter.spend([emailBudget], () =>
      this.connection.transaction(async (session) => {
        await this.raiseWriteFence(wedding._id, session);
        const now = new Date();
        // One partner seat, so one pending invitation: the new one replaces it.
        await this.invites.updateMany(
          { weddingId: wedding._id, role: 'owner', status: 'pending' },
          { $set: { status: 'revoked', revokedAt: now, tokenHashes: [] } },
          { session },
        );
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
            },
          ],
          { session },
        );
        if (!created) throw new Error('Invitation was not created');
        return created.toObject();
      }),
    );
    return toInviteDto(invite, 'queued');
  }

  /**
   * Sends a pending invitation again with a new link, which works for 7 days
   * from now; earlier links stop working at once. Also renews one that expired.
   */
  async resend(
    user: AuthenticatedUser,
    weddingId: string,
    inviteId: string,
  ): Promise<MemberInviteDto> {
    const { wedding } = await this.access.require(user, weddingId, ['owner']);
    if (wedding.status !== 'active') throw weddingArchived();
    const id = parseObjectId(inviteId);
    if (!id) throw inviteNotFound();
    await this.requireOwnerSeat(wedding._id);

    // Both limits are given back if the invitation is not found or the
    // write fails: only an email actually queued counts.
    const hits = [
      { rule: WEDDING_RATE_LIMITS.inviteResendPerInvite, subject: inviteId },
      { rule: WEDDING_RATE_LIMITS.inviteEmailsPerWedding, subject: wedding._id.toHexString() },
    ];
    const invite = await this.limiter.spend(hits, () =>
      this.connection.transaction(async (session) => {
        await this.raiseWriteFence(wedding._id, session);
        const notificationId = new Types.ObjectId();
        const renewed = await this.invites
          .findOneAndUpdate(
            { _id: id, weddingId: wedding._id, status: 'pending' },
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
        if (!renewed) throw inviteNotFound();
        await this.notifications.requestEmail(
          session,
          {
            kind: 'member_invite',
            weddingId: wedding._id,
            recipientEmailNormalized: renewed.emailNormalized,
          },
          notificationId,
        );
        return renewed;
      }),
    );
    return toInviteDto(invite, 'queued');
  }

  /** The wedding's invitations, newest first, for its owners and managers. */
  async list(user: AuthenticatedUser, weddingId: string): Promise<MemberInviteDto[]> {
    const { wedding } = await this.access.require(user, weddingId);
    const invites = await this.invites
      .find({ weddingId: wedding._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    const states = await this.notifications.states(invites.map((invite) => invite.notificationId));
    return invites.map((invite) =>
      toInviteDto(invite, states.get(invite.notificationId.toHexString())),
    );
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
      status: invite.status,
      expiresAt: invite.expiresAt,
    };
  }

  /**
   * Accepts an invitation as the signed-in, verified account it was sent to.
   * One transaction adds the owner membership, marks the invitation accepted
   * and raises the wedding's write fence. Two owners at most is counted
   * inside it, and the fence write makes simultaneous acceptances for one
   * wedding conflict, so MongoDB retries the later one, which then sees the
   * first. One active owned wedding per user is the membership index's job,
   * as at creation. Accepting the same link again succeeds.
   */
  async accept(user: AuthenticatedUser, token: string, client: ClientContext): Promise<WeddingDto> {
    await this.limiter.consume(WEDDING_RATE_LIMITS.inviteTokenPerIp, client.ip);
    const invite = await this.findByToken(token);
    if (!invite) throw inviteInvalid();
    const userId = new Types.ObjectId(user.id);

    if (invite.status === 'accepted' && invite.acceptedBy?.equals(userId)) {
      // A spent link proves nothing on its own: answer only while the
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

    const ownsAnother = await this.memberships.exists({
      userId,
      role: 'owner',
      status: 'active',
      activeOwned: true,
      weddingId: { $ne: invite.weddingId },
    });
    if (ownsAnother) throw ownerActiveLimitOnAccept();

    try {
      const wedding = await this.connection.transaction(async (session) => {
        const now = new Date();
        const wedding = await this.weddings
          .findOne({ _id: invite.weddingId }, null, { session })
          .lean();
        if (!wedding) throw inviteInvalid();
        if (wedding.status !== 'active') throw weddingArchived();

        const owners = await this.memberships.countDocuments(
          { weddingId: wedding._id, role: 'owner', status: 'active', userId: { $ne: userId } },
          { session },
        );
        if (owners >= MAX_OWNERS) throw ownerLimit();

        // A manager of this wedding becomes an owner; anyone else joins as one.
        await this.memberships.updateOne(
          { weddingId: wedding._id, userId },
          { $set: { role: 'owner', status: 'active', activeOwned: true, joinedAt: now } },
          { upsert: true, session },
        );
        // The link must still be valid now, not only when it was looked up:
        // a resend in between replaces it, and the invitation may expire.
        const accepted = await this.invites.updateOne(
          {
            _id: invite._id,
            status: 'pending',
            tokenHashes: sha256(token),
            expiresAt: { $gt: now },
          },
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
        return wedding;
      });
      return toWeddingDto(wedding, 'owner');
    } catch (error) {
      if (duplicateKeyOn(error) === 'activeOwned') throw ownerActiveLimitOnAccept();
      throw error;
    }
  }

  private async findByToken(token: string): Promise<StoredInvite | null> {
    return this.invites.findOne({ tokenHashes: sha256(token) }).lean();
  }

  /**
   * Raises the wedding's archive write fence (schema document §6.3) in the
   * caller's transaction, or answers 409 if the wedding is no longer active.
   * An archive committing at the same time writes the same document, so one
   * of the two transactions is retried and then sees the other.
   */
  private async raiseWriteFence(weddingId: Types.ObjectId, session: ClientSession): Promise<void> {
    const fenced = await this.weddings.updateOne(
      { _id: weddingId, status: 'active' },
      { $inc: { writeFenceVersion: 1 } },
      { session },
    );
    if (fenced.matchedCount === 0) throw weddingArchived();
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
