import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, type HydratedDocument } from 'mongoose';

export const GUEST_STATUSES = ['active', 'removed'] as const;
export type GuestStatus = (typeof GUEST_STATUSES)[number];

/**
 * One guest contact: the primary person for a family or group (schema
 * document §4.13, PRD GUEST-01 to GUEST-06). `partySize` is stored here once
 * and applies to every ceremony they are invited to. Private: notes and
 * contact details never reach a guest-facing or public response.
 */
@Schema({ collection: 'guest_contacts', timestamps: true })
export class GuestContact {
  @Prop({ type: Types.ObjectId, required: true })
  weddingId: Types.ObjectId;

  /** The primary recipient, e.g. the eldest of the family. */
  @Prop({ type: String, required: true })
  name: string;

  /** Everyone this contact responds for, themselves included: 1 or more. */
  @Prop({ type: Number, required: true })
  partySize: number;

  /** Optional; needed only to send the invitation by email. Not unique. */
  @Prop({ type: String })
  emailNormalized?: string;

  /** Optional; for sharing the link on WhatsApp by hand. */
  @Prop({ type: String })
  phone?: string;

  /** Organizer-only. */
  @Prop({ type: String })
  organizerNotes?: string;

  /** `removed` keeps the record and disables its links (PRD, API `DELETE`). */
  @Prop({ type: String, enum: GUEST_STATUSES, required: true, default: 'active' })
  status: GuestStatus;

  @Prop({ type: Date })
  removedAt?: Date;

  @Prop({ type: Types.ObjectId })
  removedBy?: Types.ObjectId;

  /** The last invitation email asked for, to show what became of it. */
  @Prop({ type: Types.ObjectId })
  lastInviteEmailId?: Types.ObjectId;

  @Prop({ type: Date })
  lastInviteEmailAt?: Date;

  /** The last reminder email asked for, by hand or on schedule. */
  @Prop({ type: Types.ObjectId })
  lastReminderId?: Types.ObjectId;

  @Prop({ type: Date })
  lastReminderAt?: Date;

  /** Set by the guest from their invitation (PRD §5.10 consent): no reminder emails. */
  @Prop({ type: Date })
  reminderOptOutAt?: Date;

  @Prop({ type: Types.ObjectId, required: true })
  createdBy: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export type GuestContactDocument = HydratedDocument<GuestContact>;
export const GuestContactSchema = SchemaFactory.createForClass(GuestContact);

// Schema document §4.13: by name, by email (not unique), by status.
GuestContactSchema.index({ weddingId: 1, name: 1 });
GuestContactSchema.index({ weddingId: 1, emailNormalized: 1 });
GuestContactSchema.index({ weddingId: 1, status: 1 });
