import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { isEmail } from 'class-validator';
import { Types, type ClientSession, type Connection, type Model, type UpdateQuery } from 'mongoose';
import { parseObjectId } from '../../platform/mongo.js';
import { RateLimiter } from '../../platform/rate-limit.js';
import { Traced } from '../../platform/tracing.js';
import { normalizeEmail } from '../auth/email.js';
import type { AuthenticatedUser } from '../auth/sessions.service.js';
import { EventsService, type EventBrief } from '../events/events.service.js';
import type { NotificationState } from '../notifications/notification.schema.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { WeddingAccessService } from '../weddings/wedding-access.service.js';
import { weddingArchived } from '../weddings/wedding-errors.js';
import type {
  CreateGuestDto,
  ImportCommitDto,
  ImportPreviewDto,
  ImportRowDto,
  InvitationSelectionDto,
  UpdateGuestDto,
} from './dto/guest-input.dto.js';
import type {
  EventRsvpTotalsDto,
  GuestDetailDto,
  GuestDto,
  GuestInvitationDto,
  GuestLinkDto,
  GuestListDto,
  GuestTotalsDto,
  ImportCommitResultDto,
  ImportPreviewResultDto,
  ImportRowResultDto,
} from './dto/guest.dto.js';
import {
  guestNotFound,
  noEmailAddress,
  nothingToInviteTo,
  partySizeConflict,
  unknownEvents,
} from './guest-errors.js';
import { WebsiteService } from '../website/website.service.js';
import { GuestLinks } from './guest-links.js';
import { GUEST_LIMITS, GUEST_LIST_LIMIT, GUEST_RATE_LIMITS } from './guest-policy.js';
import { EventInvitation } from './schemas/event-invitation.schema.js';
import { GuestContact } from './schemas/guest-contact.schema.js';
import { GuestSession } from './schemas/guest-session.schema.js';
import { InvitationToken } from './schemas/invitation-token.schema.js';

type StoredGuest = GuestContact & { _id: Types.ObjectId };
type StoredInvitation = EventInvitation & { _id: Types.ObjectId };
type StoredToken = InvitationToken & { _id: Types.ObjectId };

const ACTIVE = { status: 'active' } as const;

/** The IDs once each, in the order given. */
function distinctIds(ids: readonly string[]): Types.ObjectId[] {
  return [...new Set(ids.map((id) => id.toLowerCase()))].map((id) => new Types.ObjectId(id));
}

/** Text compared ignoring case and spacing, for duplicates and ceremony names. */
function folded(text: string): string {
  return text.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
}

function isPhone(value: string): boolean {
  if (!/^\+?[\d\s().-]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, '').length;
  return digits >= 6 && digits <= 15;
}

/** An import row checked and tidied; `problems` empty when it can be imported. */
interface CheckedRow {
  index: number;
  problems: { field: string; message: string }[];
  duplicateOf?: string;
  guest?: {
    name: string;
    partySize: number;
    emailNormalized?: string;
    phone?: string;
    organizerNotes?: string;
    eventIds: Types.ObjectId[];
  };
}

/**
 * A wedding's guest contacts and their invitations (PRD GUEST-01 to
 * GUEST-06, INV-01, INV-05, INV-06, INV-09), for its owners and managers.
 * Every query is scoped to the wedding the access check returned. Writes go
 * through the archive write fence in the same transaction, which also puts
 * them in order with guests' RSVP saves (schema document §6.3, §6.4).
 */
