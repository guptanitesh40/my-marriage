import { Logger } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthEmailComposer } from '../src/modules/auth/auth-email.composer.js';
import { AuthModule } from '../src/modules/auth/auth.module.js';
import { GuestReminderComposer } from '../src/modules/guests/guest-reminder.composer.js';
import { GuestsModule } from '../src/modules/guests/guests.module.js';
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

  it('traces adding an event: the access check, the write fence and the insert', async () => {
    configureTracing('full');
    const { cookie } = await signupVerified(app);
    const wedding = await request(app.getHttpServer())
      .post('/api/v1/weddings')
      .set('Cookie', cookie)
      .send(couple());
    const weddingId = (wedding.body as { data: { id: string } }).data.id;

    const traces = captureTraces();
    const res = await request(app.getHttpServer())
      .post(`/api/v1/weddings/${weddingId}/events`)
      .set('Cookie', cookie)
      .send({ title: 'Haldi', startDate: '2099-12-12', startTime: '10:00' });
    expect(res.status).toBe(201);

    const trace = traces.find((entry) =>
      entry.startsWith(`POST /api/v1/weddings/${weddingId}/events → 201`),
    );
    expect(trace).toBeDefined();
    const text = trace ?? '';
    const steps = [
      'EventsController.create(',
      'EventsService.create(',
      'WeddingAccessService.require(',
      'WeddingAccessService.raiseWriteFence(',
      'db weddings.updateOne',
      'db events.insertOne',
    ];
    let at = -1;
    for (const step of steps) {
      const next = text.indexOf(step, at + 1);
      expect(next, `${step} after the previous step`).toBeGreaterThan(at);
      at = next;
    }
    expect(text).toContain("title: 'Haldi'");
  });

  it('traces editing and deleting an event, in order', async () => {
    configureTracing('full');
    const { cookie } = await signupVerified(app);
    const wedding = await request(app.getHttpServer())
      .post('/api/v1/weddings')
      .set('Cookie', cookie)
      .send(couple());
    const weddingId = (wedding.body as { data: { id: string } }).data.id;
    const created = await request(app.getHttpServer())
      .post(`/api/v1/weddings/${weddingId}/events`)
      .set('Cookie', cookie)
      .send({ title: 'Haldi' });
    const eventId = (created.body as { data: { id: string } }).data.id;
    const path = `/api/v1/weddings/${weddingId}/events/${eventId}`;

    const traces = captureTraces();
    expect(
      (
        await request(app.getHttpServer())
          .patch(path)
          .set('Cookie', cookie)
          .send({ title: 'Mehendi' })
      ).status,
    ).toBe(200);
    expect((await request(app.getHttpServer()).delete(path).set('Cookie', cookie)).status).toBe(
      204,
    );

    const expectSteps = (trace: string | undefined, steps: string[]) => {
      expect(trace).toBeDefined();
      let at = -1;
      for (const step of steps) {
        const next = (trace ?? '').indexOf(step, at + 1);
        expect(next, `${step} after the previous step`).toBeGreaterThan(at);
        at = next;
      }
    };
    expectSteps(
      traces.find((entry) => entry.startsWith(`PATCH ${path} → 200`)),
      [
        'EventsController.update(',
        'EventsService.update(',
        'WeddingAccessService.require(',
        'db events.findOne',
        'WeddingAccessService.raiseWriteFence(',
        'db weddings.updateOne',
        'db events.findOneAndUpdate',
      ],
    );
    expectSteps(
      traces.find((entry) => entry.startsWith(`DELETE ${path} → 204`)),
      [
        'EventsController.remove(',
        'EventsService.remove(',
        'WeddingAccessService.require(',
        'WeddingAccessService.raiseWriteFence(',
        'db weddings.updateOne',
        'db events.updateOne',
      ],
    );
  });

  it('traces adding a task: the access check, the event and assignee checks, the fence and the insert', async () => {
    configureTracing('full');
    const { cookie, userId } = await signupVerified(app);
    const wedding = await request(app.getHttpServer())
      .post('/api/v1/weddings')
      .set('Cookie', cookie)
      .send(couple());
    const weddingId = (wedding.body as { data: { id: string } }).data.id;
    const event = await request(app.getHttpServer())
      .post(`/api/v1/weddings/${weddingId}/events`)
      .set('Cookie', cookie)
      .send({ title: 'Haldi' });
    const eventId = (event.body as { data: { id: string } }).data.id;

    const traces = captureTraces();
    const res = await request(app.getHttpServer())
      .post(`/api/v1/weddings/${weddingId}/tasks`)
      .set('Cookie', cookie)
      .send({ title: 'Book decorator', eventId, assigneeId: userId });
    expect(res.status).toBe(201);

    const trace =
      traces.find((entry) => entry.startsWith(`POST /api/v1/weddings/${weddingId}/tasks → 201`)) ??
      '';
    let at = -1;
    for (const step of [
      'TasksController.create(',
      'TasksService.create(',
      'WeddingAccessService.require(',
      'EventsService.exists(',
      'WeddingAccessService.isActiveMember(',
      'WeddingAccessService.raiseWriteFence(',
      'db tasks.insertOne',
    ]) {
      const next = trace.indexOf(step, at + 1);
      expect(next, `${step} after the previous step`).toBeGreaterThan(at);
      at = next;
    }
  });

  it('traces adding a vendor: the access check, the event check, the fence and the insert', async () => {
    configureTracing('full');
    const { cookie } = await signupVerified(app);
    const wedding = await request(app.getHttpServer())
      .post('/api/v1/weddings')
      .set('Cookie', cookie)
      .send(couple());
    const weddingId = (wedding.body as { data: { id: string } }).data.id;
    const event = await request(app.getHttpServer())
      .post(`/api/v1/weddings/${weddingId}/events`)
      .set('Cookie', cookie)
      .send({ title: 'Sangeet' });
    const eventId = (event.body as { data: { id: string } }).data.id;

    const traces = captureTraces();
    const res = await request(app.getHttpServer())
      .post(`/api/v1/weddings/${weddingId}/vendors`)
      .set('Cookie', cookie)
      .send({ name: 'Rhythm Collective', category: 'Music & DJ', eventIds: [eventId] });
    expect(res.status).toBe(201);

    const trace =
      traces.find((entry) =>
        entry.startsWith(`POST /api/v1/weddings/${weddingId}/vendors → 201`),
      ) ?? '';
    let at = -1;
    for (const step of [
      'VendorsController.create(',
      'VendorsService.create(',
      'WeddingAccessService.require(',
      'EventsService.countExisting(',
      'WeddingAccessService.raiseWriteFence(',
      'db vendors.insertOne',
    ]) {
      const next = trace.indexOf(step, at + 1);
      expect(next, `${step} after the previous step`).toBeGreaterThan(at);
      at = next;
    }
  });

  it('traces recording a payment: the access check, the expense read, the fence, the entry and the totals', async () => {
    configureTracing('full');
    const { cookie } = await signupVerified(app);
    const wedding = await request(app.getHttpServer())
      .post('/api/v1/weddings')
      .set('Cookie', cookie)
      .send(couple());
    const weddingId = (wedding.body as { data: { id: string } }).data.id;
    const expense = await request(app.getHttpServer())
      .post(`/api/v1/weddings/${weddingId}/expenses`)
      .set('Cookie', cookie)
      .send({ title: 'Catering', category: 'Catering', amountPaise: 5000000 });
    const expenseId = (expense.body as { data: { id: string } }).data.id;

    const traces = captureTraces();
    const res = await request(app.getHttpServer())
      .post(`/api/v1/weddings/${weddingId}/expenses/${expenseId}/payments`)
      .set('Cookie', cookie)
      .send({ amountPaise: 1000000, paidAt: '2026-11-01', method: 'cash' });
    expect(res.status).toBe(201);

    const path = `POST /api/v1/weddings/${weddingId}/expenses/${expenseId}/payments → 201`;
    const trace = traces.find((entry) => entry.startsWith(path)) ?? '';
    let at = -1;
    for (const step of [
      'ExpensesController.recordPayment(',
      'ExpensesService.recordPayment(',
      'WeddingAccessService.require(',
      'db expenses.findOne',
      'WeddingAccessService.raiseWriteFence(',
      'db expense_payments.insertOne',
      'db expenses.findOneAndUpdate',
    ]) {
      const next = trace.indexOf(step, at + 1);
      expect(next, `${step} after the previous step`).toBeGreaterThan(at);
      at = next;
    }
  });

  it('never logs a guest’s private link, even with full traces', async () => {
    configureTracing('full');
    const { cookie } = await signupVerified(app);
    const wedding = await request(app.getHttpServer())
      .post('/api/v1/weddings')
      .set('Cookie', cookie)
      .send(couple());
    const weddingId = (wedding.body as { data: { id: string } }).data.id;
    const guest = await request(app.getHttpServer())
      .post(`/api/v1/weddings/${weddingId}/guests`)
      .set('Cookie', cookie)
      .send({ name: 'Rajesh Sharma', partySize: 5 });
    const guestId = (guest.body as { data: { guest: { id: string } } }).data.guest.id;

    const traces = captureTraces();
    const link = await request(app.getHttpServer())
      .post(`/api/v1/weddings/${weddingId}/guests/${guestId}/invitation-links`)
      .set('Cookie', cookie)
      .send({});
    const url = (link.body as { data: { secretUrl: string } }).data.secretUrl;
    const token = url.split('#t=')[1] ?? '';
    expect(token).toHaveLength(43);
    const opened = await request(app.getHttpServer())
      .post('/api/v1/guest-access/exchange')
      .send({ token });
    expect(opened.status).toBe(204);
    const guestCookie = String(opened.headers['set-cookie']).split(';')[0] ?? '';
    await request(app.getHttpServer())
      .get('/api/v1/guest-access/invitation')
      .set('Cookie', guestCookie)
      .expect(200);

    const logged = traces.join('\n');
    expect(logged).toContain('GuestAccessService.exchange(');
    expect(logged).toContain('db invitation_tokens.findOne');
    expect(logged).not.toContain(token);
    expect(logged).not.toContain(guestCookie.split('=')[1] ?? 'missing');
  });

  it('never logs a photo upload form’s signature, even with full traces', async () => {
    configureTracing('full');
    const { cookie } = await signupVerified(app);
    const wedding = await request(app.getHttpServer())
      .post('/api/v1/weddings')
      .set('Cookie', cookie)
      .send(couple());
    const weddingId = (wedding.body as { data: { id: string } }).data.id;

    const traces = captureTraces();
    const form = await request(app.getHttpServer())
      .post(`/api/v1/weddings/${weddingId}/website/cover-uploads`)
      .set('Cookie', cookie)
      .send({ contentType: 'image/png', bytes: 100 });
    expect(form.status).toBe(201);
    const signature = (form.body as { data: { fields: { signature: string } } }).data.fields
      .signature;
    expect(signature.length).toBeGreaterThan(20);

    const logged = traces.join('\n');
    expect(logged).toContain('WebsiteImagesService.createUpload(');
    expect(logged).not.toContain(signature);
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

  it('traces a guest reminder being written, without the guest’s private link', async () => {
    const worker = await createTestWorker({
      imports: [GuestsModule],
      composers: [GuestReminderComposer],
    });
    try {
      const { cookie } = await signupVerified(app);
      const wedding = await request(app.getHttpServer())
        .post('/api/v1/weddings')
        .set('Cookie', cookie)
        .send(couple());
      const weddingId = (wedding.body as { data: { id: string } }).data.id;
      const event = await request(app.getHttpServer())
        .post(`/api/v1/weddings/${weddingId}/events`)
        .set('Cookie', cookie)
        .send({ title: 'Haldi', startDate: '2031-02-18' });
      const eventId = (event.body as { data: { id: string } }).data.id;
      const to = `rajesh.${Date.now()}@example.com`;
      const guest = await request(app.getHttpServer())
        .post(`/api/v1/weddings/${weddingId}/guests`)
        .set('Cookie', cookie)
        .send({ name: 'Rajesh Sharma', partySize: 5, email: to, eventIds: [eventId] });
      const guestId = (guest.body as { data: { guest: { id: string } } }).data.guest.id;
      const link = await request(app.getHttpServer())
        .post(`/api/v1/weddings/${weddingId}/guests/${guestId}/invitation-links`)
        .set('Cookie', cookie)
        .send({});
      const token = (link.body as { data: { secretUrl: string } }).data.secretUrl.split('#t=')[1];

      configureTracing('full');
      const traces = captureTraces();
      await request(app.getHttpServer())
        .post(`/api/v1/weddings/${weddingId}/guests/${guestId}/reminder`)
        .set('Cookie', cookie)
        .send({ note: 'Please reply soon.' })
        .expect(202);
      const email = await waitFor(() => worker.mail.sent.find((sent) => sent.to === to), {
        what: 'the reminder',
      });
      expect(email.text).toContain(token ?? 'missing');
      const trace = await waitFor(
        () => traces.find((entry) => entry.includes('GuestReminderComposer.compose(')),
        { what: 'the job trace' },
      );
      expect(traces.join('\n')).toContain('GuestRemindersService.remindOne(');
      expect(trace).not.toContain(token ?? 'missing');
      expect(traces.join('\n')).not.toContain(token ?? 'missing');
    } finally {
      await worker.context.close();
    }
  });
});
