import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import type { ClientSession, Connection, Model, Types, UpdateQuery } from 'mongoose';
import { parseObjectId } from '../../platform/mongo.js';
import type { AuthenticatedUser } from '../auth/sessions.service.js';
import { WeddingAccessService } from '../weddings/wedding-access.service.js';
import { fieldError, PAST_DATE_MESSAGE, weddingArchived } from '../weddings/wedding-errors.js';
import type { CreateEventDto, EventVenueInputDto } from './dto/create-event.dto.js';
import type { EventDto, EventListDto } from './dto/event.dto.js';
import type { UpdateEventDto } from './dto/update-event.dto.js';
import { eventNotFound } from './event-errors.js';
import { googleMapsUrl, youtubeVideoId, youtubeWatchUrl } from './event-links.js';
import { EVENT_LIST_LIMIT } from './event-policy.js';
import { DEFAULT_EVENT_TIME_ZONE, todayIn, wallClock, zonedInstant } from './event-time.js';
import { WeddingEvent, type EventVenue } from './schemas/event.schema.js';
import { Traced } from '../../platform/tracing.js';

type StoredEvent = WeddingEvent & { _id: Types.ObjectId };

/** Deleted events are kept but never shown (decision 0011). */
const NOT_DELETED = { deletedAt: null } as const;

/** What other modules (guest invitations) need to show an event. */
export interface EventBrief {
  id: string;
  title: string;
  deleted: boolean;
  cancelled: boolean;
  /** Marked as having taken place. */
  completed: boolean;
  /** Raised whenever the day or time changes; reminders are planned against it. */
  scheduleVersion: number;
  /** `YYYY-MM-DD` in the event's time zone. */
  startDate?: string;
  /** `HH:mm` in the event's time zone. */
  startTime?: string;
  timeZone: string;
  venueName?: string;
  venueAddress?: string;
  /** For the wedding website (decision 0017). */
  description?: string;
  mapsUrl?: string;
  dressCode?: string;
  livestreamVideoId?: string;
}

/**
 * A wedding's ceremonies (PRD EVT-01 to EVT-03, EVT-06), for its owners and
 * managers. Every query is scoped to the wedding the access check returned,
 * never to an ID from the request alone, and leaves out deleted events.
 */
