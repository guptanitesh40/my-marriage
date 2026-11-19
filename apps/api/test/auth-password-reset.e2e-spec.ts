import { getModelToken } from '@nestjs/mongoose';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Types, type Model } from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AuthEmailComposer } from '../src/modules/auth/auth-email.composer.js';
import { AuthModule } from '../src/modules/auth/auth.module.js';
import { AuthActionToken } from '../src/modules/auth/schemas/auth-action-token.schema.js';
import { User } from '../src/modules/auth/schemas/user.schema.js';
import { Notification } from '../src/modules/notifications/notification.schema.js';
import { createTestApp } from './support/app.js';
import {
  PASSWORD,
  cookieFrom,
  resetRateLimits,
  settle,
  signup,
  tokenFromEmail,
  uniqueEmail,
} from './support/auth.js';
import { createTestWorker, waitFor, type TestWorker } from './support/worker.js';

const NEW_PASSWORD = 'sangeet in the ballroom';

describe('Password reset (integration)', () => {
  let app: NestExpressApplication;
  let worker: TestWorker;
  let users: Model<User>;
  let tokens: Model<AuthActionToken>;
  let notifications: Model<Notification>;

  beforeAll(async () => {
    app = await createTestApp();
    worker = await createTestWorker({ imports: [AuthModule], composers: [AuthEmailComposer] });
    users = app.get<Model<User>>(getModelToken(User.name));
    tokens = app.get<Model<AuthActionToken>>(getModelToken(AuthActionToken.name));
    notifications = app.get<Model<Notification>>(getModelToken(Notification.name));
  });

  afterAll(async () => {
    await worker.context.close();
    await app.close();
  });

  beforeEach(() => resetRateLimits(app));

  function forgot(email: string) {
    return request(app.getHttpServer()).post('/api/v1/auth/password/forgot').send({ email });
  }

  function reset(token: string, password = NEW_PASSWORD) {
    return request(app.getHttpServer())
      .post('/api/v1/auth/password/reset')
      .send({ token, password });
  }

  function login(email: string, password: string) {
    return request(app.getHttpServer()).post('/api/v1/auth/login').send({ email, password });
  }

  function me(cookie: string | undefined) {
    return request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', cookie ?? '');
  }

  /** The newest email of `subject` to `address`, once it has been sent. */
  function emailTo(address: string, subject: RegExp, count = 1) {
    return waitFor(
      () => {
        const found = worker.mail.sent.filter(
          (email) => email.to === address && subject.test(email.subject),
        );
        return found.length >= count ? found[found.length - 1] : undefined;
      },
      { what: `email "${subject.source}" to ${address}` },
    );
  }

  /** Signs up and waits for the reset link a forgot-password request sends. */
  async function accountWithResetLink() {
    const account = await signup(app);
    await forgot(account.body.email).expect(202);
    const token = tokenFromEmail(await emailTo(account.body.email, /Reset your/));
    return { ...account, token };
  }

  it('emails a reset link and answers exactly as it does for an unknown address', async () => {
    const { body } = await signup(app);
    const known = await forgot(body.email).expect(202);
    const unknown = await forgot(uniqueEmail('nobody')).expect(202);
    expect(known.text).toBe('');
    expect(unknown.text).toBe('');

    const email = await emailTo(body.email, /Reset your/);
    expect(email.text).toMatch(/http:\/\/localhost:3000\/reset-password#token=[A-Za-z0-9_-]{43}/);
    expect(JSON.stringify(await tokens.find({}).lean())).not.toContain(tokenFromEmail(email));
  });

  it('answers the same for a disabled account, and sends it nothing', async () => {
    const { body } = await signup(app);
    await users.updateOne({ emailNormalized: body.email }, { $set: { status: 'disabled' } });
    await forgot(body.email).expect(202);
    await settle(app);
    expect(
      await notifications.countDocuments({
        recipientEmailNormalized: body.email,
        kind: 'password_reset',
      }),
    ).toBe(0);
  });

  it('sets the new password, signs out every device and says so by email', async () => {
    const { body, cookie: firstDevice, token } = await accountWithResetLink();
    const secondDevice = cookieFrom(
      (await login(body.email, PASSWORD).expect(200)).headers['set-cookie'],
    );

    await reset(token).expect(204);

    await me(firstDevice).expect(401);
    await me(secondDevice).expect(401);
    await login(body.email, PASSWORD).expect(401);
    await login(body.email, NEW_PASSWORD).expect(200);

    const notice = await emailTo(body.email, /password was changed/);
    expect(notice.text).toContain('http://localhost:3000/forgot-password');
  });

  it('verifies an unverified address, since the reset proves the inbox is theirs', async () => {
    const { body, token } = await accountWithResetLink();
    await reset(token).expect(204);
    const user = await users.findOne({ emailNormalized: body.email }).lean();
    expect(user?.verifiedAt).toBeInstanceOf(Date);
  });

  it('works once', async () => {
    const { token } = await accountWithResetLink();
    await reset(token).expect(204);
    const reused = await reset(token, 'another fresh passphrase').expect(410);
    expect(reused.body).toMatchObject({ error: { code: 'TOKEN_INVALID' } });
  });

  it('refuses an expired link, even before database cleanup', async () => {
    const { body, token } = await accountWithResetLink();
    const user = await users.findOne({ emailNormalized: body.email }).lean();
    await tokens.updateMany(
      { userId: user?._id },
      { $set: { expiresAt: new Date(Date.now() - 1) } },
    );
    await reset(token).expect(410);
    await login(body.email, PASSWORD).expect(200);
  });

  it('keeps the link usable when the new password is rejected', async () => {
    const { body, token } = await accountWithResetLink();
    const weak = await reset(token, 'Password@123').expect(400);
    expect(weak.body).toMatchObject({ error: { details: [{ field: 'password' }] } });
    await reset(token, body.email).expect(400);

    await reset(token).expect(204);
  });

  it('lets exactly one of two simultaneous resets with one link succeed', async () => {
    const { body, token } = await accountWithResetLink();
    const results = await Promise.all([
      reset(token, 'first new passphrase'),
      reset(token, 'second new passphrase'),
    ]);
    expect(results.map((res) => res.status).sort()).toEqual([204, 410]);

    const winner = results[0]?.status === 204 ? 'first new passphrase' : 'second new passphrase';
    await login(body.email, winner).expect(200);
  });

  it('replaces the previous link when a new one is requested', async () => {
    const { body, token: first } = await accountWithResetLink();
    await forgot(body.email).expect(202);
    const second = tokenFromEmail(await emailTo(body.email, /Reset your/, 2));

    await reset(first).expect(410);
    await reset(second).expect(204);
  });

  describe('when the worker sends reset emails late or out of order', () => {
    /** Writes a reset email for `email` as the worker would, for a request made at `requestedAt`. */
    async function composeReset(
      email: string,
      requestedAt: Date,
      notificationId = new Types.ObjectId(),
    ) {
      const user = await users.findOne({ emailNormalized: email }).lean();
      const composed = await worker.context.get(AuthEmailComposer).compose({
        notificationId: notificationId.toHexString(),
        kind: 'password_reset',
        userId: user?._id,
        recipientEmailNormalized: email,
        requestedAt,
      });
      return composed ?? undefined;
    }

    it('sends no link for a request a later one has replaced', async () => {
      const { body } = await signup(app);
      const latest = await composeReset(body.email, new Date());
      expect(await composeReset(body.email, new Date(Date.now() - 60_000))).toBeUndefined();
      await reset(tokenFromEmail(latest)).expect(204);
    });

    it('ends the link of an earlier request once a later one is sent', async () => {
      const { body } = await signup(app);
      const earlier = await composeReset(body.email, new Date(Date.now() - 60_000));
      const later = await composeReset(body.email, new Date());
      await reset(tokenFromEmail(earlier)).expect(410);
      await reset(tokenFromEmail(later)).expect(204);
    });

    it('sends no link that was requested before the password was reset', async () => {
      const { body, token } = await accountWithResetLink();
      const requestedBefore = new Date();
      await reset(token).expect(204);
      expect(await composeReset(body.email, requestedBefore)).toBeUndefined();
    });

    it('keeps the link of an earlier attempt at the same email working', async () => {
      const { body } = await signup(app);
      const notificationId = new Types.ObjectId();
      const requestedAt = new Date();
      const first = await composeReset(body.email, requestedAt, notificationId);
      // A retry, as after a send whose reply never came back.
      await composeReset(body.email, requestedAt, notificationId);
      await reset(tokenFromEmail(first)).expect(204);
    });
  });

  it('sends at most three reset emails an hour to one address, answering the same', async () => {
    const { body } = await signup(app);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await forgot(body.email).expect(202);
    }
    await settle(app);
    expect(
      await notifications.countDocuments({
        recipientEmailNormalized: body.email,
        kind: 'password_reset',
      }),
    ).toBe(3);
  });

  it('limits reset requests from one client address', async () => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await forgot(uniqueEmail('flood')).expect(202);
    }
    await forgot(uniqueEmail('flood')).expect(429);
  });
});
