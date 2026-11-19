import { Controller, Get, Logger } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Model } from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthSession } from '../src/modules/auth/schemas/auth-session.schema.js';
import { User } from '../src/modules/auth/schemas/user.schema.js';
import { Notification } from '../src/modules/notifications/notification.schema.js';
import { NotificationsService } from '../src/modules/notifications/notifications.service.js';
import { OutboxEvent } from '../src/platform/outbox/outbox-event.schema.js';
import { createTestApp } from './support/app.js';
import { PASSWORD, cookieFrom, resetRateLimits, signup, uniqueEmail } from './support/auth.js';

/** A route with no auth decorator: needs a session and a verified email. */
@Controller('verified-probe')
class VerifiedProbeController {
  @Get()
  get() {
    return { ok: true };
  }
}

describe('Signup (integration)', () => {
  let app: NestExpressApplication;
  let users: Model<User>;
  let sessions: Model<AuthSession>;
  let notifications: Model<Notification>;
  let outboxEvents: Model<OutboxEvent>;

  beforeAll(async () => {
    app = await createTestApp({ controllers: [VerifiedProbeController] });
    users = app.get<Model<User>>(getModelToken(User.name));
    sessions = app.get<Model<AuthSession>>(getModelToken(AuthSession.name));
    notifications = app.get<Model<Notification>>(getModelToken(Notification.name));
    outboxEvents = app.get<Model<OutboxEvent>>(getModelToken(OutboxEvent.name));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => resetRateLimits(app));

  it('creates the account, signs the user in and queues the verification email', async () => {
    const email = uniqueEmail('Priya.Sharma');
    const { res, cookie } = await signup(app, {
      email: `  ${email.toUpperCase()} `,
      displayName: '  Priya   Sharma ',
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      data: {
        id: expect.stringMatching(/^[a-f0-9]{24}$/) as unknown,
        email: email.toLowerCase(),
        displayName: 'Priya Sharma',
        emailVerified: false,
      },
      requestId: res.headers['x-request-id'],
    });

    const setCookie = String(res.headers['set-cookie']);
    expect(setCookie).toMatch(/^mm_session=[A-Za-z0-9_-]{43}; /);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).toContain('Path=/');
    // Not Secure outside production, so it works over http://localhost.
    expect(setCookie).not.toContain('Secure');
    const expires = Date.parse(/Expires=([^;]+)/.exec(setCookie)?.[1] ?? '');
    expect(expires - Date.now()).toBeGreaterThan(29 * 24 * 60 * 60 * 1000);

    const user = await users.findOne({ emailNormalized: email.toLowerCase() }).lean();
    expect(user).toMatchObject({ status: 'active', displayName: 'Priya Sharma' });
    expect(user?.verifiedAt).toBeUndefined();
    expect(user?.passwordHash).toMatch(/^\$argon2id\$/);

    // Only a hash of the cookie is stored.
    const token = cookie?.split('=')[1] ?? '';
    const stored = await sessions.find({ userId: user?._id }).lean();
    expect(stored).toHaveLength(1);
    expect(stored[0]?.sessionHash).not.toBe(token);
    expect(JSON.stringify(stored)).not.toContain(token);

    const notification = await notifications.findOne({ userId: user?._id }).lean();
    expect(notification).toMatchObject({
      kind: 'verify_email',
      state: 'queued',
      recipientEmailNormalized: email.toLowerCase(),
    });
    expect(await outboxEvents.countDocuments({ aggregateId: notification?._id })).toBe(1);

    // The password never appears anywhere but as its hash.
    expect(JSON.stringify(res.body)).not.toContain(PASSWORD);
    expect(JSON.stringify(user)).not.toContain(PASSWORD);
  });

  it('lets the new, unverified user see their account, and nothing that needs verification', async () => {
    const { cookie, body } = await signup(app);
    if (!cookie) throw new Error('no session cookie');

    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', cookie)
      .expect(200);
    expect(me.body).toMatchObject({ data: { email: body.email, emailVerified: false } });

    const blocked = await request(app.getHttpServer())
      .get('/api/v1/verified-probe')
      .set('Cookie', cookie)
      .expect(403);
    expect(blocked.body).toMatchObject({ error: { code: 'EMAIL_NOT_VERIFIED' } });
  });

  it('ends the session the browser already had when it signs up another account', async () => {
    const { cookie: before } = await signup(app);
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .set('Cookie', before ?? '')
      .send({ email: uniqueEmail(), password: PASSWORD, displayName: 'Rohan Mehta' })
      .expect(201);
    const after = cookieFrom(res.headers['set-cookie']);

    expect(after).not.toBe(before);
    for (const [cookie, status] of [
      [before, 401],
      [after, 200],
    ] as const) {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', cookie ?? '')
        .expect(status);
    }
  });

  it('refuses a second account for the same email, however it is typed', async () => {
    const email = uniqueEmail();
    expect((await signup(app, { email })).res.status).toBe(201);

    const { res } = await signup(app, { email: ` ${email.toUpperCase()}` });
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({
      error: {
        code: 'EMAIL_TAKEN',
        details: [{ field: 'email', messages: [expect.stringContaining('already exists')] }],
      },
    });
    expect(res.headers['set-cookie']).toBeUndefined();
    expect(await users.countDocuments({ emailNormalized: email })).toBe(1);
    expect(await notifications.countDocuments({ recipientEmailNormalized: email })).toBe(1);
  });

  it('creates exactly one account when the same email signs up many times at once', async () => {
    const email = uniqueEmail('race');
    const results = await Promise.all(Array.from({ length: 10 }, () => signup(app, { email })));
    const statuses = results.map(({ res }) => res.status).sort();

    expect(statuses).toEqual([201, 409, 409, 409, 409, 409, 409, 409, 409, 409]);
    expect(await users.countDocuments({ emailNormalized: email })).toBe(1);
    expect(await notifications.countDocuments({ recipientEmailNormalized: email })).toBe(1);
  });

  it.each([
    ['an invalid email', { email: 'not-an-email' }, 'email'],
    ['a short password', { password: 'short' }, 'password'],
    ['a common password', { password: 'Password@123' }, 'password'],
    ['a number-only password', { password: '9876543210' }, 'password'],
    ['an empty name', { displayName: '   ' }, 'displayName'],
  ])('rejects %s, beside its field, without creating anything', async (_case, fields, field) => {
    const email = uniqueEmail();
    const { res } = await signup(app, { email, ...fields });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      error: { code: 'VALIDATION_ERROR', details: [{ field }] },
    });
    expect(await users.countDocuments({ emailNormalized: email })).toBe(0);
  });

  it('refuses the email address as the password', async () => {
    const email = uniqueEmail();
    const { res } = await signup(app, { email, password: email });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      error: { details: [{ field: 'password', messages: [expect.stringContaining('email')] }] },
    });
  });

  it('refuses fields a client may not set, such as a verified flag', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({
        email: uniqueEmail(),
        password: PASSWORD,
        displayName: 'Priya',
        verifiedAt: new Date().toISOString(),
        status: 'active',
      })
      .expect(400);
    expect(res.body).toMatchObject({
      error: {
        details: expect.arrayContaining([
          { field: 'verifiedAt', messages: ['property verifiedAt should not exist'] },
        ]) as unknown,
      },
    });
  });

  it('saves nothing when any part of the signup fails', async () => {
    const email = uniqueEmail('atomic');
    const sessionsBefore = await sessions.countDocuments({});
    const failure = vi
      .spyOn(app.get(NotificationsService), 'requestEmail')
      .mockRejectedValueOnce(new Error('simulated failure'));
    // Silence the expected error log.
    const logged = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    try {
      const { res } = await signup(app, { email });
      expect(res.status).toBe(500);
    } finally {
      failure.mockRestore();
      logged.mockRestore();
    }
    expect(await users.countDocuments({ emailNormalized: email })).toBe(0);
    expect(await sessions.countDocuments({})).toBe(sessionsBefore);
    expect(await notifications.countDocuments({ recipientEmailNormalized: email })).toBe(0);
  });

  it('limits sign-ups from one address', async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect((await signup(app)).res.status).toBe(201);
    }
    const { res } = await signup(app);
    expect(res.status).toBe(429);
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
    expect(res.body).toMatchObject({ error: { code: 'RATE_LIMITED' } });
  });

  it('answers 401 without a session, or with a cookie it never issued', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    expect(res.body).toMatchObject({ error: { code: 'UNAUTHENTICATED' } });

    const forged = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', 'mm_session=Xk29abcdefghijklmnopqrstuvwxyz0123456789_-A')
      .expect(401);
    // The dead cookie is cleared.
    expect(String(forged.headers['set-cookie'])).toMatch(
      /^mm_session=; .*Expires=Thu, 01 Jan 1970/,
    );
  });
});
