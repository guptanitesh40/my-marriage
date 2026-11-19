import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, type HydratedDocument } from 'mongoose';

export const OUTBOX_STATES = ['pending', 'claimed', 'published', 'failed'] as const;
export type OutboxState = (typeof OUTBOX_STATES)[number];

/**
 * A side effect promised in the same transaction as the change that caused it
 * (schema document §4.26): the relay hands it to BullMQ after the commit, so
 * an email is never lost when the process dies, nor sent for a change that
 * was rolled back.
 */
@Schema({ collection: 'outbox_events', timestamps: { createdAt: true, updatedAt: false } })
export class OutboxEvent {
  /** Versioned name of what happened, e.g. `email.requested.v1`. */
  @Prop({ type: String, required: true })
  eventType: string;

  /** The record the event is about, e.g. a notification. */
  @Prop({ type: Types.ObjectId, required: true })
  aggregateId: Types.ObjectId;

  /** Identifiers only — never a secret, token or personal data. */
  @Prop({ type: Object, required: true })
  payloadRef: Record<string, string>;

  @Prop({ type: String, enum: OUTBOX_STATES, required: true, default: 'pending' })
  state: OutboxState;

  /**
   * When the relay may next pick this event up. While `claimed`, it is the
   * end of the claim: a relay that crashed mid-publish loses its claim then.
   */
  @Prop({ type: Date, required: true })
  nextAttemptAt: Date;

  /** How many times a relay has claimed this event. */
  @Prop({ type: Number, required: true, default: 0 })
  attempts: number;

  @Prop({ type: Date })
  publishedAt?: Date;

  createdAt: Date;
}

export type OutboxEventDocument = HydratedDocument<OutboxEvent>;
export const OutboxEventSchema = SchemaFactory.createForClass(OutboxEvent);
OutboxEventSchema.index({ state: 1, nextAttemptAt: 1 });
