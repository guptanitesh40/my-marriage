import { HttpException, Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Types, type Connection, type Model } from 'mongoose';
import { parseObjectId } from '../../platform/mongo.js';
import { RateLimiter } from '../../platform/rate-limit.js';
import { Traced } from '../../platform/tracing.js';
import type { AuthenticatedUser } from '../auth/sessions.service.js';
import { EventsService } from '../events/events.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { WeddingAccessService } from '../weddings/wedding-access.service.js';
import { fieldError, weddingArchived } from '../weddings/wedding-errors.js';
import type {
  ReminderPreviewDto,
  ReminderResultDto,
  ReminderScopeDto,
  ReminderSettingsDto,
  ReminderSkipsDto,
  SendReminderDto,
  UpdateReminderSettingsDto,
} from './dto/reminder.dto.js';
import {
  dailyEmailLimit,
  guestNotFound,
  guestRemindersOff,
  invitationLinkOff,
  invitationNotShared,
  nobodyToRemind,
  noReminderEmail,
  nothingToRemindAbout,
  reminderEventUnavailable,
} from './guest-errors.js';
import {
  GUEST_RATE_LIMITS,
  REMINDER_OFFSETS,
  REMINDER_PREVIEW_NAMES,
  REMINDER_SEND_HOUR,
  type ReminderOffset,
} from './guest-policy.js';
import { dueOffsets, isUpcoming } from './reminder-schedule.js';
import { EventInvitation } from './schemas/event-invitation.schema.js';
import { GuestContact } from './schemas/guest-contact.schema.js';
import { GuestReminder, type ReminderSource } from './schemas/guest-reminder.schema.js';
import { InvitationToken } from './schemas/invitation-token.schema.js';
import { ReminderSettings } from './schemas/reminder-settings.schema.js';

/** Why a guest is left out of a reminder. */
type SkipReason = 'linkOff' | 'notShared' | 'remindersOff' | 'noEmail';

/** One ceremony a guest would be reminded about. */
interface RecipientItem {
  eventId: Types.ObjectId;
  invitationId: Types.ObjectId;
  scheduleVersion: number;
}

interface Recipient {
  guestId: Types.ObjectId;
  email: string;
  /** In the wedding's calendar order. */
  items: RecipientItem[];
}

interface Audience {
  recipients: Recipient[];
  skipped: Record<SkipReason, string[]>;
}

/** What one queued reminder says about where it came from. */
interface ReminderMeta {
  source: ReminderSource;
  note?: string;
  sentBy?: Types.ObjectId;
  offsetDays?: number;
}

const DEFAULT_SETTINGS = { enabled: false, offsetsDays: [...REMINDER_OFFSETS] };