@Traced()
@Injectable()
export class GuestsService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(GuestContact.name) private readonly guests: Model<GuestContact>,
    @InjectModel(EventInvitation.name) private readonly invitations: Model<EventInvitation>,
    @InjectModel(InvitationToken.name) private readonly tokens: Model<InvitationToken>,
    @InjectModel(GuestSession.name) private readonly sessions: Model<GuestSession>,
    private readonly access: WeddingAccessService,
    private readonly events: EventsService,
    private readonly notifications: NotificationsService,
    private readonly links: GuestLinks,
    private readonly limiter: RateLimiter,
    private readonly website: WebsiteService,
  ) {}

  /**
   * The wedding's guests by name, at most GUEST_LIST_LIMIT, with totals over
   * all of them: contacts, people invited (each once), answers, and people
   * confirmed per ceremony. Archived weddings stay readable.
   */
  async list(user: AuthenticatedUser, weddingId: string): Promise<GuestListDto> {
    const { wedding } = await this.access.require(user, weddingId);
    const [found, invitations, events] = await Promise.all([
      this.guests
        .find({ weddingId: wedding._id, ...ACTIVE })
        .collation({ locale: 'en', strength: 2 })
        .sort({ name: 1, _id: 1 })
        .lean(),
      this.invitations.find({ weddingId: wedding._id, isInvited: true }).lean(),
      this.events.briefs(wedding._id),
    ]);
    const shown = found.slice(0, GUEST_LIST_LIMIT);
    const byGuest = this.groupByGuest(invitations);
    const known = await this.withDeletedEvents(wedding._id, events, invitations);
    const [linkStates, emailStates] = await Promise.all([
      this.linkStates(
        wedding._id,
        shown.map((guest) => guest._id),
      ),
      this.notifications.states(shown.flatMap((guest) => this.emailIds(guest))),
    ]);
    return {
      guests: shown.map((guest) =>
        this.toDto(guest, byGuest.get(guest._id.toHexString()) ?? [], known, {
          link: { status: linkStates.get(guest._id.toHexString()) ?? 'none' },
          emailState: this.stateOf(emailStates, guest.lastInviteEmailId),
          reminderState: this.stateOf(emailStates, guest.lastReminderId),
        }),
      ),
      truncated: found.length > GUEST_LIST_LIMIT,
      totals: this.totalsOf(found, byGuest, events),
    };
  }

  /** One guest with their link and the history of each answer. */
  async get(user: AuthenticatedUser, weddingId: string, guestId: string): Promise<GuestDetailDto> {
    const { wedding } = await this.access.require(user, weddingId);
    const guest = await this.findGuest(wedding._id, guestId);
    return this.detailOf(guest);
  }

  /**
   * Adds a guest to an active wedding, inviting them to `eventIds` if given.
   * The events are checked, and everything written, in one transaction with
   * the write fence.
   */
  async create(
    user: AuthenticatedUser,
    weddingId: string,
    input: CreateGuestDto,
  ): Promise<GuestDetailDto> {
    const { wedding, userId } = await this.access.require(user, weddingId);
    if (wedding.status !== 'active') throw weddingArchived();
    const eventIds = distinctIds(input.eventIds ?? []);

    const created = await this.connection.transaction(async (session) => {
      await this.checkEvents(wedding._id, eventIds, session);
      await this.access.raiseWriteFence(wedding._id, session);
      const [guest] = await this.guests.create(
        [
          {
            weddingId: wedding._id,
            name: input.name,
            partySize: input.partySize,
            ...(input.email ? { emailNormalized: normalizeEmail(input.email) } : {}),
            ...(input.phone ? { phone: input.phone } : {}),
            ...(input.organizerNotes ? { organizerNotes: input.organizerNotes } : {}),
            status: 'active',
            createdBy: userId,
          },
        ],
        { session },
      );
      if (!guest) throw new Error('The guest was not created');
      await this.invite(wedding._id, guest._id, eventIds, userId, session);
      return guest.toObject();
    });
    return this.detailOf(created);
  }

  /**
   * Changes a guest's details. A party size below any answer already given
   * for an open ceremony is refused, naming those ceremonies; answers are
   * never reduced to fit (PRD GUEST-06, schema document §6.4).
   */
  async update(
    user: AuthenticatedUser,
    weddingId: string,
    guestId: string,
    input: UpdateGuestDto,
  ): Promise<GuestDetailDto> {
    const { wedding } = await this.access.require(user, weddingId);
    if (wedding.status !== 'active') throw weddingArchived();
    const id = parseObjectId(guestId);
    if (!id) throw guestNotFound();
    const filter = { _id: id, weddingId: wedding._id, ...ACTIVE };

    const updated = await this.connection.transaction(async (session) => {
      const guest = await this.guests.findOne(filter).session(session).lean();
      if (!guest) throw guestNotFound();
      if (input.partySize !== undefined && input.partySize < guest.partySize) {
        await this.checkPartySize(guest, input.partySize, session);
      }
      await this.access.raiseWriteFence(wedding._id, session);
      return this.guests
        .findOneAndUpdate(filter, this.changeOf(input), { returnDocument: 'after', session })
        .lean();
    });
    if (!updated) throw guestNotFound();
    return this.detailOf(updated);
  }

  /**
   * Removes a guest (owners only, as for events, vendors and expenses). The
   * record and answers are kept, marked removed; every link and guest
   * session stops working at once.
   */
  async remove(user: AuthenticatedUser, weddingId: string, guestId: string): Promise<void> {
    const { wedding, userId } = await this.access.require(user, weddingId, ['owner']);
    if (wedding.status !== 'active') throw weddingArchived();
    const id = parseObjectId(guestId);
    if (!id) throw guestNotFound();

    await this.connection.transaction(async (session) => {
      await this.access.raiseWriteFence(wedding._id, session);
      const now = new Date();
      const removed = await this.guests.updateOne(
        { _id: id, weddingId: wedding._id, ...ACTIVE },
        { $set: { status: 'removed', removedAt: now, removedBy: userId } },
        { session },
      );
      if (removed.matchedCount === 0) throw guestNotFound();
      await this.revokeLinks(wedding._id, id, now, session);
    });
  }

  /**
   * Sets the ceremonies a guest is invited to (PRD INV-01, INV-05). New ones
   * must be the wedding's own; unselected ones keep their answer, hidden
   * from the guest, and come back if selected again.
   */
  async setInvitations(
    user: AuthenticatedUser,
    weddingId: string,
    guestId: string,
    input: InvitationSelectionDto,
  ): Promise<GuestDetailDto> {
    const { wedding, userId } = await this.access.require(user, weddingId);
    if (wedding.status !== 'active') throw weddingArchived();
    const id = parseObjectId(guestId);
    if (!id) throw guestNotFound();
    const eventIds = distinctIds(input.eventIds);

    const guest = await this.connection.transaction(async (session) => {
      const found = await this.guests
        .findOne({ _id: id, weddingId: wedding._id, ...ACTIVE })
        .session(session)
        .lean();
      if (!found) throw guestNotFound();
      const current = await this.invitations
        .find({ weddingId: wedding._id, guestId: id, isInvited: true }, { eventId: 1 })
        .session(session)
        .lean();
      const invited = new Set(current.map((invitation) => invitation.eventId.toHexString()));
      // Only new choices are checked: one kept may point at an event deleted since.
      const added = eventIds.filter((eventId) => !invited.has(eventId.toHexString()));
      await this.checkEvents(wedding._id, added, session);
      await this.access.raiseWriteFence(wedding._id, session);
      await this.invitations.updateMany(
        { weddingId: wedding._id, guestId: id, isInvited: true, eventId: { $nin: eventIds } },
        { $set: { isInvited: false } },
        { session },
      );
      await this.invite(wedding._id, id, added, userId, session);
      return found;
    });
    return this.detailOf(guest);
  }

  /**
   * The guest's private link, creating one if there is none (PRD INV-01).
   * With `reissue`, the current links are revoked first, so they stop
   * working (PRD INV-09).
   */
  async createLink(
    user: AuthenticatedUser,
    weddingId: string,
    guestId: string,
    reissue: boolean,
  ): Promise<GuestLinkDto> {
    const { wedding, userId } = await this.access.require(user, weddingId);
    if (wedding.status !== 'active') throw weddingArchived();
    const id = parseObjectId(guestId);
    if (!id) throw guestNotFound();

    const token = await this.connection.transaction(async (session) => {
      const guest = await this.guests
        .exists({ _id: id, weddingId: wedding._id, ...ACTIVE })
        .session(session);
      if (!guest) throw guestNotFound();
      await this.access.raiseWriteFence(wedding._id, session);
      if (reissue) await this.revokeLinks(wedding._id, id, new Date(), session);
      return this.activeLink(wedding._id, id, userId, session);
    });
    return this.linkDto(token, await this.website.publishedAddress(wedding._id));
  }

  /** Revokes every link of the guest and signs out their browsers (PRD INV-09). */
  async revokeLink(
    user: AuthenticatedUser,
    weddingId: string,
    guestId: string,
  ): Promise<GuestLinkDto> {
    const { wedding } = await this.access.require(user, weddingId);
    if (wedding.status !== 'active') throw weddingArchived();
    const id = parseObjectId(guestId);
    if (!id) throw guestNotFound();

    await this.connection.transaction(async (session) => {
      const guest = await this.guests
        .exists({ _id: id, weddingId: wedding._id, ...ACTIVE })
        .session(session);
      if (!guest) throw guestNotFound();
      await this.access.raiseWriteFence(wedding._id, session);
      await this.revokeLinks(wedding._id, id, new Date(), session);
    });
    const any = await this.tokens.exists({ weddingId: wedding._id, guestId: id });
    return { status: any ? 'revoked' : 'none' };
  }

  /**
   * Queues the invitation email (PRD INV-06, INV-08), creating the link if
   * needed. The email is written in the worker, which rebuilds the link, so
   * the link is never stored in the queue. Needs an email address and at
   * least one open ceremony.
   */
  /**
   * Guests with an email address to ask for photos (decision 0019): every
   * guest on the list, or those attending at least one ceremony that is
   * still on. For the photos module; the caller has checked membership.
   */
  async photoRecipients(
    weddingId: Types.ObjectId,
    audience: 'all' | 'attending',
  ): Promise<{ guestId: Types.ObjectId; name: string; emailNormalized: string }[]> {
    let guestIds: Types.ObjectId[] | undefined;
    if (audience === 'attending') {
      const live = (await this.events.briefs(weddingId))
        .filter((event) => !event.cancelled)
        .map((event) => new Types.ObjectId(event.id));
      guestIds = await this.invitations.distinct('guestId', {
        weddingId,
        eventId: { $in: live },
        isInvited: true,
        'rsvp.status': 'attending',
      });
    }
    const guests = await this.guests
      .find(
        {
          weddingId,
          ...ACTIVE,
          emailNormalized: { $exists: true, $ne: '' },
          ...(guestIds ? { _id: { $in: guestIds } } : {}),
        },
        { name: 1, emailNormalized: 1 },
      )
      .lean();
    return guests.flatMap((guest) =>
      guest.emailNormalized
        ? [{ guestId: guest._id, name: guest.name, emailNormalized: guest.emailNormalized }]
        : [],
    );
  }

  async sendEmail(
    user: AuthenticatedUser,
    weddingId: string,
    guestId: string,
  ): Promise<GuestDetailDto> {
    const { wedding, userId } = await this.access.require(user, weddingId);
    if (wedding.status !== 'active') throw weddingArchived();
    const id = parseObjectId(guestId);
    if (!id) throw guestNotFound();

    const guest = await this.limiter.spend(
      [
        { rule: GUEST_RATE_LIMITS.inviteEmailsPerWedding, subject: wedding._id.toHexString() },
        { rule: GUEST_RATE_LIMITS.inviteEmailPerGuest, subject: id.toHexString() },
      ],
      () =>
        this.connection.transaction(async (session) => {
          const found = await this.guests
            .findOne({ _id: id, weddingId: wedding._id, ...ACTIVE })
            .session(session)
            .lean();
          if (!found) throw guestNotFound();
          if (!found.emailNormalized) throw noEmailAddress();
          const invited = await this.invitations
            .find({ weddingId: wedding._id, guestId: id, isInvited: true }, { eventId: 1 })
            .session(session)
            .lean();
          const open = (
            await this.events.briefs(
              wedding._id,
              invited.map((invitation) => invitation.eventId),
              session,
            )
          ).filter((event) => !event.deleted && !event.cancelled);
          if (open.length === 0) throw nothingToInviteTo();
          await this.access.raiseWriteFence(wedding._id, session);
          await this.activeLink(wedding._id, id, userId, session);
          const emailId = await this.notifications.requestEmail(session, {
            kind: 'guest_invite',
            weddingId: wedding._id,
            recipientEmailNormalized: found.emailNormalized,
          });
          return this.guests
            .findOneAndUpdate(
              { _id: id },
              { $set: { lastInviteEmailId: emailId, lastInviteEmailAt: new Date() } },
              { returnDocument: 'after', session },
            )
            .lean();
        }),
    );
    if (!guest) throw guestNotFound();
    return this.detailOf(guest);
  }

  /**
   * Checks rows read from a CSV or XLSX file (PRD GUEST-05): problems per
   * row, and possible duplicates of guests already on the list or of
   * earlier rows. Nothing is written.
   */
  async previewImport(
    user: AuthenticatedUser,
    weddingId: string,
    input: ImportPreviewDto,
  ): Promise<ImportPreviewResultDto> {
    const { wedding } = await this.access.require(user, weddingId);
    const checked = await this.checkRows(wedding._id, input.rows);
    const rows: ImportRowResultDto[] = checked.map((row) => ({
      index: row.index,
      status: row.problems.length > 0 ? 'error' : row.duplicateOf ? 'duplicate' : 'ready',
      problems: row.problems,
      ...(row.duplicateOf ? { duplicateOf: row.duplicateOf } : {}),
    }));
    return {
      rows,
      ready: rows.filter((row) => row.status === 'ready').length,
      errors: rows.filter((row) => row.status === 'error').length,
      duplicates: rows.filter((row) => row.status === 'duplicate').length,
    };
  }

  /**
   * Imports the rows that pass, checked again here, in one transaction with
   * the write fence: all of them or none. Rows with problems are never
   * imported; possible duplicates are imported unless `skipDuplicates`.
   */
  async commitImport(
    user: AuthenticatedUser,
    weddingId: string,
    input: ImportCommitDto,
  ): Promise<ImportCommitResultDto> {
    const { wedding, userId } = await this.access.require(user, weddingId);
    if (wedding.status !== 'active') throw weddingArchived();

    return this.connection.transaction(async (session) => {
      const checked = await this.checkRows(wedding._id, input.rows, session);
      const rejected = checked.filter((row) => row.problems.length > 0).length;
      const wanted = checked.filter(
        (row) => row.problems.length === 0 && !(input.skipDuplicates && row.duplicateOf),
      );
      await this.access.raiseWriteFence(wedding._id, session);
      for (const row of wanted) {
        const guest = row.guest;
        if (!guest) continue;
        const [created] = await this.guests.create(
          [
            {
              weddingId: wedding._id,
              name: guest.name,
              partySize: guest.partySize,
              ...(guest.emailNormalized ? { emailNormalized: guest.emailNormalized } : {}),
              ...(guest.phone ? { phone: guest.phone } : {}),
              ...(guest.organizerNotes ? { organizerNotes: guest.organizerNotes } : {}),
              status: 'active',
              createdBy: userId,
            },
          ],
          { session },
        );
        if (created) await this.invite(wedding._id, created._id, guest.eventIds, userId, session);
      }
      return {
        created: wanted.length,
        skipped: checked.length - rejected - wanted.length,
        rejected,
      };
    });
  }

  /** Each row's problems, possible duplicate and tidied values. */
  private async checkRows(
    weddingId: Types.ObjectId,
    rows: readonly ImportRowDto[],
    session?: ClientSession,
  ): Promise<CheckedRow[]> {
    // One after the other: a transaction runs one operation at a time.
    const existing = await this.guests
      .find({ weddingId, ...ACTIVE }, { name: 1, emailNormalized: 1 })
      .session(session ?? null)
      .lean();
    const events = await this.events.briefs(weddingId, undefined, session);
    const byName = new Map(existing.map((guest) => [folded(guest.name), guest.name]));
    const byEmail = new Map(
      existing.flatMap((guest) =>
        guest.emailNormalized ? [[guest.emailNormalized, guest.name] as const] : [],
      ),
    );
    const eventsByTitle = new Map(events.map((event) => [folded(event.title), event.id]));

    return rows.map((row, index): CheckedRow => {
      const problems: { field: string; message: string }[] = [];
      const problem = (field: string, message: string) => problems.push({ field, message });
      const name = row.name.normalize('NFC').trim().replace(/\s+/g, ' ');
      if (!name) problem('name', 'Enter a name.');
      else if ([...name].length > GUEST_LIMITS.name)
        problem('name', `Use ${GUEST_LIMITS.name} characters or fewer.`);
      else if (/[\p{Cc}\p{Cf}]/u.test(name)) problem('name', 'Use letters and punctuation only.');

      const sizeText = typeof row.partySize === 'number' ? String(row.partySize) : row.partySize;
      const partySize =
        typeof sizeText === 'string' && /^\s*\d{1,3}\s*$/.test(sizeText) ? Number(sizeText) : NaN;
      if (!(partySize >= 1 && partySize <= GUEST_LIMITS.partySize)) {
        problem('partySize', 'Party size must be a whole number of at least 1.');
      }

      const email = row.email?.trim() ? normalizeEmail(row.email) : undefined;
      if (email && (!isEmail(email) || email.length > GUEST_LIMITS.email)) {
        problem('email', 'Invalid email address.');
      }
      const phone = row.phone?.trim().replace(/\s+/g, ' ') || undefined;
      if (phone && (!isPhone(phone) || phone.length > GUEST_LIMITS.phone)) {
        problem('phone', 'Invalid phone number.');
      }
      const organizerNotes = row.organizerNotes?.trim() || undefined;
      if (organizerNotes && [...organizerNotes].length > GUEST_LIMITS.notes) {
        problem('organizerNotes', `Notes can be ${GUEST_LIMITS.notes} characters at most.`);
      }
      const eventIds: Types.ObjectId[] = [];
      for (const title of row.events ?? []) {
        if (!title.trim()) continue;
        const eventId = eventsByTitle.get(folded(title));
        if (eventId) eventIds.push(new Types.ObjectId(eventId));
        else problem('events', `No ceremony called “${title.trim()}”.`);
      }

      const duplicateOf =
        (email ? byEmail.get(email) : undefined) ?? (name ? byName.get(folded(name)) : undefined);
      // Later rows are compared with earlier ones too.
      if (name && problems.length === 0) {
        if (!byName.has(folded(name))) byName.set(folded(name), name);
        if (email && !byEmail.has(email)) byEmail.set(email, name);
      }
      return {
        index,
        problems,
        ...(duplicateOf ? { duplicateOf } : {}),
        ...(problems.length === 0
          ? {
              guest: {
                name,
                partySize,
                ...(email ? { emailNormalized: email } : {}),
                ...(phone ? { phone } : {}),
                ...(organizerNotes ? { organizerNotes } : {}),
                eventIds: distinctIds(eventIds.map((eventId) => eventId.toHexString())),
              },
            }
          : {}),
      };
    });
  }

  /** New invitations, pending, or ones unselected before brought back with their answer. */
  private async invite(
    weddingId: Types.ObjectId,
    guestId: Types.ObjectId,
    eventIds: readonly Types.ObjectId[],
    userId: Types.ObjectId,
    session: ClientSession,
  ): Promise<void> {
    if (eventIds.length === 0) return;
    const now = new Date();
    await this.invitations.bulkWrite(
      eventIds.map((eventId) => ({
        updateOne: {
          filter: { weddingId, guestId, eventId },
          update: {
            $set: { isInvited: true },
            $setOnInsert: {
              rsvp: { status: 'pending', responseVersion: 0 },
              history: [],
              invitedAt: now,
              invitedBy: userId,
            },
          },
          upsert: true,
        },
      })),
      { session },
    );
  }

  /** New choices must be the wedding's own events, not deleted. */
  private async checkEvents(
    weddingId: Types.ObjectId,
    eventIds: Types.ObjectId[],
    session: ClientSession,
  ): Promise<void> {
    if ((await this.events.countExisting(weddingId, eventIds, session)) !== eventIds.length) {
      throw unknownEvents();
    }
  }

  /** Refuses a party size below an answer for an open ceremony, naming them all. */
  private async checkPartySize(
    guest: StoredGuest,
    partySize: number,
    session: ClientSession,
  ): Promise<void> {
    const over = await this.invitations
      .find(
        {
          weddingId: guest.weddingId,
          guestId: guest._id,
          isInvited: true,
          'rsvp.attendingCount': { $gt: partySize },
        },
        { eventId: 1, rsvp: 1 },
      )
      .session(session)
      .lean();
    if (over.length === 0) return;
    const events = new Map(
      (
        await this.events.briefs(
          guest.weddingId,
          over.map((invitation) => invitation.eventId),
          session,
        )
      ).map((event) => [event.id, event]),
    );
    const conflicts = over.flatMap((invitation) => {
      const event = events.get(invitation.eventId.toHexString());
      // Closed ceremonies can't be answered again, so they can't block the change.
      if (!event || event.deleted || event.cancelled) return [];
      return [
        {
          eventId: event.id,
          title: event.title,
          attendingCount: invitation.rsvp.attendingCount ?? 0,
        },
      ];
    });
    if (conflicts.length > 0) throw partySizeConflict(conflicts);
  }

  /** The active link, created if there is none. */
  private async activeLink(
    weddingId: Types.ObjectId,
    guestId: Types.ObjectId,
    userId: Types.ObjectId,
    session: ClientSession,
  ): Promise<StoredToken> {
    const active = await this.tokens
      .findOne({ weddingId, guestId, status: 'active' })
      .session(session)
      .lean();
    if (active) return active;
    const _id = new Types.ObjectId();
    const [created] = await this.tokens.create(
      [
        {
          _id,
          weddingId,
          guestId,
          tokenHash: this.links.hash(this.links.token(_id)),
          status: 'active',
          createdBy: userId,
        },
      ],
      { session },
    );
    if (!created) throw new Error('The link was not created');
    return created.toObject();
  }

  /** Revokes the guest's active links and every browser session opened with them. */
  private async revokeLinks(
    weddingId: Types.ObjectId,
    guestId: Types.ObjectId,
    now: Date,
    session: ClientSession,
  ): Promise<void> {
    await this.tokens.updateMany(
      { weddingId, guestId, status: 'active' },
      { $set: { status: 'revoked', revokedAt: now } },
      { session },
    );
    await this.sessions.updateMany(
      { weddingId, guestId, revokedAt: null },
      { $set: { revokedAt: now } },
      { session },
    );
  }

  private changeOf(input: UpdateGuestDto): UpdateQuery<GuestContact> {
    const set: Partial<GuestContact> = {};
    const unset: Record<string, 1> = {};
    if (input.name !== undefined) set.name = input.name;
    if (input.partySize !== undefined) set.partySize = input.partySize;
    if (input.email !== undefined) {
      if (input.email) set.emailNormalized = normalizeEmail(input.email);
      else unset.emailNormalized = 1;
    }
    if (input.phone !== undefined) {
      if (input.phone) set.phone = input.phone;
      else unset.phone = 1;
    }
    if (input.organizerNotes !== undefined) {
      if (input.organizerNotes) set.organizerNotes = input.organizerNotes;
      else unset.organizerNotes = 1;
    }
    return { $set: set, ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}) };
  }

  private async findGuest(weddingId: Types.ObjectId, guestId: string): Promise<StoredGuest> {
    const id = parseObjectId(guestId);
    if (!id) throw guestNotFound();
    const guest = await this.guests.findOne({ _id: id, weddingId, ...ACTIVE }).lean();
    if (!guest) throw guestNotFound();
    return guest;
  }

  private async detailOf(guest: StoredGuest): Promise<GuestDetailDto> {
    const [invitations, token, emailStates, site] = await Promise.all([
      this.invitations
        .find({ weddingId: guest.weddingId, guestId: guest._id, isInvited: true })
        .lean(),
      this.tokens
        .findOne({ weddingId: guest.weddingId, guestId: guest._id })
        .sort({ status: 1, createdAt: -1 })
        .lean(),
      this.notifications.states(this.emailIds(guest)),
      this.website.publishedAddress(guest.weddingId),
    ]);
    const known = await this.withDeletedEvents(guest.weddingId, [], invitations);
    const dto = this.toDto(guest, invitations, known, {
      link: token ? this.linkDto(token, site) : { status: 'none' },
      emailState: this.stateOf(emailStates, guest.lastInviteEmailId),
      reminderState: this.stateOf(emailStates, guest.lastReminderId),
    });
    const byId = new Map(
      invitations.map((invitation) => [invitation._id.toHexString(), invitation]),
    );
    return {
      guest: dto,
      invitations: dto.invitations.map((invitation) => ({
        ...invitation,
        history: [...(byId.get(invitation.id)?.history ?? [])].reverse().map((change) => ({
          status: change.status,
          ...(change.attendingCount !== undefined ? { attendingCount: change.attendingCount } : {}),
          at: change.at,
        })),
      })),
    };
  }

  /** Revoked links say so; an active one gives its URL (single guests only). */
  private linkDto(token: StoredToken, site: string | null): GuestLinkDto {
    if (token.status !== 'active') return { status: 'revoked' };
    return {
      status: 'active',
      secretUrl: this.links.url(token._id, site),
      createdAt: token.createdAt,
      ...(token.lastUsedAt ? { lastUsedAt: token.lastUsedAt } : {}),
    };
  }

  /** Whether each guest has an active link, only revoked ones, or none. */
  /** The guest's last invitation and reminder emails, to show what became of them. */
  private emailIds(guest: StoredGuest): Types.ObjectId[] {
    return [guest.lastInviteEmailId, guest.lastReminderId].filter(
      (id): id is Types.ObjectId => id !== undefined,
    );
  }

  private stateOf(
    states: Map<string, NotificationState>,
    id: Types.ObjectId | undefined,
  ): NotificationState | undefined {
    return id ? states.get(id.toHexString()) : undefined;
  }

  private async linkStates(
    weddingId: Types.ObjectId,
    guestIds: Types.ObjectId[],
  ): Promise<Map<string, 'active' | 'revoked'>> {
    const found = await this.tokens
      .find({ weddingId, guestId: { $in: guestIds } }, { guestId: 1, status: 1 })
      .lean();
    const states = new Map<string, 'active' | 'revoked'>();
    for (const token of found) {
      const key = token.guestId.toHexString();
      if (token.status === 'active') states.set(key, 'active');
      else if (!states.has(key)) states.set(key, 'revoked');
    }
    return states;
  }

  /** The events by ID, adding deleted ones that invitations still point at. */
  private async withDeletedEvents(
    weddingId: Types.ObjectId,
    events: EventBrief[],
    invitations: StoredInvitation[],
  ): Promise<Map<string, EventBrief & { order: number }>> {
    const known = new Map(events.map((event, order) => [event.id, { ...event, order }]));
    const missing = [
      ...new Set(
        invitations
          .map((invitation) => invitation.eventId.toHexString())
          .filter((eventId) => !known.has(eventId)),
      ),
    ];
    const more = await this.events.briefs(
      weddingId,
      missing.map((eventId) => new Types.ObjectId(eventId)),
    );
    more.forEach((event, i) => known.set(event.id, { ...event, order: events.length + i }));
    return known;
  }

  private groupByGuest(invitations: StoredInvitation[]): Map<string, StoredInvitation[]> {
    const byGuest = new Map<string, StoredInvitation[]>();
    for (const invitation of invitations) {
      const key = invitation.guestId.toHexString();
      byGuest.set(key, [...(byGuest.get(key) ?? []), invitation]);
    }
    return byGuest;
  }

  /**
   * Totals that never mix contacts, people and answers (PRD GUEST-04):
   * people are counted once across the wedding, and confirmed people per
   * ceremony. Deleted events are left out; cancelled ones are not answered.
   */
  private totalsOf(
    guests: StoredGuest[],
    byGuest: Map<string, StoredInvitation[]>,
    events: EventBrief[],
  ): GuestTotalsDto {
    const perEvent = new Map<string, EventRsvpTotalsDto>(
      events.map((event) => [
        event.id,
        {
          eventId: event.id,
          title: event.title,
          invitedGuests: 0,
          invitedPeople: 0,
          attending: 0,
          notAttending: 0,
          maybe: 0,
          pending: 0,
          confirmedPeople: 0,
        },
      ]),
    );
    const cancelled = new Set(events.filter((event) => event.cancelled).map((event) => event.id));
    let invitedPeople = 0;
    let answered = 0;
    let pending = 0;
    for (const guest of guests) {
      const invitations = (byGuest.get(guest._id.toHexString()) ?? []).filter((invitation) =>
        perEvent.has(invitation.eventId.toHexString()),
      );
      if (invitations.length > 0) invitedPeople += guest.partySize;
      for (const invitation of invitations) {
        const eventId = invitation.eventId.toHexString();
        const totals = perEvent.get(eventId);
        if (!totals) continue;
        totals.invitedGuests += 1;
        totals.invitedPeople += guest.partySize;
        const { status, attendingCount } = invitation.rsvp;
        if (status === 'attending') {
          totals.attending += 1;
          totals.confirmedPeople += attendingCount ?? 0;
        } else if (status === 'not_attending') totals.notAttending += 1;
        else if (status === 'maybe') totals.maybe += 1;
        else totals.pending += 1;
        if (cancelled.has(eventId)) continue;
        if (status === 'pending') pending += 1;
        else answered += 1;
      }
    }
    return {
      contacts: guests.length,
      invitedPeople,
      answered,
      pending,
      events: [...perEvent.values()],
    };
  }

  private toDto(
    guest: StoredGuest,
    invitations: StoredInvitation[],
    events: Map<string, EventBrief & { order: number }>,
    extra: {
      link: GuestLinkDto;
      emailState?: NotificationState;
      reminderState?: NotificationState;
    },
  ): GuestDto {
    const shown: { order: number; invitation: GuestInvitationDto }[] = invitations.flatMap(
      (invitation) => {
        const event = events.get(invitation.eventId.toHexString());
        if (!event) return [];
        return [
          {
            order: event.order,
            invitation: {
              id: invitation._id.toHexString(),
              eventId: event.id,
              title: event.title,
              available: !event.deleted,
              cancelled: event.cancelled,
              rsvp: {
                status: invitation.rsvp.status,
                ...(invitation.rsvp.attendingCount !== undefined
                  ? { attendingCount: invitation.rsvp.attendingCount }
                  : {}),
                ...(invitation.rsvp.respondedAt
                  ? { respondedAt: invitation.rsvp.respondedAt }
                  : {}),
                responseVersion: invitation.rsvp.responseVersion,
              },
            },
          },
        ];
      },
    );
    shown.sort((a, b) => a.order - b.order);
    return {
      id: guest._id.toHexString(),
      name: guest.name,
      partySize: guest.partySize,
      ...(guest.emailNormalized ? { email: guest.emailNormalized } : {}),
      ...(guest.phone ? { phone: guest.phone } : {}),
      ...(guest.organizerNotes ? { organizerNotes: guest.organizerNotes } : {}),
      invitations: shown.map((item) => item.invitation),
      link: extra.link,
      ...(extra.emailState && guest.lastInviteEmailAt
        ? { lastEmail: { state: extra.emailState, requestedAt: guest.lastInviteEmailAt } }
        : {}),
      ...(extra.reminderState && guest.lastReminderAt
        ? { lastReminder: { state: extra.reminderState, requestedAt: guest.lastReminderAt } }
        : {}),
      remindersOff: Boolean(guest.reminderOptOutAt),
      createdAt: guest.createdAt,
      updatedAt: guest.updatedAt,
    };
  }
}
