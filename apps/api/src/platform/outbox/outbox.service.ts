import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { ClientSession, Model, Types } from 'mongoose';
import { OutboxEvent } from './outbox-event.schema.js';
import { Traced } from '../tracing.js';

export interface NewOutboxEvent {
  eventType: string;
  aggregateId: Types.ObjectId;
  payloadRef: Record<string, string>;
}

/** Records side effects for the worker. Used by domain services, in their transactions. */
@Traced()
@Injectable()
export class OutboxService {
  constructor(@InjectModel(OutboxEvent.name) private readonly events: Model<OutboxEvent>) {}

  /**
   * Adds the event to the caller's transaction. Refuses to run outside one:
   * written separately, the event could survive a change that rolled back,
   * or be lost when the change committed.
   */
  async add(session: ClientSession, event: NewOutboxEvent): Promise<void> {
    await this.addMany(session, [event]);
  }

  /** Adds several events in one write, in the caller's transaction. */
  async addMany(session: ClientSession, events: readonly NewOutboxEvent[]): Promise<void> {
    if (!session.inTransaction()) {
      throw new Error('Outbox events must be written inside the transaction of the change');
    }
    if (events.length === 0) return;
    const now = new Date();
    await this.events.insertMany(
      events.map((event) => ({ ...event, state: 'pending', nextAttemptAt: now, attempts: 0 })),
      { session },
    );
  }
}