/** MongoDB's duplicate-key error: here, a scheduled reminder that already exists. */
function isDuplicateKey(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

/**
 * Reminder emails to invited guests (PRD INV-07, decision 0016): sent by an
 * organizer to everyone invited or to one guest, about every upcoming
 * ceremony or one; and automatically, 30, 7 and 3 days before each ceremony
 * when the couple switches that on. A reminder follows an invitation: it
 * goes only to guests with an email address and a shared, working link who
 * have not turned reminders off. The email itself is written in the worker
 * (GuestReminderComposer), with the latest details and answers.
 */
@Traced()
@Injectable()
export class GuestRemindersService {
  private readonly logger = new Logger(GuestRemindersService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(GuestContact.name) private readonly guests: Model<GuestContact>,
    @InjectModel(EventInvitation.name) private readonly invitations: Model<EventInvitation>,
    @InjectModel(InvitationToken.name) private readonly tokens: Model<InvitationToken>,
    @InjectModel(GuestReminder.name) private readonly reminders: Model<GuestReminder>,
    @InjectModel(ReminderSettings.name) private readonly settings: Model<ReminderSettings>,
    private readonly access: WeddingAccessService,
    private readonly events: EventsService,
    private readonly notifications: NotificationsService,
    private readonly limiter: RateLimiter,
  ) {}

  /** Who "Remind all" would email, and who is left out and why. Writes nothing. */
  async preview(
    user: AuthenticatedUser,
    weddingId: string,
    scope: ReminderScopeDto,
  ): Promise<ReminderPreviewDto> {
    const { wedding } = await this.access.require(user, weddingId);
    if (wedding.status !== 'active') throw weddingArchived();
    const audience = await this.audience(wedding._id, new Date(), {
      eventIds: await this.scopeOf(wedding._id, scope.eventId),
    });
    return {
      recipients: audience.recipients.length,
      skipped: this.skipsOf(audience),
      emailsLeftToday: await this.limiter.remaining(
        GUEST_RATE_LIMITS.inviteEmailsPerWedding,
        wedding._id.toHexString(),
      ),
    };
  }

  /**
   * Reminds everyone invited (to one ceremony, if given): one email per
   * guest, all queued in one transaction, counted against the wedding's
   * daily email budget, all or none.
   */
  async remindAll(
    user: AuthenticatedUser,
    weddingId: string,
    input: SendReminderDto,
  ): Promise<ReminderResultDto> {
    const { wedding, userId } = await this.access.require(user, weddingId);
    if (wedding.status !== 'active') throw weddingArchived();
    const audience = await this.audience(wedding._id, new Date(), {
      eventIds: await this.scopeOf(wedding._id, input.eventId),
    });
    const count = audience.recipients.length;
    if (count === 0) throw nobodyToRemind();
    await this.spendEmails(wedding._id, count, () =>
      this.queue(wedding._id, audience.recipients, {
        source: 'manual',
        sentBy: userId,
        ...this.noteOf(input),
      }),
    );
    this.logger.log('Reminders queued', { weddingId: wedding._id.toHexString(), count });
    return { queued: count, skipped: this.skipsOf(audience) };
  }

  /** Reminds one guest; says plainly why not when they cannot be reminded. */
  async remindOne(
    user: AuthenticatedUser,
    weddingId: string,
    guestId: string,
    input: SendReminderDto,
  ): Promise<ReminderResultDto> {
    const { wedding, userId } = await this.access.require(user, weddingId);
    if (wedding.status !== 'active') throw weddingArchived();
    const id = parseObjectId(guestId);
    if (!id) throw guestNotFound();
    const exists = await this.guests.exists({ _id: id, weddingId: wedding._id, status: 'active' });
    if (!exists) throw guestNotFound();

    const audience = await this.audience(wedding._id, new Date(), {
      eventIds: await this.scopeOf(wedding._id, input.eventId),
      guestId: id,
    });
    const recipient = audience.recipients[0];
    if (!recipient) {
      if (audience.skipped.linkOff.length > 0) throw invitationLinkOff();
      if (audience.skipped.notShared.length > 0) throw invitationNotShared();
      if (audience.skipped.remindersOff.length > 0) throw guestRemindersOff();
      if (audience.skipped.noEmail.length > 0) throw noReminderEmail();
      throw input.eventId ? reminderEventUnavailable() : nothingToRemindAbout();
    }
    await this.spendEmails(wedding._id, 1, () =>
      this.queue(wedding._id, [recipient], {
        source: 'manual',
        sentBy: userId,
        ...this.noteOf(input),
      }),
    );
    return { queued: 1, skipped: this.skipsOf(audience) };
  }

  /** The wedding's automatic reminders; off until the couple switches them on. */
  async getSettings(user: AuthenticatedUser, weddingId: string): Promise<ReminderSettingsDto> {
    const { wedding } = await this.access.require(user, weddingId);
    const found = await this.settings.findOne({ weddingId: wedding._id }).lean();
    return this.settingsDto(found ?? DEFAULT_SETTINGS);
  }

  async updateSettings(
    user: AuthenticatedUser,
    weddingId: string,
    input: UpdateReminderSettingsDto,
  ): Promise<ReminderSettingsDto> {
    const { wedding, userId } = await this.access.require(user, weddingId);
    if (wedding.status !== 'active') throw weddingArchived();
    const offsetsDays = REMINDER_OFFSETS.filter((offset) =>
      input.reminderOffsetsDays.includes(offset),
    );
    if (input.remindersEnabled && offsetsDays.length === 0) {
      throw fieldError('reminderOffsetsDays', 'Choose at least one day to send reminders.');
    }
    const saved = await this.settings
      .findOneAndUpdate(
        { weddingId: wedding._id },
        { $set: { enabled: input.remindersEnabled, offsetsDays, updatedBy: userId } },
        { upsert: true, returnDocument: 'after' },
      )
      .lean();
    this.logger.log('Reminder settings changed', {
      weddingId: wedding._id.toHexString(),
      enabled: saved.enabled,
      offsetsDays: saved.offsetsDays,
    });
    return this.settingsDto(saved);
  }

  /**
   * The scheduled check (worker, every few minutes): queues each automatic
   * reminder that is due, at most once ever per ceremony, guest, offset and
   * schedule version. One email per guest and offset covers every ceremony
   * due that day. A wedding that fails is logged and the others go on.
   */
  async sendDueReminders(now: Date = new Date()): Promise<{ queued: number }> {
    const enabled = await this.settings.find({ enabled: true }).lean();
    let queued = 0;
    for (const setting of enabled) {
      try {
        queued += await this.dueForWedding(setting.weddingId, setting.offsetsDays, now);
      } catch (error) {
        this.logger.error('Automatic reminders failed for a wedding', {
          weddingId: setting.weddingId.toHexString(),
          error: error instanceof Error ? error.name : 'unknown',
        });
      }
    }
    return { queued };
  }

  private async dueForWedding(
    weddingId: Types.ObjectId,
    offsetsDays: readonly number[],
    now: Date,
  ): Promise<number> {
    const couple = await this.access.coupleOf(weddingId);
    if (!couple?.active) return 0;
    const briefs = await this.events.briefs(weddingId);
    const due = new Map<string, number[]>();
    for (const event of briefs) {
      const offsets = dueOffsets(event, offsetsDays, now);
      if (offsets.length > 0) due.set(event.id, offsets);
    }
    if (due.size === 0) return 0;

    const audience = await this.audience(weddingId, now, {
      eventIds: [...due.keys()].map((id) => new Types.ObjectId(id)),
    });
    let queued = 0;
    for (const recipient of audience.recipients) {
      for (const offset of REMINDER_OFFSETS) {
        const items = recipient.items.filter((item) =>
          due.get(item.eventId.toHexString())?.includes(offset),
        );
        if (items.length === 0) continue;
        const keys = new Map(
          items.map((item) => [
            `${item.invitationId.toHexString()}:${offset}:${item.scheduleVersion}`,
            item,
          ]),
        );
        const sent = await this.reminders
          .find({ scheduleKeys: { $in: [...keys.keys()] } }, { scheduleKeys: 1 })
          .lean();
        for (const reminder of sent)
          for (const key of reminder.scheduleKeys ?? []) keys.delete(key);
        if (keys.size === 0) continue;
        try {
          await this.spendEmails(weddingId, 1, () =>
            this.queue(
              weddingId,
              [{ ...recipient, items: [...keys.values()] }],
              { source: 'automatic', offsetDays: offset },
              [...keys.keys()],
            ),
          );
          queued += 1;
        } catch (error) {
          // Another check queued it first: nothing to do.
          if (isDuplicateKey(error)) continue;
          if (error instanceof HttpException && error.getStatus() === 429) {
            this.logger.warn('Daily email budget reached; reminders wait for the next check', {
              weddingId: weddingId.toHexString(),
            });
            return queued;
          }
          throw error;
        }
      }
    }
    if (queued > 0) {
      this.logger.log('Automatic reminders queued', {
        weddingId: weddingId.toHexString(),
        count: queued,
      });
    }
    return queued;
  }

  /**
   * Everyone invited to the upcoming ceremonies in `eventIds` (all upcoming
   * ones if not given), sorted into who can be reminded and who cannot.
   */
  private async audience(
    weddingId: Types.ObjectId,
    now: Date,
    options: { eventIds?: Types.ObjectId[]; guestId?: Types.ObjectId },
  ): Promise<Audience> {
    const audience: Audience = {
      recipients: [],
      skipped: { linkOff: [], notShared: [], remindersOff: [], noEmail: [] },
    };
    const wanted = options.eventIds?.map((id) => id.toHexString());
    const open = (await this.events.briefs(weddingId)).filter(
      (event) => isUpcoming(event, now) && (!wanted || wanted.includes(event.id)),
    );
    if (open.length === 0) return audience;
    const order = new Map(open.map((event, index) => [event.id, { event, index }]));

    const invitations = await this.invitations
      .find(
        {
          weddingId,
          isInvited: true,
          eventId: { $in: open.map((event) => new Types.ObjectId(event.id)) },
          ...(options.guestId ? { guestId: options.guestId } : {}),
        },
        { guestId: 1, eventId: 1 },
      )
      .lean();
    const byGuest = new Map<string, RecipientItem[]>();
    for (const invitation of invitations) {
      const known = order.get(invitation.eventId.toHexString());
      if (!known) continue;
      const items = byGuest.get(invitation.guestId.toHexString()) ?? [];
      items.push({
        eventId: invitation.eventId,
        invitationId: invitation._id,
        scheduleVersion: known.event.scheduleVersion,
      });
      byGuest.set(invitation.guestId.toHexString(), items);
    }
    if (byGuest.size === 0) return audience;

    const guestIds = [...byGuest.keys()].map((id) => new Types.ObjectId(id));
    const [guests, tokens] = await Promise.all([
      this.guests
        .find(
          { _id: { $in: guestIds }, weddingId, status: 'active' },
          { name: 1, emailNormalized: 1, reminderOptOutAt: 1 },
        )
        .collation({ locale: 'en', strength: 2 })
        .sort({ name: 1, _id: 1 })
        .lean(),
      this.tokens.find({ weddingId, guestId: { $in: guestIds } }, { guestId: 1, status: 1 }).lean(),
    ]);
    const links = new Map<string, 'active' | 'revoked'>();
    for (const token of tokens) {
      const key = token.guestId.toHexString();
      if (token.status === 'active') links.set(key, 'active');
      else if (!links.has(key)) links.set(key, 'revoked');
    }

    const position = (item: RecipientItem) => order.get(item.eventId.toHexString())?.index ?? 0;
    for (const guest of guests) {
      const key = guest._id.toHexString();
      const link = links.get(key);
      const reason: SkipReason | undefined =
        link === 'revoked'
          ? 'linkOff'
          : link === undefined
            ? 'notShared'
            : guest.reminderOptOutAt
              ? 'remindersOff'
              : !guest.emailNormalized
                ? 'noEmail'
                : undefined;
      if (reason || !guest.emailNormalized) {
        audience.skipped[reason ?? 'noEmail'].push(guest.name);
        continue;
      }
      const items = (byGuest.get(key) ?? []).sort((a, b) => position(a) - position(b));
      audience.recipients.push({ guestId: guest._id, email: guest.emailNormalized, items });
    }
    return audience;
  }

  /** The one ceremony asked for, which must be the wedding's and upcoming; or all. */
  private async scopeOf(
    weddingId: Types.ObjectId,
    eventId: string | undefined,
  ): Promise<Types.ObjectId[] | undefined> {
    if (eventId === undefined) return undefined;
    const id = parseObjectId(eventId);
    const [event] = id ? await this.events.briefs(weddingId, [id]) : [];
    if (!id || !event || !isUpcoming(event, new Date())) throw reminderEventUnavailable();
    return [id];
  }

  /**
   * Counts `count` emails against the wedding's daily budget (shared with
   * invitations, to stay inside Gmail's limit) and runs `work`; refuses up
   * front, saying how many are left, rather than sending some.
   */
  private async spendEmails(
    weddingId: Types.ObjectId,
    count: number,
    work: () => Promise<void>,
  ): Promise<void> {
    const rule = GUEST_RATE_LIMITS.inviteEmailsPerWedding;
    const subject = weddingId.toHexString();
    const remaining = await this.limiter.remaining(rule, subject);
    if (count > remaining) throw dailyEmailLimit(remaining);
    try {
      await this.limiter.spend([{ rule, subject, amount: count }], work);
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() === 429) {
        throw dailyEmailLimit(await this.limiter.remaining(rule, subject));
      }
      throw error;
    }
  }

  /**
   * Queues one reminder email per recipient, with its record, in one
   * transaction with the archive write fence. `scheduleKeys` marks an
   * automatic reminder (one recipient), so it can never be queued twice.
   */
  private async queue(
    weddingId: Types.ObjectId,
    recipients: readonly Recipient[],
    meta: ReminderMeta,
    scheduleKeys?: string[],
  ): Promise<void> {
    await this.connection.transaction(async (session) => {
      await this.access.raiseWriteFence(weddingId, session);
      const now = new Date();
      const rows = recipients.map((recipient) => ({ id: new Types.ObjectId(), recipient }));
      await this.reminders.insertMany(
        rows.map(({ id, recipient }) => ({
          weddingId,
          guestId: recipient.guestId,
          notificationId: id,
          source: meta.source,
          items: recipient.items.map((item) => ({
            eventId: item.eventId,
            scheduleVersion: item.scheduleVersion,
          })),
          ...(meta.offsetDays !== undefined ? { offsetDays: meta.offsetDays } : {}),
          ...(scheduleKeys ? { scheduleKeys } : {}),
          ...(meta.note ? { note: meta.note } : {}),
          ...(meta.sentBy ? { sentBy: meta.sentBy } : {}),
        })),
        { session },
      );
      await this.notifications.requestEmails(
        session,
        rows.map(({ id, recipient }) => ({
          id,
          kind: 'guest_reminder',
          weddingId,
          recipientEmailNormalized: recipient.email,
        })),
      );
      await this.guests.bulkWrite(
        rows.map(({ id, recipient }) => ({
          updateOne: {
            filter: { _id: recipient.guestId, weddingId },
            update: { $set: { lastReminderId: id, lastReminderAt: now } },
          },
        })),
        { session },
      );
    });
  }

  private noteOf(input: SendReminderDto): { note?: string } {
    const note = input.note?.trim();
    return note ? { note } : {};
  }

  private skipsOf(audience: Audience): ReminderSkipsDto {
    const of = (names: string[]) => ({
      count: names.length,
      names: names.slice(0, REMINDER_PREVIEW_NAMES),
    });
    return {
      noEmail: of(audience.skipped.noEmail),
      notShared: of(audience.skipped.notShared),
      linkOff: of(audience.skipped.linkOff),
      remindersOff: of(audience.skipped.remindersOff),
    };
  }

  private settingsDto(settings: { enabled: boolean; offsetsDays: number[] }): ReminderSettingsDto {
    return {
      remindersEnabled: settings.enabled,
      reminderOffsetsDays: REMINDER_OFFSETS.filter((offset): offset is ReminderOffset =>
        settings.offsetsDays.includes(offset),
      ),
      sendTime: `${String(REMINDER_SEND_HOUR).padStart(2, '0')}:00`,
    };
  }
}
