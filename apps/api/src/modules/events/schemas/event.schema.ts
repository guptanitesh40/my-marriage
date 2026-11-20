import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, type HydratedDocument } from 'mongoose';

export const EVENT_STATES = ['scheduled', 'completed', 'cancelled'] as const;
export type EventState = (typeof EVENT_STATES)[number];

/** Where a ceremony happens; either part may be missing while planning. */
@Schema({ _id: false })
export class EventVenue {
  @Prop({ type: String })
  name?: string;

  @Prop({ type: String })
  address?: string;

  /** A Google Maps link for directions, checked on the way in (event-links.ts). */
  @Prop({ type: String })
  mapsUrl?: string;
}
const EventVenueSchema = SchemaFactory.createForClass(EventVenue);

/**
 * A ceremony of a wedding (schema document §4.07). Named WeddingEvent so
 * it is never confused with the DOM's Event. Never returned from a
 * controller; see EventDto.
 *
 * `startDate` is an addition to the schema document (decision 0010): the
 * day is often known before the time, and `startAt` is an instant, which a
 * day alone is not. `startAt` is set only once the time is known too.
 *
 * Deleting an event only marks it (`deletedAt`): the PRD keeps what was
 * linked to a removed event rather than orphaning it.
 *
 * The dress code, maps link and livestream arrived with the wedding
 * website (decision 0017); the end time comes with its feature.
 */
@Schema({ collection: 'events', timestamps: true })
export class WeddingEvent {
  @Prop({ type: Types.ObjectId, required: true })
  weddingId: Types.ObjectId;

  @Prop({ type: String, required: true })
  title: string;

  /** Public once the website is published (schema document §4.07). */
  @Prop({ type: String })
  description?: string;

  /** The local calendar day in `timeZone`, stored as midnight UTC, like a wedding's date. */
  @Prop({ type: Date })
  startDate?: Date;

  /** The start instant, set only when both the day and the time are known. */
  @Prop({ type: Date })
  startAt?: Date;

  /** IANA zone the day and time are read in; Asia/Kolkata unless chosen. */
  @Prop({ type: String, required: true })
  timeZone: string;

  @Prop({ type: EventVenueSchema })
  venue?: EventVenue;

  /** Suggested attire, shown to guests. */
  @Prop({ type: String })
  dressCode?: string;

  /** A YouTube livestream (PRD LIVE-01): only the video ID is kept. */
  @Prop({
    type: { provider: { type: String, required: true }, videoId: { type: String, required: true } },
    _id: false,
  })
  livestream?: { provider: 'youtube'; videoId: string };

  @Prop({ type: String, enum: EVENT_STATES, required: true })
  state: EventState;

  /** Members who look after this ceremony; assigned in a later milestone. */
  @Prop({ type: [Types.ObjectId], required: true })
  managerIds: Types.ObjectId[];

  /** Raised by changes that affect reminders (schema document §4.07). */
  @Prop({ type: Number, required: true, min: 0 })
  scheduleVersion: number;

  /**
   * Set when an owner deletes the event (decision 0011). The record stays,
   * so what refers to it (expenses, tasks, invitations) keeps its history;
   * every organizer and public read leaves it out.
   */
  @Prop({ type: Date })
  deletedAt?: Date;

  /** The owner who deleted it. */
  @Prop({ type: Types.ObjectId })
  deletedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export type WeddingEventDocument = HydratedDocument<WeddingEvent>;
export const WeddingEventSchema = SchemaFactory.createForClass(WeddingEvent);

// Schema document §4.07.
WeddingEventSchema.index({ weddingId: 1, startAt: 1 });
WeddingEventSchema.index({ weddingId: 1, state: 1 });
// The organizer's list, in date order (decision 0010).
WeddingEventSchema.index({ weddingId: 1, startDate: 1, startAt: 1, createdAt: 1 });
