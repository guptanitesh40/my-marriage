import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, type HydratedDocument } from 'mongoose';

/**
 * One sensitive change, kept for good (schema document §4.27, PRD TEAM-05):
 * who did what to which record, when. Append-only: never updated or deleted,
 * and no TTL. `safeDiff` holds allowlisted values only, never a secret,
 * token, email body or full personal record.
 */
@Schema({ collection: 'audit_events', timestamps: { createdAt: true, updatedAt: false } })
export class AuditEvent {
  /** The wedding it happened in; absent for an account-level change. */
  @Prop({ type: Types.ObjectId })
  weddingId?: Types.ObjectId;

  /** Who did it; absent when a job did. */
  @Prop({ type: Types.ObjectId })
  actorUserId?: Types.ObjectId;

  /** What happened, e.g. `member.removed`. */
  @Prop({ type: String, required: true })
  action: string;

  /** The record it happened to, e.g. `membership` and the member's user ID. */
  @Prop({ type: String })
  entityType?: string;

  @Prop({ type: Types.ObjectId })
  entityId?: Types.ObjectId;

  @Prop({ type: Object })
  safeDiff?: Record<string, string | number | boolean | null>;

  @Prop({ type: String })
  requestId?: string;

  @Prop({ type: Date, required: true })
  occurredAt: Date;

  createdAt: Date;
}

export type AuditEventDocument = HydratedDocument<AuditEvent>;
export const AuditEventSchema = SchemaFactory.createForClass(AuditEvent);
AuditEventSchema.index({ weddingId: 1, occurredAt: -1 });
AuditEventSchema.index({ actorUserId: 1, occurredAt: -1 });
