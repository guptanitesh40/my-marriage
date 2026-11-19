import { getModelToken } from '@nestjs/mongoose';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Model } from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AuthEmailComposer } from '../src/modules/auth/auth-email.composer.js';
import { AuthModule } from '../src/modules/auth/auth.module.js';
import { AuthActionToken } from '../src/modules/auth/schemas/auth-action-token.schema.js';
import { User } from '../src/modules/auth/schemas/user.schema.js';
import { Notification } from '../src/modules/notifications/notification.schema.js';
import { OutboxEvent } from '../src/platform/outbox/outbox-event.schema.js';
import { createTestApp } from './support/app.js';
import { resetRateLimits, settle, signup, tokenFromEmail, uniqueEmail } from './support/auth.js';
import { createTestWorker, waitFor, type TestWorker } from './support/worker.js';

describe('Email verification (integration)', () => {
  let app: NestExpressApplication;
  let worker: TestWorker;
  let users: Model<User>;
  let tokens: Model<AuthActionToken>;
  let notifications: Model<Notification>;
  let outboxEvents: Model<OutboxEvent>;

  beforeAll(async () => {
    app = await createTestApp();
    worker = await createTestWorker({ imports: [AuthModule], composers: [AuthEmailComposer] });
    users = app.get<Model<User>>(getModelToken(User.name));
    tokens = app.get<Model<AuthActionToken>>(getModelToken(AuthActionToken.name));
    notifications = app.get<Model<Notification>>(getModelToken(Notification.name));
    outboxEvents = app.get<Model<OutboxEvent>>(getModelToken(OutboxEvent.name));
  });

  afterAll(async () => {
    await worker.context.close();
    await app.close();
  });

  beforeEach(() => resetRateLimits(app));

  /** Every email the worker sent to `address`, oldest first, once there are `count`. */
  function emailsTo(address: string, count = 1) {
    return waitFor(
      () => {
        const found = worker.mail.sent.filter((email) => email.to === address);
        return found.length >= count ? found : undefined;
      },
      { what: `${count} email(s) to ${address}` },
    );
  }

  function verify(token: string) {
    return request(app.getHttpServer()).post('/api/v1/auth/verify-email').send({ token });
  }

  function resend(email: string) {
    return request(app.getHttpServer()).post('/api/v1/auth/verification/resend').send({ email });
  }

  it('emails a single-use link, stored only as a hash, that verifies the address', async () => {
    const { body, cookie } = await signup(app);
    const [email] = await emailsTo(body.email);
    expect(email).toMatchObject({ subject: 'Verify your email for My Marriage' });
    expect(email?.text).toMatch(/http:\/\/localhost:3000\/verify-email#token=[A-Za-z0-9_-]{43}/);
    const token = tokenFromEmail(email);

    // The secret appears nowhere in the database: not in the token record,
    // the notification or the outbox event.
    const user = await users.findOne({ emailNormalized: body.email }).lean();
    const stored = JSON.stringify([
      await tokens.find({ userId: user?._id }).lean(),
      await notifications.find({ userId: user?._id }).lean(),
      await outboxEvents.find({}).lean(),
    ]);
    expect(stored).not.toContain(token);

    await verify(token).expect(204);

    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', cookie ?? '')
      .expect(200);
    expect(me.body).toMatchObject({ data: { emailVerified: true } });
  });

  it('accepts the same link again, so a mail scanner opening it first does no harm', async () => {
    const { body } = await signup(app);
    const token = tokenFromEmail((await emailsTo(body.email))[0]);
    await verify(token).expect(204);
    await verify(token).expect(204);
  });

  it('refuses an expired, unknown or malformed link', async () => {
    const { body } = await signup(app);
    const token = tokenFromEmail((await emailsTo(body.email))[0]);
    const user = await users.findOne({ emailNormalized: body.email }).lean();
    // Expired, though MongoDB's TTL cleanup has not removed it yet.
    await tokens.updateMany(
      { userId: user?._id },
      { $set: { expiresAt: new Date(Date.now() - 1) } },
    );

    const expired = await verify(token).expect(410);
    expect(expired.body).toMatchObject({ error: { code: 'TOKEN_INVALID' } });
    await verify('Xk29abcdefghijklmnopqrstuvwxyz0123456789_-A').expect(410);
    await verify('not a token').expect(400);
    expect((await users.findById(user?._id).lean())?.verifiedAt).toBeUndefined();
  });

  it('sends a new link on request, and the old one stops working', async () => {
    const { body } = await signup(app);
    const first = tokenFromEmail((await emailsTo(body.email))[0]);
    // The signup email used up this minute's allowance.
    await resetRateLimits(app);

    await resend(body.email).expect(202);
    const second = tokenFromEmail((await emailsTo(body.email, 2))[1]);
    expect(second).not.toBe(first);

    await verify(first).expect(410);
    await verify(second).expect(204);
  });

  it('answers every resend the same way, and sends only when it should', async () => {
    const { body } = await signup(app);
    await emailsTo(body.email);
    const unknown = uniqueEmail('nobody');

    // Straight after signup (limit), for an unknown address, and twice in a row.
    for (const address of [body.email, unknown]) {
      const res = await resend(address).expect(202);
      expect(res.text).toBe('');
    }
    await settle(app);
    expect(await notifications.countDocuments({ recipientEmailNormalized: body.email })).toBe(1);
    expect(await notifications.countDocuments({ recipientEmailNormalized: unknown })).toBe(0);
  });

  it('sends nothing to an address that is already verified', async () => {
    const { body } = await signup(app);
    await verify(tokenFromEmail((await emailsTo(body.email))[0])).expect(204);
    await resetRateLimits(app);

    await resend(body.email).expect(202);
    await settle(app);
    expect(await notifications.countDocuments({ recipientEmailNormalized: body.email })).toBe(1);
  });

  it('limits resend requests from one address', async () => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await resend(uniqueEmail('flood')).expect(202);
    }
    const res = await resend(uniqueEmail('flood')).expect(429);
    expect(res.body).toMatchObject({ error: { code: 'RATE_LIMITED' } });
  });
});
