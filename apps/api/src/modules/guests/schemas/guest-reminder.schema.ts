import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, type HydratedDocument } from 'mongoose';

export const REMINDER_SOURCES = ['manual', 'automatic'] as const;
export type ReminderSource = (typeof REMINDER_SOURCES)[number];

/** One ceremony a reminder is about, at the schedule it was planned against. */
export class ReminderItem {
  eventId: Types.ObjectId;
  scheduleVersion: number;
}

/**
 * One reminder email to one guest (PRD INV-07, decision 0016): which
 * ceremonies it is about, the couple's optional note, and whether an
 * organizer sent it or the schedule did. The worker writes the email from
 * this record just before sending, with each ceremony's latest details and
 * answer. Never shown to the guest as a record.
 */
@Schema({ collection: 'guest_reminders', timestamps: { createdAt: true, updatedAt: false } })
export class GuestReminder {
  @Prop({ type: Types.ObjectId, required: true })
  weddingId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  guestId: Types.ObjectId;

  /** The email; one reminder record per email. */
  @Prop({ type: Types.ObjectId, required: true })
  notificationId: Types.ObjectId;

  @Prop({ type: String, enum: REMINDER_SOURCES, required: true })
  source: ReminderSource;

  @Prop({
    type: [
      {
        eventId: { type: Types.ObjectId, required: true },
        scheduleVersion: { type: Number, required: true },
        _id: false,
      },
    ],
    required: true,
  })
  items: ReminderItem[];

  /** Automatic: days before the ceremony (30, 7 or 3). */
  @Prop({ type: Number })
  offsetDays?: number;

  /**
   * Automatic: `invitationId:offset:scheduleVersion` for each ceremony. A
   * unique index makes each scheduled reminder happen at most once, however
   * often the schedule check runs; a changed date is a new schedule.
   */
  @Prop({ type: [String], default: undefined })
  scheduleKeys?: string[];

  /** Manual: the couple's note, plain text. */
  @Prop({ type: String })
  note?: string;

  /** Manual: the organizer who sent it. */
  @Prop({ type: Types.ObjectId })
  sentBy?: Types.ObjectId;

  createdAt: Date;
}

export type GuestReminderDocument = HydratedDocument<GuestReminder>;
export const GuestReminderSchema = SchemaFactory.createForClass(GuestReminder);
GuestReminderSchema.index({ notificationId: 1 }, { unique: true });
GuestReminderSchema.index(
  { scheduleKeys: 1 },
  { unique: true, partialFilterExpression: { scheduleKeys: { $exists: true } } },
);
GuestReminderSchema.index({ weddingId: 1, guestId: 1, createdAt: -1 });
