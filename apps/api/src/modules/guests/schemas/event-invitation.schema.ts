import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, type HydratedDocument } from 'mongoose';

export const RSVP_STATUSES = ['pending', 'attending', 'not_attending', 'maybe'] as const;
export type RsvpStatus = (typeof RSVP_STATUSES)[number];

/** The current answer for one ceremony. */
export class Rsvp {
  status: RsvpStatus;

  /** Attending: 1 to the guest's party size; not attending: 0; maybe: optional; pending: none. */
  attendingCount?: number;

  respondedAt?: Date;

  /** Raised on every change; a guest's save must name the version it saw (PRD INV-04). */
  responseVersion: number;
}

/** One earlier answer, kept so organizers can see how it changed (PRD INV-04). */
export class RsvpChange {
  status: RsvpStatus;

  attendingCount?: number;

  at: Date;
}

/** How many earlier answers each invitation keeps. */
export const RSVP_HISTORY_LIMIT = 20;

/**
 * A guest's invitation to one ceremony, with its RSVP (schema document
 * §4.14, PRD INV-01 to INV-05). One per guest and event; unselecting the
 * event sets `isInvited` false and keeps the answer, so selecting it again
 * brings it back.
 */
@Schema({ collection: 'event_invitations', timestamps: true })
export class EventInvitation {
  @Prop({ type: Types.ObjectId, required: true })
  weddingId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  guestId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  eventId: Types.ObjectId;

  @Prop({ type: Boolean, required: true })
  isInvited: boolean;

  @Prop({
    type: {
      status: { type: String, required: true },
      attendingCount: { type: Number },
      respondedAt: { type: Date },
      responseVersion: { type: Number, required: true },
    },
    _id: false,
    required: true,
  })
  rsvp: Rsvp;

  /** Earlier answers, newest last, at most RSVP_HISTORY_LIMIT. */
  @Prop({
    type: [
      {
        status: { type: String, required: true },
        attendingCount: { type: Number },
        at: { type: Date, required: true },
        _id: false,
      },
    ],
    default: [],
  })
  history: RsvpChange[];

  @Prop({ type: Date, required: true })
  invitedAt: Date;

  @Prop({ type: Types.ObjectId, required: true })
  invitedBy: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export type EventInvitationDocument = HydratedDocument<EventInvitation>;
export const EventInvitationSchema = SchemaFactory.createForClass(EventInvitation);

// Schema document §4.14.
EventInvitationSchema.index({ weddingId: 1, guestId: 1, eventId: 1 }, { unique: true });
EventInvitationSchema.index({ weddingId: 1, eventId: 1, isInvited: 1, 'rsvp.status': 1 });
EventInvitationSchema.index({ weddingId: 1, guestId: 1 });
