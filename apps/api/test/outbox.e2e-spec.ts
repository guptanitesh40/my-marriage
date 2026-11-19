import { Injectable, Module } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Types, type Connection, type Model } from 'mongoose';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type {
  ComposedEmail,
  EmailComposer,
  EmailToCompose,
} from '../src/modules/notifications/email-composer.js';
import { EmailDeliveryHandler } from '../src/modules/notifications/email-delivery.handler.js';
import {
  PermanentMailError,
  TransientMailError,
} from '../src/modules/notifications/mail/mail-transport.js';
import { Notification } from '../src/modules/notifications/notification.schema.js';
import { NotificationsModule } from '../src/modules/notifications/notifications.module.js';
import {
  EMAIL_REQUESTED,
  NotificationsService,
} from '../src/modules/notifications/notifications.service.js';
import { OutboxEvent } from '../src/platform/outbox/outbox-event.schema.js';
import { REDIS } from '../src/platform/redis.js';
import { createTestApp } from './support/app.js';
import { createTestWorker, waitFor, type TestWorker } from './support/worker.js';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Redis } from 'ioredis';

/** Writes a fixed email, none for recipients marked "suppress", and fails for "broken". */
@Injectable()
class ProbeComposer implements EmailComposer {
  readonly kinds = ['verify_email'] as const;
  composed = 0;

  compose(email: EmailToCompose): Promise<ComposedEmail | null> {
    this.composed += 1;
    if (email.recipientEmailNormalized.startsWith('suppress')) return Promise.resolve(null);
    if (email.recipientEmailNormalized.startsWith('broken')) {
      return Promise.reject(new Error('database unavailable'));
    }
    return Promise.resolve({ subject: 'Probe', html: '<p>Probe</p>', text: 'Probe' });
  }
}

@Module({ providers: [ProbeComposer], exports: [ProbeComposer] })
class ProbeComposerModule {}

