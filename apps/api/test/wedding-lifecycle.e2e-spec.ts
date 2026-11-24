import { getModelToken } from '@nestjs/mongoose';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Types, type Model } from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DeletionJob } from '../src/modules/weddings/schemas/deletion-job.schema.js';
import { WeddingMembership } from '../src/modules/weddings/schemas/wedding-membership.schema.js';
import { Wedding } from '../src/modules/weddings/schemas/wedding.schema.js';
import { AuditEvent } from '../src/platform/audit/audit-event.schema.js';
import { createTestApp } from './support/app.js';
import { resetRateLimits, signupVerified } from './support/auth.js';

const dataOf = <T>(res: request.Response): T => (res.body as { data: T }).data;
const codeOf = (res: request.Response): string =>
  (res.body as { error: { code: string } }).error.code;

interface Settings {
  wedding: {
    id: string;
    status: string;
    archivedAt?: string;
    mainVenue?: { name?: string; address?: string; mapsUrl?: string };
    description?: string;
  };
  lastSaved?: { at: string; byName?: string };
  archived?: { at: string; byName?: string };
  deletionRequest?: { requestedAt: string; byName?: string };
}

/**
 * Wedding settings, archiving and deletion requests (decision 0021): any
 * member edits the details; only owners archive, request deletion or
 * cancel it; archived and deletion-pending weddings are read-only; a
 * deletion request is a soft delete that takes the public pages offline.
 */
