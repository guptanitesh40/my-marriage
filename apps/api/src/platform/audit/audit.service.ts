import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { ClientSession, Model, Types } from 'mongoose';
import { currentRequestId } from '../request-context.js';
import { Traced } from '../tracing.js';
import { AuditEvent } from './audit-event.schema.js';

/** What a change records; see AuditEvent. */
export interface AuditEntry {
  weddingId?: Types.ObjectId;
  actorUserId?: Types.ObjectId;
  action: string;
  entityType?: string;
  entityId?: Types.ObjectId;
  safeDiff?: Record<string, string | number | boolean | null>;
}

/**
 * Writes audit events, in the transaction of the change they describe, so
 * a change is never kept without its record or recorded without happening.
 */
@Traced()
@Injectable()
export class AuditService {
  constructor(@InjectModel(AuditEvent.name) private readonly events: Model<AuditEvent>) {}

  async record(session: ClientSession, entry: AuditEntry): Promise<void> {
    const requestId = currentRequestId();
    await this.events.create(
      [{ ...entry, ...(requestId ? { requestId } : {}), occurredAt: new Date() }],
      { session },
    );
  }
}