describe('Outbox and email delivery (integration)', () => {
  // The API side writes requests; the worker side sends them.
  let api: NestExpressApplication;
  let worker: TestWorker;
  let connection: Connection;
  let notifications: Model<Notification>;
  let outboxEvents: Model<OutboxEvent>;
  let service: NotificationsService;

  beforeAll(async () => {
    api = await createTestApp();
    // Jobs left in the test Redis database by an earlier run would refer to
    // events that no longer exist.
    await api.get<Redis>(REDIS).flushdb();
    worker = await createTestWorker({
      imports: [ProbeComposerModule],
      composers: [ProbeComposer],
    });
    connection = api.get<Connection>(getConnectionToken());
    notifications = api.get<Model<Notification>>(getModelToken(Notification.name));
    outboxEvents = api.get<Model<OutboxEvent>>(getModelToken(OutboxEvent.name));
    service = api.select(NotificationsModule).get(NotificationsService);
  });

  afterAll(async () => {
    await worker.context.close();
    await api.close();
  });

  beforeEach(async () => {
    await notifications.deleteMany({});
    await outboxEvents.deleteMany({});
    worker.mail.clear();
  });

  afterEach(() => worker.mail.clear());

  async function requestEmail(recipient = 'priya@example.com'): Promise<Types.ObjectId> {
    return connection.transaction((session) =>
      service.requestEmail(session, {
        kind: 'verify_email',
        userId: new Types.ObjectId(),
        recipientEmailNormalized: recipient,
      }),
    );
  }

  function finalState(id: Types.ObjectId, state = 'sent') {
    return waitFor(
      async () => {
        const doc = await notifications.findById(id).lean();
        return doc?.state === state ? doc : undefined;
      },
      { what: `notification ${state}` },
    );
  }

  it('sends a committed email once, and records that the provider accepted it', async () => {
    const id = await requestEmail();
    const notification = await finalState(id);

    expect(worker.mail.sent).toHaveLength(1);
    expect(worker.mail.sent[0]).toMatchObject({
      to: 'priya@example.com',
      subject: 'Probe',
      idempotencyKey: `verify_email:${id.toHexString()}`,
    });
    expect(notification).toMatchObject({
      attempts: 1,
      providerMessageId: expect.any(String) as unknown,
    });
    const event = await outboxEvents.findOne({ aggregateId: id }).lean();
    expect(event).toMatchObject({
      eventType: EMAIL_REQUESTED,
      state: 'published',
      payloadRef: { notificationId: id.toHexString() },
    });
  });

  it('sends nothing when the transaction that asked for the email rolls back', async () => {
    await expect(
      connection.transaction(async (session) => {
        await service.requestEmail(session, {
          kind: 'verify_email',
          userId: new Types.ObjectId(),
          recipientEmailNormalized: 'rolled-back@example.com',
        });
        throw new Error('the change failed');
      }),
    ).rejects.toThrow('the change failed');

    expect(await notifications.countDocuments()).toBe(0);
    expect(await outboxEvents.countDocuments()).toBe(0);
  });

  it('refuses to queue an email outside a transaction', async () => {
    const session = await connection.startSession();
    try {
      await expect(
        service.requestEmail(session, {
          kind: 'verify_email',
          userId: new Types.ObjectId(),
          recipientEmailNormalized: 'priya@example.com',
        }),
      ).rejects.toThrow(/inside the transaction/);
    } finally {
      await session.endSession();
    }
  });

  it('retries after a temporary provider failure', async () => {
    worker.mail.failNext(new TransientMailError('RESEND_INTERNAL_SERVER_ERROR'));
    const id = await requestEmail();
    const notification = await finalState(id);

    expect(worker.mail.sent).toHaveLength(1);
    expect(notification).toMatchObject({
      attempts: 2,
      lastErrorCode: 'RESEND_INTERNAL_SERVER_ERROR',
    });
  });

  it('gives up after the last retry and records why', async () => {
    worker.mail.failNext(
      new TransientMailError('RESEND_UNREACHABLE'),
      new TransientMailError('RESEND_UNREACHABLE'),
      new TransientMailError('RESEND_UNREACHABLE'),
    );
    const id = await requestEmail();
    const notification = await finalState(id, 'failed');

    expect(worker.mail.sent).toHaveLength(0);
    expect(notification).toMatchObject({ attempts: 3, lastErrorCode: 'RESEND_UNREACHABLE' });
  });

  it('records a failure while writing the email, and gives up after the last retry', async () => {
    const id = await requestEmail('broken@example.com');
    const notification = await finalState(id, 'failed');

    expect(worker.mail.sent).toHaveLength(0);
    expect(notification).toMatchObject({ attempts: 3, lastErrorCode: 'UNEXPECTED' });
  });

  it('does not retry an email the provider rejected outright', async () => {
    worker.mail.failNext(new PermanentMailError('RESEND_VALIDATION_ERROR'));
    const id = await requestEmail();
    const notification = await finalState(id, 'failed');

    expect(notification).toMatchObject({ attempts: 1, lastErrorCode: 'RESEND_VALIDATION_ERROR' });
    // Give a wrongly scheduled retry the time to happen.
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(worker.mail.sent).toHaveLength(0);
    expect((await notifications.findById(id).lean())?.attempts).toBe(1);
  });

  it('records an email that is no longer needed as suppressed, without sending it', async () => {
    const id = await requestEmail('suppress@example.com');
    await finalState(id, 'suppressed');
    expect(worker.mail.sent).toHaveLength(0);
  });

  it('is safe to run twice for one email', async () => {
    const id = await requestEmail();
    await finalState(id);
    const event = await outboxEvents.findOne({ aggregateId: id }).lean();
    if (!event) throw new Error('outbox event missing');

    // A second delivery of the same event, as after a stalled job.
    await worker.context.get(EmailDeliveryHandler).handle(
      {
        id: event._id.toHexString(),
        eventType: event.eventType,
        aggregateId: id.toHexString(),
        payloadRef: event.payloadRef,
      },
      { attempt: 1, maxAttempts: 3 },
    );

    expect(worker.mail.sent).toHaveLength(1);
  });

  it('sends each email exactly once when several workers run', async () => {
    const second = await createTestWorker({
      imports: [ProbeComposerModule],
      composers: [ProbeComposer],
    });
    try {
      const ids = await Promise.all(
        Array.from({ length: 20 }, (_, index) => requestEmail(`guest${index}@example.com`)),
      );
      await Promise.all(ids.map((id) => finalState(id)));

      const keys = [...worker.mail.sent, ...second.mail.sent].map((email) => email.idempotencyKey);
      expect(keys).toHaveLength(20);
      expect(new Set(keys).size).toBe(20);
    } finally {
      second.mail.clear();
      await second.context.close();
    }
  });
});
