import { argon2Sync, randomBytes } from 'node:crypto';
import { Logger } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Model } from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthSession } from '../src/modules/auth/schemas/auth-session.schema.js';
import { User } from '../src/modules/auth/schemas/user.schema.js';
import { createTestApp } from './support/app.js';
import { PASSWORD, cookieFrom, resetRateLimits, signup, uniqueEmail } from './support/auth.js';

const DAY = 24 * 60 * 60 * 1000;

describe('Login and sessions (integration)', () => {
  let app: NestExpressApplication;
  let users: Model<User>;
  let sessions: Model<AuthSession>;

  beforeAll(async () => {
    app = await createTestApp();
    users = app.get<Model<User>>(getModelToken(User.name));
    sessions = app.get<Model<AuthSession>>(getModelToken(AuthSession.name));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => resetRateLimits(app));

  function login(email: string, password = PASSWORD, cookie?: string) {
    const req = request(app.getHttpServer()).post('/api/v1/auth/login');
    if (cookie) req.set('Cookie', cookie);
    return req.send({ email, password });
  }

  function me(cookie: string | undefined) {
    return request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', cookie ?? '');
  }

  async function latestSessionOf(email: string) {
    const user = await users.findOne({ emailNormalized: email }).lean();
    const [session] = await sessions.find({ userId: user?._id }).sort({ createdAt: -1 }).limit(1);
    if (!session) throw new Error('no session');
    return session;
  }

  it('signs in with the right password, however the email is typed', async () => {
    const { body } = await signup(app);
    const res = await login(`  ${body.email.toUpperCase()} `).expect(200);
    expect(res.body).toMatchObject({ data: { email: body.email, emailVerified: false } });

    const cookie = cookieFrom(res.headers['set-cookie']);
    expect(String(res.headers['set-cookie'])).toContain('HttpOnly');
    await me(cookie).expect(200);
  });

  it('gives one identical answer for a wrong password and an unknown email', async () => {
    const { body } = await signup(app);
    const wrongPassword = await login(body.email, 'not the password').expect(401);
    const unknownEmail = await login(uniqueEmail('nobody')).expect(401);

    expect(wrongPassword.body).toMatchObject({ error: { code: 'INVALID_CREDENTIALS' } });
    expect((wrongPassword.body as { error: unknown }).error).toEqual(
      (unknownEmail.body as { error: unknown }).error,
    );
    expect(wrongPassword.headers['set-cookie']).toBeUndefined();
  });

  it('refuses a disabled account with the same answer', async () => {
    const { body } = await signup(app);
    await users.updateOne({ emailNormalized: body.email }, { $set: { status: 'disabled' } });
    const res = await login(body.email).expect(401);
    expect(res.body).toMatchObject({ error: { code: 'INVALID_CREDENTIALS' } });
  });

  it('pauses sign-in for an email after five failures, existing or not', async () => {
    const { body } = await signup(app);
    for (const email of [body.email, uniqueEmail('nobody')]) {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        await login(email, 'not the password').expect(401);
      }
      const blocked = await login(email).expect(429);
      expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
      expect(blocked.body).toMatchObject({ error: { code: 'RATE_LIMITED' } });
    }
  });

  it('lets only five of many simultaneous wrong guesses for one email be tried', async () => {
    const { body } = await signup(app);
    const results = await Promise.all(
      Array.from({ length: 20 }, () => login(body.email, 'not the password')),
    );
    const statuses = results.map((res) => res.status);
    expect(statuses.filter((status) => status === 401)).toHaveLength(5);
    expect(statuses.filter((status) => status === 429)).toHaveLength(15);
  });

  it('forgets earlier failures after a successful sign-in', async () => {
    const { body } = await signup(app);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await login(body.email, 'not the password').expect(401);
    }
    await login(body.email).expect(200);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await login(body.email, 'not the password').expect(401);
    }
    await login(body.email).expect(200);
  });

  it('issues a new session at every sign-in and ends the one the browser had', async () => {
    const { body, cookie: before } = await signup(app);
    const res = await login(body.email, PASSWORD, before).expect(200);
    const after = cookieFrom(res.headers['set-cookie']);

    expect(after).not.toBe(before);
    await me(before).expect(401);
    await me(after).expect(200);
  });

  it('signs out: the session ends and the cookie is cleared', async () => {
    const { body } = await signup(app);
    const cookie = cookieFrom((await login(body.email).expect(200)).headers['set-cookie']);

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', cookie ?? '')
      .expect(204);
    expect(String(res.headers['set-cookie'])).toMatch(/^mm_session=; .*Expires=Thu, 01 Jan 1970/);
    await me(cookie).expect(401);
    expect((await latestSessionOf(body.email)).revokedAt).toBeInstanceOf(Date);

    // Signing out again, or without a session, is harmless.
    await request(app.getHttpServer()).post('/api/v1/auth/logout').expect(204);
  });

  it.each([
    ['past its 30-day limit', { expiresAt: new Date(Date.now() - 1000) }],
    ['unused for more than 7 days', { lastSeenAt: new Date(Date.now() - 8 * DAY) }],
    ['revoked', { revokedAt: new Date() }],
  ])('refuses a session %s, without waiting for database cleanup', async (_case, change) => {
    const { body, cookie } = await signup(app);
    await me(cookie).expect(200);
    await sessions.updateOne({ _id: (await latestSessionOf(body.email))._id }, { $set: change });
    await me(cookie).expect(401);
  });

  it('refuses sessions that started before the password last changed', async () => {
    const { body, cookie } = await signup(app);
    await users.updateOne(
      { emailNormalized: body.email },
      { $set: { passwordChangedAt: new Date(Date.now() + 1000) } },
    );
    await me(cookie).expect(401);
  });

  it('refuses a session whose sign-in checked a password that has since changed', async () => {
    // A sign-in that checked the old password just before a reset, and
    // created its session just after it: the session is newer than the
    // change, yet was made with the old password.
    const { body } = await signup(app);
    const cookie = cookieFrom((await login(body.email).expect(200)).headers['set-cookie']);
    const session = await latestSessionOf(body.email);
    await users.updateOne(
      { emailNormalized: body.email },
      { $set: { passwordChangedAt: new Date(session.createdAt.getTime() - 1000) } },
    );
    await me(cookie).expect(401);
  });

  it('keeps sessions made after a password change working', async () => {
    const { body } = await signup(app);
    await users.updateOne(
      { emailNormalized: body.email },
      { $set: { passwordChangedAt: new Date(Date.now() - 1000) } },
    );
    const cookie = cookieFrom((await login(body.email).expect(200)).headers['set-cookie']);
    await me(cookie).expect(200);
  });

  it('refuses the session of an account that was disabled', async () => {
    const { body, cookie } = await signup(app);
    await users.updateOne({ emailNormalized: body.email }, { $set: { status: 'disabled' } });
    await me(cookie).expect(401);
  });

  it('records activity at most every ten minutes, not on every request', async () => {
    const { body, cookie } = await signup(app);
    const session = await latestSessionOf(body.email);
    const recent = new Date(Date.now() - 60_000);
    await sessions.updateOne({ _id: session._id }, { $set: { lastSeenAt: recent } });
    await me(cookie).expect(200);
    expect((await sessions.findById(session._id).lean())?.lastSeenAt).toEqual(recent);

    const stale = new Date(Date.now() - 11 * 60_000);
    await sessions.updateOne({ _id: session._id }, { $set: { lastSeenAt: stale } });
    await me(cookie).expect(200);
    const touched = (await sessions.findById(session._id).lean())?.lastSeenAt;
    expect(touched?.getTime()).toBeGreaterThan(Date.now() - 5000);
  });

  it('upgrades a password hash made with weaker settings when the user signs in', async () => {
    const { body } = await signup(app);
    const salt = randomBytes(16);
    const weak = argon2Sync('argon2id', {
      message: PASSWORD,
      nonce: salt,
      memory: 8192,
      passes: 1,
      parallelism: 1,
      tagLength: 32,
    });
    const b64 = (buffer: Buffer) => buffer.toString('base64').replace(/=+$/, '');
    await users.updateOne(
      { emailNormalized: body.email },
      {
        $set: {
          passwordHash: ['', 'argon2id', 'v=19', 'm=8192,t=1,p=1', b64(salt), b64(weak)].join('$'),
        },
      },
    );

    await login(body.email).expect(200);
    const user = await users.findOne({ emailNormalized: body.email }).lean();
    expect(user?.passwordHash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    await login(body.email).expect(200);
  });

  it('refuses a sign-in posted from another site', async () => {
    const { body } = await signup(app);
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('Sec-Fetch-Site', 'cross-site')
      .send({ email: body.email, password: PASSWORD })
      .expect(403);
  });

  it('never writes a password or session cookie to the logs', async () => {
    const lines: string[] = [];
    const capture = (...args: unknown[]) => void lines.push(JSON.stringify(args));
    const spies = (['log', 'warn', 'error', 'debug', 'verbose'] as const).map((level) =>
      vi.spyOn(Logger.prototype, level).mockImplementation(capture),
    );
    let cookie: string | undefined;
    try {
      const { body } = await signup(app);
      await login(body.email, 'a wrong password here').expect(401);
      cookie = cookieFrom((await login(body.email).expect(200)).headers['set-cookie']);
      await me(cookie).expect(200);
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', cookie ?? '');
    } finally {
      spies.forEach((spy) => spy.mockRestore());
    }
    const token = cookie?.split('=')[1] ?? 'missing';
    const logged = lines.join('\n');
    expect(lines.length).toBeGreaterThan(0);
    expect(logged).not.toContain(PASSWORD);
    expect(logged).not.toContain('a wrong password here');
    expect(logged).not.toContain(token);
  });
});
