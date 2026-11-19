import { Logger } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthEmailComposer } from '../src/modules/auth/auth-email.composer.js';
import { AuthModule } from '../src/modules/auth/auth.module.js';
import { configureTracing } from '../src/platform/tracing.js';
import { createTestApp } from './support/app.js';
import {
  PASSWORD,
  resetRateLimits,
  signup,
  signupVerified,
  tokenFromEmail,
} from './support/auth.js';
import { createTestWorker, waitFor } from './support/worker.js';

/** Every log entry that is a request's or a job's trace (text mode). */
function captureTraces() {
  const entries: string[] = [];
  const keep = (message: unknown) => {
    if (typeof message === 'string' && /^((GET|POST|PATCH|PUT|DELETE) \/|job )/.test(message)) {
      entries.push(message);
    }
  };
  vi.spyOn(Logger.prototype, 'log').mockImplementation(keep);
  vi.spyOn(Logger.prototype, 'warn').mockImplementation(keep);
  return entries;
}

function couple() {
  const tag = Math.random()
    .toString(36)
    .replace(/[^a-z]/g, '')
    .slice(0, 8);
  return { brideName: `Meera ${tag}`, groomName: 'Kabir', city: 'Pune', state: 'Maharashtra' };
}

describe('Request tracing (integration)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    configureTracing('off');
    await app.close();
  });

  beforeEach(() => resetRateLimits(app));
  afterEach(() => {
    vi.restoreAllMocks();
    configureTracing('off');
  });

  it('logs the path of a request through the code, with the response, but no secret', async () => {
    configureTracing('full');
    const traces = captureTraces();
    const { res, cookie } = await signup(app);
    expect(res.status).toBe(201);

    const trace = traces.find((entry) => entry.startsWith('POST /api/v1/auth/signup → 201'));
    expect(trace).toBeDefined();
    const text = trace ?? '';
    // The order things happened in: guard, controller, service, database.
    const order = [
      'SessionAuthGuard.canActivate',
      'AuthController.signup',
      'AuthService.signup',
      'PasswordHasher.hash',
      'db users.insertOne',
      'SessionsService.create',
      'response { data:',
    ].map((step) => text.indexOf(step));
    expect(order.every((at) => at >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);

    expect(text).not.toContain(PASSWORD);
    const sessionToken = cookie?.split('=')[1];
    expect(sessionToken).toBeTruthy();
    expect(text).not.toContain(sessionToken);
    expect(text).not.toMatch(/\$argon2id\$/);
  });

  it('shows where a failed request stopped, with the error and the response', async () => {
    configureTracing('full');
    const { cookie } = await signupVerified(app);
    await request(app.getHttpServer())
      .post('/api/v1/weddings')
      .set('Cookie', cookie)
      .send(couple());

    const traces = captureTraces();
    const res = await request(app.getHttpServer())
      .post('/api/v1/weddings')
      .set('Cookie', cookie)
      .send(couple());
    expect(res.status).toBe(409);

    const trace = traces.find((entry) => entry.startsWith('POST /api/v1/weddings → 409')) ?? '';
    expect(trace).toMatch(/WeddingsService\.create\(.*✗ ConflictException 409 OWNER_ACTIVE_LIMIT/);
    expect(trace).toMatch(/WeddingsController\.create\(.*✗ ConflictException 409/);
    expect(trace).toContain("response { error: { code: 'OWNER_ACTIVE_LIMIT'");
  });

  it('never logs an invitation link token sent in a body', async () => {
    configureTracing('full');
    const traces = captureTraces();
    const token = 'Zx9-link-secret-'.padEnd(43, 'q');
    const res = await request(app.getHttpServer())
      .post('/api/v1/member-invites/preview')
      .send({ token });
    expect(res.status).toBe(410);
    const trace = traces.find((entry) => entry.startsWith('POST /api/v1/member-invites/preview'));
    expect(trace).toBeDefined();
    expect(trace).not.toContain(token);
  });

  it('in errors mode, traces only failed requests, without values', async () => {
    configureTracing('errors');
    const traces = captureTraces();
    const { cookie } = await signupVerified(app);
    await request(app.getHttpServer()).get('/api/v1/weddings').set('Cookie', cookie).expect(200);
    const bad = await request(app.getHttpServer())
      .post('/api/v1/weddings')
      .set('Cookie', cookie)
      .send({ ...couple(), city: '' });
    expect(bad.status).toBe(400);

    expect(traces.some((entry) => entry.startsWith('GET /api/v1/weddings'))).toBe(false);
    const trace = traces.find((entry) => entry.startsWith('POST /api/v1/weddings → 400')) ?? '';
    expect(trace).toMatch(/WeddingsController\.create\(\) {2}[\d.]+ms ✗ BadRequestException 400/);
    expect(trace).not.toContain('Maharashtra');
    expect(trace).not.toContain('response');
  });

  it('traces a worker job sending an email, without the email or its link', async () => {
    const worker = await createTestWorker({
      imports: [AuthModule],
      composers: [AuthEmailComposer],
    });
    try {
      configureTracing('full');
      const traces = captureTraces();
      const { body } = await signup(app);
      const email = await waitFor(() => worker.mail.sent.find((sent) => sent.to === body.email), {
        what: 'the verification email',
      });
      const trace = await waitFor(
        () =>
          traces.find(
            (entry) => entry.startsWith('job email.requested.v1') && entry.includes('done'),
          ),
        { what: 'the job trace' },
      );
      expect(trace).toMatch(/EmailDeliveryHandler\.handle\(/);
      expect(trace).toMatch(/AuthEmailComposer\.compose\(/);
      expect(trace).not.toContain(tokenFromEmail(email));
    } finally {
      await worker.context.close();
    }
  });
});
