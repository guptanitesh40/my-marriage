import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Types, type Connection, type Model } from 'mongoose';
import { randomToken, sha256 } from '../../platform/crypto.js';
import { parseObjectId } from '../../platform/mongo.js';
import { RateLimiter } from '../../platform/rate-limit.js';
import { Traced } from '../../platform/tracing.js';
import type { ClientContext } from '../auth/auth-errors.js';
import { EventsService, type EventBrief } from '../events/events.service.js';
import { WeddingAccessService } from '../weddings/wedding-access.service.js';
import { WebsiteService } from '../website/website.service.js';
import type { RsvpPatchDto } from './dto/guest-access-input.dto.js';
import type {
  GuestReminderChoiceDto,
  GuestViewDto,
  GuestViewEventDto,
} from './dto/guest-view.dto.js';
import {
  countTooLarge,
  invitationNotFound,
  linkUnavailable,
  rsvpChanged,
  rsvpClosed,
} from './guest-errors.js';
import { GuestLinks } from './guest-links.js';
import { GUEST_RATE_LIMITS, GUEST_SESSION_DAYS } from './guest-policy.js';
import {
  EventInvitation,
  RSVP_HISTORY_LIMIT,
  type Rsvp,
} from './schemas/event-invitation.schema.js';
import { GuestContact } from './schemas/guest-contact.schema.js';
import { GuestSession } from './schemas/guest-session.schema.js';
import { InvitationToken } from './schemas/invitation-token.schema.js';

/** Who a guest cookie belongs to, set by GuestSessionGuard. */
export interface GuestContext {
  sessionId: Types.ObjectId;
  tokenId: Types.ObjectId;
  weddingId: Types.ObjectId;
  guestId: Types.ObjectId;
}

type StoredInvitation = EventInvitation & { _id: Types.ObjectId };

/**
 * The guest's side of an invitation (PRD INV-02 to INV-05, GUEST-07): no
 * account and no password. Whoever holds the private link can open it and
 * answer (a documented limitation, not identity verification). Opening the
 * link gives the browser a cookie scoped to that one guest, valid while the
 * link is active and the guest is on the list.
 */
