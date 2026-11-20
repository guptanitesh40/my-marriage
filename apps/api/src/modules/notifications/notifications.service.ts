import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, type ClientSession, type Model } from 'mongoose';
import { OutboxService } from '../../platform/outbox/outbox.service.js';
import {
  Notification,
  type NotificationKind,
  type NotificationState,
} from './notification.schema.js';
import { Traced } from '../../platform/tracing.js';

/** Outbox event type handled by EmailDeliveryHandler. */
export const EMAIL_REQUESTED = 'email.requested.v1';

export interface EmailRequest {
  kind: NotificationKind;
  /** The account the email is for; omitted for someone who may not have one yet. */
  userId?: Types.ObjectId;
  /** The wedding the email is about, if any. */
  weddingId?: Types.ObjectId;
  recipientEmailNormalized: string;
}

/** Asking for an email. Used by domain services; sending happens in the worker. */
@Traced()
@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private readonly notifications: Model<Notification>,
    private readonly outbox: OutboxService,
  ) {}

  /**
   * Records the email and its outbox event in the caller's transaction, so it
   * is sent if and only if the change that caused it commits. Returns the
   * notification ID; pass `id` when the caller must store it first.
   *
   * Every call is a new email. A retried transaction cannot queue a copy, as
   * the aborted attempt's writes are discarded; a repeated request (say,
   * pressing Resend twice) is a second email by design, which rate limits
   * bound. The idempotency key stops something else: a retried send of
   * this one email reaching the recipient twice.
   */
  async requestEmail(
    session: ClientSession,
    request: EmailRequest,
    id: Types.ObjectId = new Types.ObjectId(),
  ): Promise<Types.ObjectId> {
    await this.notifications.create(
      [
        {
          _id: id,
          ...request,
          idempotencyKey: `${request.kind}:${id.toHexString()}`,
          state: 'queued',
          attempts: 0,
        },
      ],
      { session },
    );
    await this.outbox.add(session, {
      eventType: EMAIL_REQUESTED,
      aggregateId: id,
      payloadRef: { notificationId: id.toHexString() },
    });
    return id;
  }

  /**
   * Several emails at once, as `requestEmail` but in one write per
   * collection: for sending to a whole guest list in one transaction.
   */
  async requestEmails(
    session: ClientSession,
    requests: readonly (EmailRequest & { id: Types.ObjectId })[],
  ): Promise<void> {
    if (requests.length === 0) return;
    await this.notifications.insertMany(
      requests.map(({ id, ...request }) => ({
        _id: id,
        ...request,
        idempotencyKey: `${request.kind}:${id.toHexString()}`,
        state: 'queued',
        attempts: 0,
      })),
      { session },
    );
    await this.outbox.addMany(
      session,
      requests.map(({ id }) => ({
        eventType: EMAIL_REQUESTED,
        aggregateId: id,
        payloadRef: { notificationId: id.toHexString() },
      })),
    );
  }

  /** What became of each email, by notification ID; missing IDs are left out. */
  async states(ids: readonly Types.ObjectId[]): Promise<Map<string, NotificationState>> {
    if (ids.length === 0) return new Map();
    const found = await this.notifications.find({ _id: { $in: ids } }, { state: 1 }).lean();
    return new Map(
      found.map((notification) => [notification._id.toHexString(), notification.state]),
    );
  }
}