@Traced()
@Injectable()
export class EventsService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(WeddingEvent.name) private readonly events: Model<WeddingEvent>,
    private readonly access: WeddingAccessService,
  ) {}

  /**
   * The wedding's events by day, then time, then the order they were added;
   * events without a day come last. Archived weddings stay readable.
   */
  async list(user: AuthenticatedUser, weddingId: string): Promise<EventListDto> {
    const { wedding } = await this.access.require(user, weddingId);
    const order = { startDate: 1, startAt: 1, createdAt: 1 } as const;
    // Two queries, because MongoDB sorts a missing day first.
    const [dated, undated] = await Promise.all([
      this.events
        .find({ weddingId: wedding._id, startDate: { $exists: true }, ...NOT_DELETED })
        .sort(order)
        .limit(EVENT_LIST_LIMIT + 1)
        .lean(),
      this.events
        .find({ weddingId: wedding._id, startDate: { $exists: false }, ...NOT_DELETED })
        .sort({ createdAt: 1 })
        .limit(EVENT_LIST_LIMIT + 1)
        .lean(),
    ]);
    const all = [...dated, ...undated];
    return {
      events: all.slice(0, EVENT_LIST_LIMIT).map((event) => this.toDto(event)),
      truncated: all.length > EVENT_LIST_LIMIT,
    };
  }

  /**
   * Adds a ceremony to an active wedding, with only its name if that is all
   * that is known. The event and the wedding's archive write fence change in
   * one transaction, so nothing is added to a wedding being archived.
   */
  async create(
    user: AuthenticatedUser,
    weddingId: string,
    input: CreateEventDto,
  ): Promise<EventDto> {
    const { wedding } = await this.access.require(user, weddingId);
    if (wedding.status !== 'active') throw weddingArchived();

    const timeZone = input.timeZone ?? DEFAULT_EVENT_TIME_ZONE;
    if (input.startTime && !input.startDate) {
      throw fieldError('startTime', 'Choose the day first, then the time.');
    }
    if (input.startDate && input.startDate < todayIn(timeZone)) {
      throw fieldError('startDate', PAST_DATE_MESSAGE);
    }
    const venue = this.venueOf(input.venue);

    const record: Omit<WeddingEvent, 'createdAt' | 'updatedAt'> = {
      weddingId: wedding._id,
      title: input.title,
      ...(input.description ? { description: input.description } : {}),
      ...(input.startDate ? { startDate: new Date(`${input.startDate}T00:00:00Z`) } : {}),
      ...(input.startDate && input.startTime
        ? { startAt: zonedInstant(input.startDate, input.startTime, timeZone) }
        : {}),
      timeZone,
      ...(venue ? { venue } : {}),
      ...(input.dressCode ? { dressCode: input.dressCode } : {}),
      ...this.livestreamOf(input.livestreamUrl),
      state: 'scheduled',
      managerIds: [],
      scheduleVersion: 0,
    };

    const created = await this.connection.transaction(async (session) => {
      await this.access.raiseWriteFence(wedding._id, session);
      const [event] = await this.events.create([record], { session });
      return event;
    });
    if (!created) throw new Error('The event was not created');
    return this.toDto(created.toObject());
  }

  /**
   * Changes a ceremony of an active wedding. The event is read and written
   * in one transaction with the archive write fence, so two edits at once
   * cannot both work from the same old version: one is retried and sees
   * the other.
   */
  async update(
    user: AuthenticatedUser,
    weddingId: string,
    eventId: string,
    input: UpdateEventDto,
  ): Promise<EventDto> {
    const { wedding } = await this.access.require(user, weddingId);
    if (wedding.status !== 'active') throw weddingArchived();
    const id = parseObjectId(eventId);
    if (!id) throw eventNotFound();
    const filter = { _id: id, weddingId: wedding._id, ...NOT_DELETED };

    const updated = await this.connection.transaction(async (session) => {
      const event = await this.events.findOne(filter).session(session).lean();
      if (!event) throw eventNotFound();
      const change = this.changeOf(event, input);
      await this.access.raiseWriteFence(wedding._id, session);
      return this.events
        .findOneAndUpdate(filter, change, { returnDocument: 'after', session })
        .lean();
    });
    if (!updated) throw eventNotFound();
    return this.toDto(updated);
  }

  /**
   * Deletes a ceremony: owners only (PRD: managers have no delete actions).
   * The record is kept and marked, so whatever refers to it keeps its
   * history; it no longer appears anywhere.
   */
  async remove(user: AuthenticatedUser, weddingId: string, eventId: string): Promise<void> {
    const { wedding, userId } = await this.access.require(user, weddingId, ['owner']);
    if (wedding.status !== 'active') throw weddingArchived();
    const id = parseObjectId(eventId);
    if (!id) throw eventNotFound();

    await this.connection.transaction(async (session) => {
      await this.access.raiseWriteFence(wedding._id, session);
      const deleted = await this.events.updateOne(
        { _id: id, weddingId: wedding._id, ...NOT_DELETED },
        { $set: { deletedAt: new Date(), deletedBy: userId } },
        { session },
      );
      if (deleted.matchedCount === 0) throw eventNotFound();
    });
  }

  /**
   * The update that applies `input` to `event`. The day and time keep their
   * clock reading: changing the zone alone moves the instant, as the
   * ceremony is still at, say, 10:00 where it happens.
   */
  private changeOf(event: StoredEvent, input: UpdateEventDto): UpdateQuery<WeddingEvent> {
    const timeZone = input.timeZone ?? event.timeZone;
    const storedDay = event.startDate?.toISOString().slice(0, 10);
    const storedTime = event.startAt ? wallClock(event.startAt, event.timeZone).time : undefined;
    const day = input.startDate === undefined ? storedDay : (input.startDate ?? undefined);
    // Removing the day removes the time, which means nothing without it.
    const time =
      input.startTime !== undefined
        ? (input.startTime ?? undefined)
        : input.startDate === null
          ? undefined
          : storedTime;
    if (time && !day) throw fieldError('startTime', 'Choose the day first, then the time.');
    if (input.startDate && input.startDate !== storedDay && input.startDate < todayIn(timeZone)) {
      throw fieldError('startDate', PAST_DATE_MESSAGE);
    }
    const startAt = day && time ? zonedInstant(day, time, timeZone) : undefined;
    const state = input.state ?? event.state;

    const set: Partial<WeddingEvent> = { timeZone, state };
    const unset: Record<string, 1> = {};
    if (input.title !== undefined) set.title = input.title;
    if (input.description !== undefined) {
      if (input.description) set.description = input.description;
      else unset.description = 1;
    }
    if (input.venue !== undefined) {
      const venue = this.venueOf(input.venue ?? undefined);
      if (venue) set.venue = venue;
      else unset.venue = 1;
    }
    if (input.dressCode !== undefined) {
      if (input.dressCode) set.dressCode = input.dressCode;
      else unset.dressCode = 1;
    }
    if (input.livestreamUrl !== undefined) {
      const livestream = this.livestreamOf(input.livestreamUrl).livestream;
      if (livestream) set.livestream = livestream;
      else unset.livestream = 1;
    }
    if (day) set.startDate = new Date(`${day}T00:00:00Z`);
    else unset.startDate = 1;
    if (startAt) set.startAt = startAt;
    else unset.startAt = 1;

    // Reminders follow the day, the time and the state (schema document §4.07).
    const rescheduled =
      day !== storedDay || startAt?.getTime() !== event.startAt?.getTime() || state !== event.state;
    return {
      $set: set,
      ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}),
      ...(rescheduled ? { $inc: { scheduleVersion: 1 } } : {}),
    };
  }

  /**
   * The wedding's events by ID, with their names, for other modules
   * (tasks link to events). Deleted events are left out.
   */
  async titles(weddingId: Types.ObjectId): Promise<Map<string, string>> {
    const events = await this.events
      .find({ weddingId, ...NOT_DELETED }, { title: 1, startDate: 1, startAt: 1, createdAt: 1 })
      .lean();
    // In the list's order, so whatever shows several events shows them as the Events page does.
    const time = (date?: Date) => date?.getTime() ?? Number.POSITIVE_INFINITY;
    events.sort(
      (a, b) =>
        time(a.startDate) - time(b.startDate) ||
        time(a.startAt) - time(b.startAt) ||
        a.createdAt.getTime() - b.createdAt.getTime(),
    );
    return new Map(events.map((event) => [event._id.toHexString(), event.title]));
  }

  /**
   * The names of some of the wedding's events, including deleted ones, so
   * records that point at them (expenses) keep their history (PRD EXP-05).
   */
  async labels(
    weddingId: Types.ObjectId,
    eventIds: readonly Types.ObjectId[],
  ): Promise<Map<string, { title: string; deleted: boolean }>> {
    if (eventIds.length === 0) return new Map();
    const events = await this.events
      .find(
        { _id: { $in: eventIds }, weddingId },
        { title: 1, deletedAt: 1, startDate: 1, startAt: 1, createdAt: 1 },
      )
      .lean();
    // In the Events page's order, as titles() is.
    const time = (date?: Date) => date?.getTime() ?? Number.POSITIVE_INFINITY;
    events.sort(
      (a, b) =>
        time(a.startDate) - time(b.startDate) ||
        time(a.startAt) - time(b.startAt) ||
        a.createdAt.getTime() - b.createdAt.getTime(),
    );
    return new Map(
      events.map((event) => [
        event._id.toHexString(),
        { title: event.title, deleted: Boolean(event.deletedAt) },
      ]),
    );
  }

  /**
   * Details of the wedding's events for guests' invitations, in the Events
   * page's order: all of them, or those in `eventIds` (deleted ones too, so
   * a guest's history can still name them). Read in the caller's
   * transaction when one is given.
   */
  async briefs(
    weddingId: Types.ObjectId,
    eventIds?: readonly Types.ObjectId[],
    session?: ClientSession,
  ): Promise<EventBrief[]> {
    if (eventIds && eventIds.length === 0) return [];
    const events = await this.events
      .find(eventIds ? { _id: { $in: eventIds }, weddingId } : { weddingId, ...NOT_DELETED })
      .session(session ?? null)
      .lean();
    const time = (date?: Date) => date?.getTime() ?? Number.POSITIVE_INFINITY;
    events.sort(
      (a, b) =>
        time(a.startDate) - time(b.startDate) ||
        time(a.startAt) - time(b.startAt) ||
        a.createdAt.getTime() - b.createdAt.getTime(),
    );
    return events.map((event) => ({
      id: event._id.toHexString(),
      title: event.title,
      deleted: Boolean(event.deletedAt),
      cancelled: event.state === 'cancelled',
      completed: event.state === 'completed',
      scheduleVersion: event.scheduleVersion,
      ...(event.startDate ? { startDate: event.startDate.toISOString().slice(0, 10) } : {}),
      ...(event.startAt ? { startTime: wallClock(event.startAt, event.timeZone).time } : {}),
      timeZone: event.timeZone,
      ...(event.venue?.name ? { venueName: event.venue.name } : {}),
      ...(event.venue?.address ? { venueAddress: event.venue.address } : {}),
      ...(event.description ? { description: event.description } : {}),
      ...(event.venue?.mapsUrl ? { mapsUrl: event.venue.mapsUrl } : {}),
      ...(event.dressCode ? { dressCode: event.dressCode } : {}),
      ...(event.livestream ? { livestreamVideoId: event.livestream.videoId } : {}),
    }));
  }

  /**
   * How many of `eventIds` are the wedding's own events, not deleted, read
   * in the caller's transaction.
   */
  async countExisting(
    weddingId: Types.ObjectId,
    eventIds: Types.ObjectId[],
    session: ClientSession,
  ): Promise<number> {
    if (eventIds.length === 0) return 0;
    return this.events
      .countDocuments({ _id: { $in: eventIds }, weddingId, ...NOT_DELETED })
      .session(session);
  }

  /**
   * Whether an event belongs to the wedding and is not deleted, read in the
   * caller's transaction when one is given.
   */
  async exists(
    weddingId: Types.ObjectId,
    eventId: Types.ObjectId,
    session?: ClientSession,
  ): Promise<boolean> {
    const event = await this.events
      .findOne({ _id: eventId, weddingId, ...NOT_DELETED }, { _id: 1 })
      .session(session ?? null)
      .lean();
    return event !== null;
  }

  /** The venue's known parts, or nothing when neither is given. */
  private venueOf(input: EventVenueInputDto | undefined): EventVenue | undefined {
    if (!input) return undefined;
    const mapsUrl = input.mapsUrl ? googleMapsUrl(input.mapsUrl) : null;
    if (!input.name && !input.address && !mapsUrl) return undefined;
    return {
      ...(input.name ? { name: input.name } : {}),
      ...(input.address ? { address: input.address } : {}),
      ...(mapsUrl ? { mapsUrl } : {}),
    };
  }

  /** The stored livestream for a YouTube link; nothing for an empty or missing one. */
  private livestreamOf(url: string | null | undefined): Pick<WeddingEvent, 'livestream'> {
    const videoId = url ? youtubeVideoId(url) : null;
    return videoId ? { livestream: { provider: 'youtube', videoId } } : {};
  }

  private toDto(event: StoredEvent): EventDto {
    const venue =
      event.venue?.name || event.venue?.address || event.venue?.mapsUrl ? event.venue : undefined;
    return {
      id: event._id.toHexString(),
      title: event.title,
      ...(event.description ? { description: event.description } : {}),
      ...(event.startDate ? { startDate: event.startDate.toISOString().slice(0, 10) } : {}),
      ...(event.startAt
        ? { startTime: wallClock(event.startAt, event.timeZone).time, startAt: event.startAt }
        : {}),
      timeZone: event.timeZone,
      ...(venue
        ? {
            venue: {
              ...(venue.name ? { name: venue.name } : {}),
              ...(venue.address ? { address: venue.address } : {}),
              ...(venue.mapsUrl ? { mapsUrl: venue.mapsUrl } : {}),
            },
          }
        : {}),
      ...(event.dressCode ? { dressCode: event.dressCode } : {}),
      ...(event.livestream
        ? {
            livestream: {
              provider: event.livestream.provider,
              videoId: event.livestream.videoId,
              url: youtubeWatchUrl(event.livestream.videoId),
            },
          }
        : {}),
      state: event.state,
      createdAt: event.createdAt,
    };
  }
}