@Traced()
@Injectable()
export class GuestAccessService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(GuestContact.name) private readonly guests: Model<GuestContact>,
    @InjectModel(EventInvitation.name) private readonly invitations: Model<EventInvitation>,
    @InjectModel(InvitationToken.name) private readonly tokens: Model<InvitationToken>,
    @InjectModel(GuestSession.name) private readonly sessions: Model<GuestSession>,
    private readonly access: WeddingAccessService,
    private readonly events: EventsService,
    private readonly website: WebsiteService,
    private readonly links: GuestLinks,
    private readonly limiter: RateLimiter,
  ) {}

  /**
   * Exchanges the secret from a link for a guest session. Unknown, revoked
   * and removed-guest links all answer the same "no longer available". An
   * archived wedding's invitation still opens, to be read.
   */
  async exchange(
    token: string,
    client: ClientContext,
  ): Promise<{ sessionToken: string; expiresAt: Date }> {
    await this.limiter.consume(GUEST_RATE_LIMITS.exchangePerIp, client.ip);
    const link = await this.tokens
      .findOne({ tokenHash: this.links.hash(token), status: 'active' })
      .lean();
    if (!link) throw linkUnavailable();
    const guest = await this.guests.exists({
      _id: link.guestId,
      weddingId: link.weddingId,
      status: 'active',
    });
    if (!guest) throw linkUnavailable();

    const sessionToken = randomToken();
    const expiresAt = new Date(Date.now() + GUEST_SESSION_DAYS * 24 * 3600 * 1000);
    await this.sessions.create({
      tokenId: link._id,
      weddingId: link.weddingId,
      guestId: link.guestId,
      sessionHash: sha256(sessionToken),
      expiresAt,
    });
    // At most once a minute: an audit hint, not a log of every visit.
    await this.tokens.updateOne(
      {
        _id: link._id,
        $or: [{ lastUsedAt: null }, { lastUsedAt: { $lt: new Date(Date.now() - 60_000) } }],
      },
      { $set: { lastUsedAt: new Date() } },
    );
    return { sessionToken, expiresAt };
  }

  /**
   * Who a guest cookie belongs to, if its session is live, its link still
   * active and its guest still on the list; otherwise null.
   */
  async authenticate(sessionToken: string): Promise<GuestContext | null> {
    const session = await this.sessions
      .findOne({
        sessionHash: sha256(sessionToken),
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      })
      .lean();
    if (!session) return null;
    const [link, guest] = await Promise.all([
      this.tokens.exists({ _id: session.tokenId, status: 'active' }),
      this.guests.exists({ _id: session.guestId, weddingId: session.weddingId, status: 'active' }),
    ]);
    if (!link || !guest) return null;
    return {
      sessionId: session._id,
      tokenId: session.tokenId,
      weddingId: session.weddingId,
      guestId: session.guestId,
    };
  }

  /**
   * What the guest sees: the couple, their name and party size, and only the
   * ceremonies they are invited to (PRD INV-02, INV-05). Deleted events are
   * left out; cancelled ones show their last answer, closed.
   */
  async view(context: GuestContext): Promise<GuestViewDto> {
    const [couple, guest, invitations] = await Promise.all([
      this.access.coupleOf(context.weddingId),
      this.guests
        .findById(context.guestId, {
          name: 1,
          partySize: 1,
          emailNormalized: 1,
          reminderOptOutAt: 1,
        })
        .lean(),
      this.invitations
        .find({ weddingId: context.weddingId, guestId: context.guestId, isInvited: true })
        .lean(),
    ]);
    if (!couple || !guest) throw linkUnavailable();
    const look = await this.website.designFor(context.weddingId, couple.slug);
    const briefs = await this.events.briefs(
      context.weddingId,
      invitations.map((invitation) => invitation.eventId),
    );
    const byEvent = new Map(
      invitations.map((invitation) => [invitation.eventId.toHexString(), invitation]),
    );
    return {
      coupleName: couple.coupleName,
      place: couple.place,
      slug: couple.slug,
      guestName: guest.name,
      partySize: guest.partySize,
      writable: couple.active,
      events: briefs.flatMap((event) => {
        const invitation = byEvent.get(event.id);
        return invitation && !event.deleted ? [this.eventView(event, invitation)] : [];
      }),
      ...(guest.emailNormalized
        ? { reminderEmails: guest.reminderOptOutAt ? ('off' as const) : ('on' as const) }
        : {}),
      templateId: look.templateId,
      ...(look.coverUrl ? { coverUrl: look.coverUrl } : {}),
    };
  }

  /**
   * The guest's own choice about reminder emails (PRD §5.10 consent): off
   * stops every reminder, by hand or on schedule, without touching the
   * invitation or answers. Allowed on an archived wedding too.
   */
  async setReminderEmails(
    context: GuestContext,
    choice: 'on' | 'off',
  ): Promise<GuestReminderChoiceDto> {
    await this.limiter.consume(GUEST_RATE_LIMITS.rsvpPerSession, context.sessionId.toHexString());
    const update =
      choice === 'off'
        ? { $set: { reminderOptOutAt: new Date() } }
        : { $unset: { reminderOptOutAt: 1 } };
    const guest = await this.guests
      .findOneAndUpdate(
        // Keeps the first opt-out date when it is pressed again.
        {
          _id: context.guestId,
          weddingId: context.weddingId,
          status: 'active',
          ...(choice === 'off' ? { reminderOptOutAt: null } : {}),
        },
        update,
        { returnDocument: 'after' },
      )
      .lean();
    if (!guest) {
      const still = await this.guests.exists({
        _id: context.guestId,
        weddingId: context.weddingId,
        status: 'active',
      });
      if (!still) throw linkUnavailable();
    }
    return { reminderEmails: choice };
  }

  /**
   * Saves the guest's answer for one ceremony (PRD INV-03, INV-04). In one
   * transaction: the archive write fence (schema document §6.3), the guest's
   * current party size, the invitation still selected, the ceremony still
   * open, and the version the guest saw; a stale version is refused, never
   * overwritten. The previous answer goes into the history.
   */
  async answer(
    context: GuestContext,
    invitationId: string,
    input: RsvpPatchDto,
  ): Promise<GuestViewEventDto> {
    await this.limiter.consume(GUEST_RATE_LIMITS.rsvpPerSession, context.sessionId.toHexString());
    const id = parseObjectId(invitationId);
    if (!id) throw invitationNotFound();

    const { event, invitation } = await this.connection.transaction(async (session) => {
      await this.access.raiseWriteFence(context.weddingId, session);
      // One after the other: a transaction runs one operation at a time.
      const guest = await this.guests
        .findOne({ _id: context.guestId, weddingId: context.weddingId, status: 'active' })
        .session(session)
        .lean();
      const link = await this.tokens
        .exists({ _id: context.tokenId, status: 'active' })
        .session(session);
      const current = await this.invitations
        .findOne({
          _id: id,
          weddingId: context.weddingId,
          guestId: context.guestId,
          isInvited: true,
        })
        .session(session)
        .lean();
      if (!guest || !link) throw linkUnavailable();
      if (!current) throw invitationNotFound();
      const [brief] = await this.events.briefs(context.weddingId, [current.eventId], session);
      if (!brief || brief.deleted) throw invitationNotFound();
      if (brief.cancelled) throw rsvpClosed();

      const rsvp = this.rsvpOf(input, guest.partySize, current.rsvp.responseVersion);
      const previous =
        current.rsvp.status === 'pending'
          ? []
          : [
              {
                status: current.rsvp.status,
                ...(current.rsvp.attendingCount !== undefined
                  ? { attendingCount: current.rsvp.attendingCount }
                  : {}),
                at: current.rsvp.respondedAt ?? current.updatedAt,
              },
            ];
      const saved = await this.invitations
        .findOneAndUpdate(
          { _id: id, 'rsvp.responseVersion': input.responseVersion },
          {
            $set: { rsvp },
            $push: { history: { $each: previous, $slice: -RSVP_HISTORY_LIMIT } },
          },
          { returnDocument: 'after', session },
        )
        .lean();
      if (!saved) throw rsvpChanged();
      return { event: brief, invitation: saved };
    });
    return this.eventView(event, invitation);
  }

  /** Ends this browser's guest session; the link itself keeps working. */
  async logout(sessionToken: string | undefined): Promise<void> {
    if (!sessionToken) return;
    await this.sessions.updateOne(
      { sessionHash: sha256(sessionToken), revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
  }

  /**
   * The answer as stored: attending needs 1 to party size; not attending is
   * 0; maybe may give a count (not confirmed); the version moves on.
   */
  private rsvpOf(input: RsvpPatchDto, partySize: number, version: number): Rsvp {
    const base = { respondedAt: new Date(), responseVersion: version + 1 };
    if (input.status === 'not_attending') {
      return { status: 'not_attending', attendingCount: 0, ...base };
    }
    const count = input.attendingCount;
    if (input.status === 'attending') {
      if (count === undefined || count < 1 || count > partySize) throw countTooLarge(partySize);
      return { status: 'attending', attendingCount: count, ...base };
    }
    if (count !== undefined && count > partySize) throw countTooLarge(partySize);
    return { status: 'maybe', ...(count ? { attendingCount: count } : {}), ...base };
  }

  private eventView(event: EventBrief, invitation: StoredInvitation): GuestViewEventDto {
    return {
      invitationId: invitation._id.toHexString(),
      title: event.title,
      ...(event.startDate ? { startDate: event.startDate } : {}),
      ...(event.startTime ? { startTime: event.startTime } : {}),
      timeZone: event.timeZone,
      ...(event.venueName ? { venueName: event.venueName } : {}),
      ...(event.venueAddress ? { venueAddress: event.venueAddress } : {}),
      ...(event.dressCode ? { dressCode: event.dressCode } : {}),
      cancelled: event.cancelled,
      rsvp: {
        status: invitation.rsvp.status,
        ...(invitation.rsvp.attendingCount !== undefined
          ? { attendingCount: invitation.rsvp.attendingCount }
          : {}),
        ...(invitation.rsvp.respondedAt ? { respondedAt: invitation.rsvp.respondedAt } : {}),
        responseVersion: invitation.rsvp.responseVersion,
      },
    };
  }
}
