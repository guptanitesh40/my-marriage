import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { UnrecoverableError } from 'bullmq';
import type { Model } from 'mongoose';
import type { Env } from '../../config/env.js';
import type {
  DeliveryAttempt,
  OutboxEventView,
  OutboxHandler,
} from '../../platform/outbox/outbox-handler.js';
import { EMAIL_COMPOSERS, type EmailComposer } from './email-composer.js';
import {
  MailTransport,
  PermanentMailError,
  TransientMailError,
  type SentEmail,
} from './mail/mail-transport.js';
import {
  FINAL_NOTIFICATION_STATES,
  Notification,
  type NotificationDocument,
} from './notification.schema.js';
import { EMAIL_REQUESTED } from './notifications.service.js';
import { Traced } from '../../platform/tracing.js';

/** Sender for the local transports, which deliver nowhere. */
const LOCAL_SENDER = 'My Marriage <no-reply@localhost>';

/**
 * Sends one requested email (worker only). Safe to run twice: a notification
 * already in a final state is skipped, and the provider deduplicates by the
 * notification's idempotency key.
 */
@Traced()
@Injectable()
export class EmailDeliveryHandler implements OutboxHandler {
  readonly eventTypes = [EMAIL_REQUESTED] as const;
  private readonly logger = new Logger(EmailDeliveryHandler.name);
  private readonly from: string;

  constructor(
    @InjectModel(Notification.name) private readonly notifications: Model<Notification>,
    @Inject(EMAIL_COMPOSERS) private readonly composers: EmailComposer[],
    private readonly transport: MailTransport,
    config: ConfigService<Env, true>,
  ) {
    this.from = config.get('MAIL_FROM', { infer: true }) ?? LOCAL_SENDER;
  }

  async handle(event: OutboxEventView, attempt: DeliveryAttempt): Promise<void> {
    const notification = await this.notifications.findById(event.aggregateId);
    if (!notification) {
      this.logger.warn('Email requested for a missing notification', { outboxEventId: event.id });
      return;
    }
    if (FINAL_NOTIFICATION_STATES.includes(notification.state)) return;

    const composer = this.composers.find((candidate) =>
      candidate.kinds.includes(notification.kind),
    );
    if (!composer) {
      await this.finish(notification, { state: 'failed', lastErrorCode: 'NO_COMPOSER' });
      throw new UnrecoverableError(`No composer for ${notification.kind} emails`);
    }

    await this.notifications.updateOne(
      { _id: notification._id },
      { $set: { state: 'processing' }, $inc: { attempts: 1 } },
    );

    // Everything that can fail after "processing" is inside the try, so the
    // last attempt always leaves the notification failed, never processing.
    let sent: SentEmail | null;
    try {
      const content = await composer.compose({
        notificationId: notification._id.toHexString(),
        kind: notification.kind,
        userId: notification.userId,
        recipientEmailNormalized: notification.recipientEmailNormalized,
        requestedAt: notification.createdAt,
      });
      sent = content
        ? await this.transport.send({
            from: this.from,
            to: notification.recipientEmailNormalized,
            ...content,
            idempotencyKey: notification.idempotencyKey,
          })
        : null;
    } catch (error) {
      const permanent = error instanceof PermanentMailError;
      const code =
        error instanceof PermanentMailError || error instanceof TransientMailError
          ? error.code
          : 'UNEXPECTED';
      const lastTry = permanent || attempt.attempt >= attempt.maxAttempts;
      await this.finish(notification, {
        state: lastTry ? 'failed' : 'queued',
        lastErrorCode: code,
      });
      this.logger.warn('Email not sent', {
        notificationId: notification._id.toHexString(),
        kind: notification.kind,
        code,
        attempt: attempt.attempt,
        final: lastTry,
      });
      if (permanent) throw new UnrecoverableError(code);
      throw error;
    }

    await this.finish(
      notification,
      sent
        ? {
            state: 'sent',
            ...(sent.providerMessageId ? { providerMessageId: sent.providerMessageId } : {}),
          }
        : { state: 'suppressed' },
    );
  }

  private async finish(
    notification: NotificationDocument,
    update: Partial<Pick<Notification, 'state' | 'providerMessageId' | 'lastErrorCode'>>,
  ): Promise<void> {
    await this.notifications.updateOne({ _id: notification._id }, { $set: update });
  }
}
