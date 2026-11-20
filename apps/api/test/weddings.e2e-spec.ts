import { Logger } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Types, type Connection, type Model } from 'mongoose';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { WeddingMembership } from '../src/modules/weddings/schemas/wedding-membership.schema.js';
import { Wedding } from '../src/modules/weddings/schemas/wedding.schema.js';
import { createTestApp } from './support/app.js';
import { resetRateLimits, signup, signupVerified } from './support/auth.js';

/** Letters only, so each test's couple has its own slug. */
function tag(): string {
  return Array.from({ length: 8 }, () =>
    String.fromCharCode(97 + Math.floor(Math.random() * 26)),
  ).join('');
}

function couple(overrides: Record<string, unknown> = {}) {
  const t = tag();
  return {
    brideName: `Ananya ${t}`,
    groomName: 'Arjun',
    city: 'Jaipur',
    state: 'Rajasthan',
    ...overrides,
  };
}

describe('Weddings (integration)', () => {
  let app: NestExpressApplication;
  let weddings: Model<Wedding>;
  let memberships: Model<WeddingMembership>;
  let connection: Connection;

  beforeAll(async () => {
    app = await createTestApp();
    weddings = app.get<Model<Wedding>>(getModelToken(Wedding.name));
    memberships = app.get<Model<WeddingMembership>>(getModelToken(WeddingMembership.name));
    connection = app.get<Connection>(getConnectionToken());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => resetRateLimits(app));
  afterEach(() => vi.restoreAllMocks());

  function create(cookie: string | undefined, body: unknown) {
    const req = request(app.getHttpServer()).post('/api/v1/weddings');
    return (cookie ? req.set('Cookie', cookie) : req).send(body as object);
  }

  function list(cookie: string) {
    return request(app.getHttpServer()).get('/api/v1/weddings').set('Cookie', cookie);
  }

  async function weddingsCreatedBy(userId: string) {
    return weddings.find({ createdBy: new Types.ObjectId(userId) }).lean();
  }

  describe('creating a wedding', () => {
    it('creates an active wedding with the user as its first owner', async () => {
      const { cookie, userId } = await signupVerified(app);
      const t = tag();
      const body = couple({ brideName: `  Ananya   ${t} `, groomName: 'Arjun' });
      const res = await create(cookie, body);

      expect(res.status).toBe(201);
      const data = (res.body as { data: Record<string, unknown> }).data;
      expect(data).toEqual({
        id: expect.stringMatching(/^[a-f0-9]{24}$/) as unknown,
        slug: `ananya-${t}-arjun`,
        brideName: `Ananya ${t}`,
        groomName: 'Arjun',
        city: 'Jaipur',
        state: 'Rajasthan',
        status: 'active',
        role: 'owner',
      });

      const wedding = await weddings.findById(data.id).lean();
      expect(wedding).toMatchObject({
        slug: `ananya-${t}-arjun`,
        brideName: `Ananya ${t}`,
        status: 'active',
        writeFenceVersion: 0,
        quota: { limitBytes: 5_000_000_000, usedBytes: 0, reservedBytes: 0 },
      });
      expect(wedding?.createdBy.toHexString()).toBe(userId);
      expect(wedding?.weddingDate).toBeUndefined();
      expect(wedding?.createdAt).toBeInstanceOf(Date);

      const owners = await memberships.find({ weddingId: wedding?._id }).lean();
      expect(owners).toHaveLength(1);
      expect(owners[0]).toMatchObject({ role: 'owner', status: 'active', activeOwned: true });
      expect(owners[0]?.userId.toHexString()).toBe(userId);
      expect(owners[0]?.joinedAt).toBeInstanceOf(Date);

      // Unpublished: nothing of the wedding website exists yet.
      const sites = connection.db?.collection('website_configs');
      expect(await sites?.countDocuments({ weddingId: wedding?._id })).toBe(0);
    });

    it('stores a wedding date as a calendar day', async () => {
      const { cookie } = await signupVerified(app);
      const res = await create(cookie, couple({ weddingDate: '2099-12-10' }));
      expect(res.status).toBe(201);
      const data = (res.body as { data: { id: string; weddingDate: string } }).data;
      expect(data.weddingDate).toBe('2099-12-10');
      const wedding = await weddings.findById(data.id).lean();
      expect(wedding?.weddingDate?.toISOString()).toBe('2099-12-10T00:00:00.000Z');
    });

    it('needs the names, city and state, and says which is missing', async () => {
      const { cookie, userId } = await signupVerified(app);
      const res = await create(cookie, { brideName: '   ', city: 'Jaipur' });
      expect(res.status).toBe(400);
      const body = res.body as {
        error: { code: string; details: { field: string; messages: string[] }[] };
      };
      expect(body.error.code).toBe('VALIDATION_ERROR');
      const fields = Object.fromEntries(body.error.details.map((d) => [d.field, d.messages[0]]));
      expect(fields).toEqual({
        brideName: "Enter the bride's name.",
        groomName: "Enter the groom's name.",
        state: 'Choose the state.',
      });
      expect(await weddingsCreatedBy(userId)).toHaveLength(0);
    });

    it('refuses a wedding date in the past', async () => {
      const { cookie } = await signupVerified(app);
      const res = await create(cookie, couple({ weddingDate: '2025-02-14' }));
      expect(res.status).toBe(400);
      const details = (res.body as { error: { details: { field: string; messages: string[] }[] } })
        .error.details;
      expect(details).toEqual([
        { field: 'weddingDate', messages: ['Choose today or a later date.'] },
      ]);
    });

    it('refuses dates that do not exist and text with control characters', async () => {
      const { cookie } = await signupVerified(app);
      for (const weddingDate of [
        '2027-02-30',
        '10/12/2027',
        '1850-01-01',
        '2027-12-10T10:00:00Z',
      ]) {
        const res = await create(cookie, couple({ weddingDate }));
        expect(res.status, weddingDate).toBe(400);
      }
      const res = await create(cookie, couple({ city: 'Jai\u0000pur' }));
      expect(res.status).toBe(400);
    });

    it('takes no owner, role or address from the request', async () => {
      const { cookie, userId } = await signupVerified(app);
      const other = new Types.ObjectId().toHexString();
      for (const extra of [
        { createdBy: other },
        { role: 'manager' },
        { slug: 'my-choice' },
        { status: 'archived' },
      ]) {
        const res = await create(cookie, couple(extra));
        expect(res.status, JSON.stringify(extra)).toBe(400);
      }
      expect(await weddingsCreatedBy(userId)).toHaveLength(0);
    });

    it('requires a signed-in user with a verified email', async () => {
      const anonymous = await create(undefined, couple());
      expect(anonymous.status).toBe(401);

      const { cookie } = await signup(app);
      const unverified = await create(cookie, couple());
      expect(unverified.status).toBe(403);
      expect((unverified.body as { error: { code: string } }).error.code).toBe(
        'EMAIL_NOT_VERIFIED',
      );
    });

    it('gives a couple whose names are taken a different address', async () => {
      const names = couple();
      const first = await create((await signupVerified(app)).cookie, names);
      const second = await create((await signupVerified(app)).cookie, names);
      expect(first.status).toBe(201);
      expect(second.status).toBe(201);
      const base = (first.body as { data: { slug: string } }).data.slug;
      expect((second.body as { data: { slug: string } }).data.slug).toMatch(
        new RegExp(`^${base}-[a-z0-9]{4}$`),
      );
    });
  });

  describe('one active owned wedding per user', () => {
    it('refuses a second wedding, and a repeated submission creates nothing new', async () => {
      const { cookie, userId } = await signupVerified(app);
      const body = couple();
      expect((await create(cookie, body)).status).toBe(201);

      for (const again of [body, couple()]) {
        const res = await create(cookie, again);
        expect(res.status).toBe(409);
        expect((res.body as { error: { code: string } }).error.code).toBe('OWNER_ACTIVE_LIMIT');
      }
      expect(await weddingsCreatedBy(userId)).toHaveLength(1);
      expect(await memberships.countDocuments({ userId: new Types.ObjectId(userId) })).toBe(1);
    });

    it('lets exactly one of several simultaneous requests through', async () => {
      const { cookie, userId } = await signupVerified(app);
      const results = await Promise.all(Array.from({ length: 6 }, () => create(cookie, couple())));
      const statuses = results.map((res) => res.status).sort();
      expect(statuses).toEqual([201, 409, 409, 409, 409, 409]);

      expect(await weddingsCreatedBy(userId)).toHaveLength(1);
      expect(await memberships.countDocuments({ userId: new Types.ObjectId(userId) })).toBe(1);
    });

    it('enforces the rule in the database even when the first check is passed', async () => {
      const { cookie, userId } = await signupVerified(app);
      expect((await create(cookie, couple())).status).toBe(201);
      // As if both requests had passed the check before either wrote.
      vi.spyOn(memberships, 'exists').mockResolvedValueOnce(null);
      const res = await create(cookie, couple());
      expect(res.status).toBe(409);
      expect((res.body as { error: { code: string } }).error.code).toBe('OWNER_ACTIVE_LIMIT');
      expect(await weddingsCreatedBy(userId)).toHaveLength(1);
    });

    it('leaves nothing behind when the transaction fails', async () => {
      const { cookie, userId } = await signupVerified(app);
      vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      // The membership is written first, then the wedding fails.
      vi.spyOn(weddings, 'create').mockRejectedValueOnce(new Error('simulated failure'));
      expect((await create(cookie, couple())).status).toBe(500);

      expect(await weddingsCreatedBy(userId)).toHaveLength(0);
      expect(await memberships.countDocuments({ userId: new Types.ObjectId(userId) })).toBe(0);
      // Nothing half-written blocks a second try.
      expect((await create(cookie, couple())).status).toBe(201);
    });

    it('still allows managing other weddings, and archived weddings do not count', async () => {
      const owner = await signupVerified(app);
      const friend = await signupVerified(app);
      const ownersWedding = (await create(owner.cookie, couple())).body as { data: { id: string } };

      // The friend manages the owner's wedding (invitations come later).
      await memberships.create({
        weddingId: new Types.ObjectId(ownersWedding.data.id),
        userId: new Types.ObjectId(friend.userId),
        role: 'manager',
        status: 'active',
        activeOwned: false,
        joinedAt: new Date(),
      });
      expect((await create(friend.cookie, couple())).status).toBe(201);

      // Archiving releases the slot (PRD WED-05); simulated until archiving exists.
      await weddings.updateOne({ _id: ownersWedding.data.id }, { $set: { status: 'archived' } });
      await memberships.updateOne(
        { weddingId: new Types.ObjectId(ownersWedding.data.id), role: 'owner' },
        { $set: { activeOwned: false } },
      );
      expect((await create(owner.cookie, couple())).status).toBe(201);
    });
  });

  describe('editing a wedding', () => {
    function update(cookie: string | undefined, weddingId: string, body: unknown) {
      const req = request(app.getHttpServer()).patch(`/api/v1/weddings/${weddingId}`);
      return (cookie ? req.set('Cookie', cookie) : req).send(body as object);
    }

    async function created(cookie: string, overrides: Record<string, unknown> = {}) {
      const res = await create(cookie, couple(overrides));
      expect(res.status).toBe(201);
      return (res.body as { data: { id: string; slug: string } }).data;
    }

    it('changes only the fields sent, keeps the address, and raises the write fence', async () => {
      const { cookie } = await signupVerified(app);
      const wedding = await created(cookie, { weddingDate: '2099-01-15' });
      const res = await update(cookie, wedding.id, {
        city: '  Udaipur ',
        weddingDate: '2099-02-01',
      });
      expect(res.status).toBe(200);
      expect((res.body as { data: unknown }).data).toMatchObject({
        id: wedding.id,
        slug: wedding.slug,
        city: 'Udaipur',
        state: 'Rajasthan',
        weddingDate: '2099-02-01',
        role: 'owner',
      });
      expect((await weddings.findById(wedding.id).lean())?.writeFenceVersion).toBe(1);

      const cleared = await update(cookie, wedding.id, { weddingDate: null });
      expect((cleared.body as { data: { weddingDate?: string } }).data.weddingDate).toBeUndefined();
      expect((await weddings.findById(wedding.id).lean())?.weddingDate).toBeUndefined();
    });

    it('refuses empty or missing names, and new dates in the past', async () => {
      const { cookie } = await signupVerified(app);
      const wedding = await created(cookie);
      expect((await update(cookie, wedding.id, { brideName: '  ' })).status).toBe(400);
      expect((await update(cookie, wedding.id, { groomName: null })).status).toBe(400);
      // The address can change (decision 0017), but only to a well-formed one.
      expect((await update(cookie, wedding.id, { slug: 'Not Mine!' })).status).toBe(400);
      const past = await update(cookie, wedding.id, { weddingDate: '2024-01-01' });
      expect(past.status).toBe(400);
      expect(JSON.stringify(past.body)).toContain('Choose today or a later date.');

      // A date stored earlier may have passed; keeping it is fine.
      await weddings.updateOne(
        { _id: wedding.id },
        { $set: { weddingDate: new Date('2024-01-01') } },
      );
      const kept = await update(cookie, wedding.id, { weddingDate: '2024-01-01', city: 'Pune' });
      expect(kept.status).toBe(200);
    });

    it('is for the wedding’s members only, while it is active', async () => {
      const owner = await signupVerified(app);
      const manager = await signupVerified(app);
      const stranger = await signupVerified(app);
      const wedding = await created(owner.cookie);
      await memberships.create({
        weddingId: new Types.ObjectId(wedding.id),
        userId: new Types.ObjectId(manager.userId),
        role: 'manager',
        status: 'active',
        activeOwned: false,
        joinedAt: new Date(),
      });

      expect((await update(manager.cookie, wedding.id, { city: 'Kota' })).status).toBe(200);
      const theirs = await update(stranger.cookie, wedding.id, { city: 'Nowhere' });
      expect(theirs.status).toBe(404);
      expect((theirs.body as { error: { code: string } }).error.code).toBe('WEDDING_NOT_FOUND');
      expect((await update(undefined, wedding.id, { city: 'Nowhere' })).status).toBe(401);
      expect((await update(owner.cookie, 'not-an-id', { city: 'Nowhere' })).status).toBe(404);

      await weddings.updateOne({ _id: wedding.id }, { $set: { status: 'archived' } });
      const archived = await update(owner.cookie, wedding.id, { city: 'Pune' });
      expect((archived.body as { error: { code: string } }).error.code).toBe('WEDDING_ARCHIVED');
      expect((await weddings.findById(wedding.id).lean())?.city).toBe('Kota');
    });
  });

  describe('reading one wedding', () => {
    function get(cookie: string | undefined, weddingId: string) {
      const req = request(app.getHttpServer()).get(`/api/v1/weddings/${weddingId}`);
      return cookie ? req.set('Cookie', cookie) : req;
    }

    it('shows a member the wedding with their role, archived or not, and nobody else', async () => {
      const owner = await signupVerified(app);
      const manager = await signupVerified(app);
      const stranger = await signupVerified(app);
      const wedding = (await create(owner.cookie, couple({ weddingDate: '2099-12-10' }))).body as {
        data: { id: string; slug: string };
      };
      const id = wedding.data.id;
      await memberships.create({
        weddingId: new Types.ObjectId(id),
        userId: new Types.ObjectId(manager.userId),
        role: 'manager',
        status: 'active',
        activeOwned: false,
        joinedAt: new Date(),
      });

      const mine = await get(owner.cookie, id);
      expect(mine.status).toBe(200);
      expect((mine.body as { data: unknown }).data).toEqual({
        id,
        slug: wedding.data.slug,
        brideName: expect.stringMatching(/^Ananya /) as unknown,
        groomName: 'Arjun',
        city: 'Jaipur',
        state: 'Rajasthan',
        weddingDate: '2099-12-10',
        status: 'active',
        role: 'owner',
      });
      const managed = (await get(manager.cookie, id)).body as { data: { role: string } };
      expect(managed.data.role).toBe('manager');

      await weddings.updateOne({ _id: id }, { $set: { status: 'archived' } });
      const archived = (await get(owner.cookie, id)).body as { data: { status: string } };
      expect(archived.data.status).toBe('archived');

      // Not a member, removed, a malformed ID or an unknown one: all the same 404.
      await memberships.updateOne(
        { weddingId: new Types.ObjectId(id), userId: new Types.ObjectId(manager.userId) },
        { $set: { status: 'removed' } },
      );
      for (const [cookie, weddingId] of [
        [stranger.cookie, id],
        [manager.cookie, id],
        [owner.cookie, 'not-an-id'],
        [owner.cookie, new Types.ObjectId().toHexString()],
      ] as const) {
        const res = await get(cookie, weddingId);
        expect(res.status).toBe(404);
        expect((res.body as { error: { code: string } }).error.code).toBe('WEDDING_NOT_FOUND');
      }
    });

    it('needs a signed-in user with a verified email', async () => {
      const owner = await signupVerified(app);
      const wedding = (await create(owner.cookie, couple())).body as { data: { id: string } };
      expect((await get(undefined, wedding.data.id)).status).toBe(401);
      const unverified = await signup(app);
      expect((await get(unverified.cookie, wedding.data.id)).status).toBe(403);
    });
  });

  describe('listing weddings', () => {
    it("shows the user's weddings with their role, and nobody else's", async () => {
      const owner = await signupVerified(app);
      const manager = await signupVerified(app);
      const stranger = await signupVerified(app);

      const managed = (await create(owner.cookie, couple())).body as { data: { id: string } };
      await memberships.create({
        weddingId: new Types.ObjectId(managed.data.id),
        userId: new Types.ObjectId(manager.userId),
        role: 'manager',
        status: 'active',
        activeOwned: false,
        joinedAt: new Date(),
      });
      const own = (await create(manager.cookie, couple())).body as { data: { id: string } };

      const res = await list(manager.cookie);
      expect(res.status).toBe(200);
      const data = (res.body as { data: { id: string; role: string }[] }).data;
      expect(data.map((w) => [w.id, w.role])).toEqual([
        [own.data.id, 'owner'],
        [managed.data.id, 'manager'],
      ]);

      const empty = await list(stranger.cookie);
      expect((empty.body as { data: unknown[] }).data).toEqual([]);
    });

    it('needs a signed-in user', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/weddings');
      expect(res.status).toBe(401);
    });
  });
});