describe('Wedding lifecycle (integration)', () => {
  let app: NestExpressApplication;
  let weddings: Model<Wedding>;
  let memberships: Model<WeddingMembership>;
  let jobs: Model<DeletionJob>;
  let audit: Model<AuditEvent>;

  beforeAll(async () => {
    app = await createTestApp();
    weddings = app.get<Model<Wedding>>(getModelToken(Wedding.name));
    memberships = app.get<Model<WeddingMembership>>(getModelToken(WeddingMembership.name));
    jobs = app.get<Model<DeletionJob>>(getModelToken(DeletionJob.name));
    audit = app.get<Model<AuditEvent>>(getModelToken(AuditEvent.name));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => resetRateLimits(app));

  const server = () => app.getHttpServer();
  const as = (cookie: string) => ({
    get: (path: string) => request(server()).get(`/api/v1${path}`).set('Cookie', cookie),
    post: (path: string, body: object = {}) =>
      request(server()).post(`/api/v1${path}`).set('Cookie', cookie).send(body),
    patch: (path: string, body: object) =>
      request(server()).patch(`/api/v1${path}`).set('Cookie', cookie).send(body),
  });
  const anyone = (path: string) => request(server()).get(`/api/v1${path}`);

  async function ownerWithWedding() {
    const owner = await signupVerified(app, { displayName: 'Ananya Sharma' });
    const api = as(owner.cookie);
    const tag = Math.random().toString(36).slice(2, 10).replace(/\d/g, 'x');
    const res = await api.post('/weddings', {
      brideName: `Ananya ${tag}`,
      groomName: 'Arjun',
      city: 'Jaipur',
      state: 'Rajasthan',
    });
    expect(res.status).toBe(201);
    const wedding = dataOf<{ id: string; slug: string }>(res);
    return { ...owner, api, weddingId: wedding.id, slug: wedding.slug };
  }

  /** Someone already on the team with `role`. */
  async function member(weddingId: string, role: 'owner' | 'admin' | 'manager', name: string) {
    const person = await signupVerified(app, { displayName: name });
    await memberships.create({
      weddingId: new Types.ObjectId(weddingId),
      userId: new Types.ObjectId(person.userId),
      role,
      status: 'active',
      activeOwned: role === 'owner',
      joinedAt: new Date(),
    });
    return { ...person, api: as(person.cookie) };
  }

  async function publish(w: Awaited<ReturnType<typeof ownerWithWedding>>) {
    // A website needs a ceremony to show.
    await w.api
      .post(`/weddings/${w.weddingId}/events`, { title: 'Mehendi', startDate: '2031-02-12' })
      .expect(201);
    await w.api
      .patch(`/weddings/${w.weddingId}/website`, {
        content: { headline: 'Welcome', faq: [] },
        contentVersion: 0,
      })
      .expect(200);
    await w.api.post(`/weddings/${w.weddingId}/website/publish`, { contentVersion: 1 }).expect(200);
  }

  it('saves the main venue and description, records who saved, and clears them with null', async () => {
    const w = await ownerWithWedding();
    const saved = await w.api.patch(`/weddings/${w.weddingId}`, {
      mainVenue: {
        name: '  Rambagh   Palace ',
        address: 'Bhawani Singh Road, Jaipur',
        mapsUrl: 'https://maps.app.goo.gl/AbCdEf123',
      },
      description: '  Two families,\r\none celebration.  ',
    });
    expect(saved.status, JSON.stringify(saved.body)).toBe(200);
    expect(dataOf<Settings['wedding']>(saved)).toMatchObject({
      mainVenue: {
        name: 'Rambagh Palace',
        address: 'Bhawani Singh Road, Jaipur',
        mapsUrl: 'https://maps.app.goo.gl/AbCdEf123',
      },
      description: 'Two families,\none celebration.',
    });

    const settings = dataOf<Settings>(await w.api.get(`/weddings/${w.weddingId}/settings`));
    expect(settings.lastSaved?.byName).toBe('Ananya Sharma');
    expect(settings.archived).toBeUndefined();
    const record = await audit
      .findOne({ weddingId: new Types.ObjectId(w.weddingId), action: 'wedding.updated' })
      .lean();
    // Which fields, never their values.
    expect(record?.safeDiff).toEqual({ fields: 'mainVenue,description' });

    const cleared = await w.api.patch(`/weddings/${w.weddingId}`, {
      mainVenue: null,
      description: null,
    });
    expect(cleared.status).toBe(200);
    expect(dataOf<Settings['wedding']>(cleared).mainVenue).toBeUndefined();
    expect(dataOf<Settings['wedding']>(cleared).description).toBeUndefined();
    const stored = await weddings.findById(w.weddingId).lean();
    expect(stored?.mainVenue).toBeUndefined();
    expect(stored?.description).toBeUndefined();
  });

  it('refuses a link that is not Google Maps and a description over 500 characters', async () => {
    const w = await ownerWithWedding();
    const badLink = await w.api.patch(`/weddings/${w.weddingId}`, {
      mainVenue: { name: 'Rambagh Palace', mapsUrl: 'https://evil.example/maps' },
    });
    expect(badLink.status).toBe(400);
    expect(JSON.stringify(badLink.body)).toContain('Google Maps');
    const long = await w.api.patch(`/weddings/${w.weddingId}`, { description: 'a'.repeat(501) });
    expect(long.status).toBe(400);
    expect(JSON.stringify(long.body)).toContain('500 characters');
    const unknown = await w.api.patch(`/weddings/${w.weddingId}`, { coverAssetId: 'x' });
    expect(unknown.status).toBe(400);
  });

  it('lets admins and managers edit details, never archive, delete or cancel', async () => {
    const w = await ownerWithWedding();
    const admin = await member(w.weddingId, 'admin', 'Ramesh Kumar');
    const manager = await member(w.weddingId, 'manager', 'Kavya Sharma');

    for (const helper of [admin, manager]) {
      const edit = await helper.api.patch(`/weddings/${w.weddingId}`, { city: 'Udaipur' });
      expect(edit.status).toBe(200);
      const settings = await helper.api.get(`/weddings/${w.weddingId}/settings`);
      expect(settings.status).toBe(200);
      for (const path of ['archive', 'deletion-requests', 'deletion-requests/cancel']) {
        const res = await helper.api.post(`/weddings/${w.weddingId}/${path}`);
        expect(res.status, path).toBe(403);
        expect(codeOf(res)).toBe('OWNER_REQUIRED');
      }
    }
    const settings = dataOf<Settings>(await w.api.get(`/weddings/${w.weddingId}/settings`));
    expect(settings.lastSaved?.byName).toBe('Kavya Sharma');
    expect((await weddings.findById(w.weddingId).lean())?.status).toBe('active');
  });

  it('answers 404 to someone outside the wedding', async () => {
    const w = await ownerWithWedding();
    const stranger = as((await signupVerified(app)).cookie);
    for (const path of ['archive', 'deletion-requests', 'deletion-requests/cancel']) {
      const res = await stranger.post(`/weddings/${w.weddingId}/${path}`);
      expect(res.status, path).toBe(404);
      expect(codeOf(res)).toBe('WEDDING_NOT_FOUND');
    }
    expect((await stranger.get(`/weddings/${w.weddingId}/settings`)).status).toBe(404);
  });

  it('archives once, read-only for everyone, keeps the site up and lets the owner start another', async () => {
    const w = await ownerWithWedding();
    await publish(w);
    const manager = await member(w.weddingId, 'manager', 'Kavya Sharma');

    const archived = await w.api.post(`/weddings/${w.weddingId}/archive`);
    expect(archived.status).toBe(200);
    const first = dataOf<Settings['wedding']>(archived);
    expect(first.status).toBe('archived');
    expect(first.archivedAt).toBeDefined();

    // Again: the same wedding, the same moment.
    const again = await w.api.post(`/weddings/${w.weddingId}/archive`);
    expect(again.status).toBe(200);
    expect(dataOf<Settings['wedding']>(again).archivedAt).toBe(first.archivedAt);
    expect(
      await audit.countDocuments({
        weddingId: new Types.ObjectId(w.weddingId),
        action: 'wedding.archived',
      }),
    ).toBe(1);

    const settings = dataOf<Settings>(await manager.api.get(`/weddings/${w.weddingId}/settings`));
    expect(settings.archived?.byName).toBe('Ananya Sharma');

    for (const who of [w, manager]) {
      const edit = await who.api.patch(`/weddings/${w.weddingId}`, { city: 'Udaipur' });
      expect(edit.status).toBe(409);
      expect(codeOf(edit)).toBe('WEDDING_ARCHIVED');
      const event = await who.api.post(`/weddings/${w.weddingId}/events`, { title: 'Haldi' });
      expect(event.status).toBe(409);
      const task = await who.api.post(`/weddings/${w.weddingId}/tasks`, { title: 'Book band' });
      expect(task.status).toBe(409);
    }
    // History stays readable.
    expect((await manager.api.get(`/weddings/${w.weddingId}/events`)).status).toBe(200);
    // The published site stays up until an owner unpublishes it.
    expect((await anyone(`/public/weddings/${w.slug}`)).status).toBe(200);

    const owners = await memberships
      .find({ weddingId: new Types.ObjectId(w.weddingId), role: 'owner' })
      .lean();
    expect(owners.every((owner) => !owner.activeOwned)).toBe(true);

    const next = await w.api.post('/weddings', {
      brideName: 'Ananya',
      groomName: 'Arjun',
      city: 'Jaipur',
      state: 'Rajasthan',
    });
    expect(next.status).toBe(201);
  });

  it('lets an archive and planning writes race without a write landing afterwards', async () => {
    const w = await ownerWithWedding();
    const writes = Array.from({ length: 6 }, (_, i) =>
      w.api.post(`/weddings/${w.weddingId}/events`, { title: `Ceremony ${i}` }),
    );
    const [archive, ...results] = await Promise.all([
      w.api.post(`/weddings/${w.weddingId}/archive`),
      ...writes,
    ]);
    expect(archive.status).toBe(200);
    for (const res of results) expect([201, 409]).toContain(res.status);
    const created = results.filter((res) => res.status === 201).length;
    const events = dataOf<{ events: unknown[] }>(
      await w.api.get(`/weddings/${w.weddingId}/events`),
    );
    expect(events.events).toHaveLength(created);
    const after = await w.api.post(`/weddings/${w.weddingId}/events`, { title: 'Late' });
    expect(after.status).toBe(409);
  });

  it('takes the public pages offline while deletion waits, and brings them back on cancel', async () => {
    const w = await ownerWithWedding();
    await publish(w);
    expect((await anyone(`/public/weddings/${w.slug}`)).status).toBe(200);

    const requested = await w.api.post(`/weddings/${w.weddingId}/deletion-requests`);
    expect(requested.status).toBe(201);
    const pending = dataOf<Settings>(requested);
    expect(pending.wedding.status).toBe('deletion_pending');
    expect(pending.deletionRequest?.byName).toBe('Ananya Sharma');

    expect((await anyone(`/public/weddings/${w.slug}`)).status).toBe(404);
    const gallery = await anyone(`/public/weddings/${w.slug}/albums`);
    expect(dataOf<{ albums: unknown[] }>(gallery).albums).toEqual([]);

    // Read-only, and nothing erased.
    const edit = await w.api.patch(`/weddings/${w.weddingId}`, { city: 'Udaipur' });
    expect(edit.status).toBe(409);
    expect(codeOf(edit)).toBe('WEDDING_DELETION_PENDING');
    const archive = await w.api.post(`/weddings/${w.weddingId}/archive`);
    expect(archive.status).toBe(409);
    expect(codeOf(archive)).toBe('WEDDING_DELETION_PENDING');
    expect((await w.api.post(`/weddings/${w.weddingId}/events`, { title: 'Haldi' })).status).toBe(
      409,
    );
    expect((await w.api.get(`/weddings/${w.weddingId}/events`)).status).toBe(200);

    // Again: the same request.
    const again = await w.api.post(`/weddings/${w.weddingId}/deletion-requests`);
    expect(dataOf<Settings>(again).deletionRequest?.requestedAt).toBe(
      pending.deletionRequest?.requestedAt,
    );

    const cancelled = await w.api.post(`/weddings/${w.weddingId}/deletion-requests/cancel`);
    expect(cancelled.status).toBe(200);
    expect(dataOf<Settings>(cancelled).wedding.status).toBe('active');
    expect(dataOf<Settings>(cancelled).deletionRequest).toBeUndefined();
    expect((await anyone(`/public/weddings/${w.slug}`)).status).toBe(200);
    expect((await w.api.patch(`/weddings/${w.weddingId}`, { city: 'Udaipur' })).status).toBe(200);

    const states = await jobs
      .find({ weddingId: new Types.ObjectId(w.weddingId) })
      .lean()
      .then((all) => all.map((job) => job.state));
    expect(states).toEqual(['cancelled']);
    const actions = await audit
      .find({ weddingId: new Types.ObjectId(w.weddingId), action: /^wedding\.deletion/ })
      .sort({ occurredAt: 1 })
      .lean();
    expect(actions.map((a) => a.action)).toEqual([
      'wedding.deletion_requested',
      'wedding.deletion_cancelled',
    ]);
  });

  it('returns an archived wedding to archived when its deletion request is cancelled', async () => {
    const w = await ownerWithWedding();
    await w.api.post(`/weddings/${w.weddingId}/archive`).expect(200);
    const requested = await w.api.post(`/weddings/${w.weddingId}/deletion-requests`);
    expect(dataOf<Settings>(requested).wedding.status).toBe('deletion_pending');
    const cancelled = await w.api.post(`/weddings/${w.weddingId}/deletion-requests/cancel`);
    expect(dataOf<Settings>(cancelled).wedding.status).toBe('archived');
    expect(dataOf<Settings>(cancelled).archived?.byName).toBe('Ananya Sharma');
  });

  it('keeps one waiting request when both owners ask at once', async () => {
    const w = await ownerWithWedding();
    const partner = await member(w.weddingId, 'owner', 'Arjun Mehta');
    const results = await Promise.all([
      w.api.post(`/weddings/${w.weddingId}/deletion-requests`),
      partner.api.post(`/weddings/${w.weddingId}/deletion-requests`),
      w.api.post(`/weddings/${w.weddingId}/deletion-requests`),
    ]);
    for (const res of results) expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(
      await jobs.countDocuments({ weddingId: new Types.ObjectId(w.weddingId), state: 'requested' }),
    ).toBe(1);
    // The partner, an owner too, may cancel it.
    const cancelled = await partner.api.post(`/weddings/${w.weddingId}/deletion-requests/cancel`);
    expect(dataOf<Settings>(cancelled).wedding.status).toBe('active');
  });
});
