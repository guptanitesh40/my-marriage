import { getModelToken } from '@nestjs/mongoose';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Types, type Model } from 'mongoose';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { WeddingEvent } from '../src/modules/events/schemas/event.schema.js';
import { WeddingMembership } from '../src/modules/weddings/schemas/wedding-membership.schema.js';
import { Wedding } from '../src/modules/weddings/schemas/wedding.schema.js';
import { createTestApp } from './support/app.js';
import { resetRateLimits, signup, signupVerified } from './support/auth.js';

interface EventBody {
  id: string;
  title: string;
  description?: string;
  startDate?: string;
  startTime?: string;
  startAt?: string;
  timeZone: string;
  venue?: { name?: string; address?: string };
  state: string;
  createdAt: string;
}

function errorOf(res: request.Response) {
  return (res.body as { error: { code: string; details?: { field: string }[] } }).error;
}

describe('Events (integration)', () => {
  let app: NestExpressApplication;
  let weddings: Model<Wedding>;
  let memberships: Model<WeddingMembership>;
  let events: Model<WeddingEvent>;

  beforeAll(async () => {
    app = await createTestApp();
    weddings = app.get<Model<Wedding>>(getModelToken(Wedding.name));
    memberships = app.get<Model<WeddingMembership>>(getModelToken(WeddingMembership.name));
    events = app.get<Model<WeddingEvent>>(getModelToken(WeddingEvent.name));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => resetRateLimits(app));
  afterEach(() => vi.restoreAllMocks());

  /** A verified owner with a wedding of their own. */
  async function ownerWithWedding() {
    const owner = await signupVerified(app);
    const tag = Math.random().toString(36).slice(2, 10).replace(/\d/g, 'x');
    const res = await request(app.getHttpServer())
      .post('/api/v1/weddings')
      .set('Cookie', owner.cookie)
      .send({ brideName: `Ananya ${tag}`, groomName: 'Arjun', city: 'Jaipur', state: 'Rajasthan' });
    expect(res.status).toBe(201);
    return { ...owner, weddingId: (res.body as { data: { id: string } }).data.id };
  }

  async function addManager(weddingId: string) {
    const manager = await signupVerified(app);
    await memberships.create({
      weddingId: new Types.ObjectId(weddingId),
      userId: new Types.ObjectId(manager.userId),
      role: 'manager',
      status: 'active',
      activeOwned: false,
      joinedAt: new Date(),
    });
    return manager;
  }

  function create(cookie: string | undefined, weddingId: string, body: unknown) {
    const req = request(app.getHttpServer()).post(`/api/v1/weddings/${weddingId}/events`);
    return (cookie ? req.set('Cookie', cookie) : req).send(body as object);
  }

  function list(cookie: string | undefined, weddingId: string) {
    const req = request(app.getHttpServer()).get(`/api/v1/weddings/${weddingId}/events`);
    return cookie ? req.set('Cookie', cookie) : req;
  }

  function patch(cookie: string | undefined, weddingId: string, eventId: string, body: unknown) {
    const req = request(app.getHttpServer()).patch(
      `/api/v1/weddings/${weddingId}/events/${eventId}`,
    );
    return (cookie ? req.set('Cookie', cookie) : req).send(body as object);
  }

  function remove(cookie: string | undefined, weddingId: string, eventId: string) {
    const req = request(app.getHttpServer()).delete(
      `/api/v1/weddings/${weddingId}/events/${eventId}`,
    );
    return cookie ? req.set('Cookie', cookie) : req;
  }

  async function createdId(cookie: string, weddingId: string, body: unknown) {
    const res = await create(cookie, weddingId, body);
    expect(res.status).toBe(201);
    return (res.body as { data: EventBody }).data.id;
  }

  async function fenceOf(weddingId: string) {
    return (await weddings.findById(weddingId).lean())?.writeFenceVersion;
  }

  describe('creating an event', () => {
    it('needs only a name, defaults to India time, and raises the write fence', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const before = await fenceOf(weddingId);

      const res = await create(cookie, weddingId, { title: '  Haldi  ' });
      expect(res.status).toBe(201);
      const event = (res.body as { data: EventBody }).data;
      expect(event).toEqual({
        id: expect.stringMatching(/^[0-9a-f]{24}$/) as unknown,
        title: 'Haldi',
        timeZone: 'Asia/Kolkata',
        state: 'scheduled',
        createdAt: expect.any(String) as unknown,
      });
      expect(await fenceOf(weddingId)).toBe((before ?? 0) + 1);

      const stored = await events.findById(event.id).lean();
      expect(stored?.weddingId.toHexString()).toBe(weddingId);
      expect(stored?.managerIds).toEqual([]);
      expect(stored?.scheduleVersion).toBe(0);
    });

    it('stores the day and time as an instant in the event’s time zone', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const india = (
        await create(cookie, weddingId, {
          title: 'Sangeet & Cocktail',
          description: 'Dances first,\r\nthen dinner.',
          startDate: '2099-12-13',
          startTime: '18:30',
          venue: { name: 'The Grand Ballroom', address: 'Jai Mahal Palace, Jaipur' },
        })
      ).body as { data: EventBody };
      expect(india.data).toMatchObject({
        title: 'Sangeet & Cocktail',
        description: 'Dances first,\nthen dinner.',
        startDate: '2099-12-13',
        startTime: '18:30',
        startAt: '2099-12-13T13:00:00.000Z',
        timeZone: 'Asia/Kolkata',
        venue: { name: 'The Grand Ballroom', address: 'Jai Mahal Palace, Jaipur' },
      });

      const london = (
        await create(cookie, weddingId, {
          title: 'Reception',
          startDate: '2099-07-10',
          startTime: '19:00',
          timeZone: 'Europe/London',
        })
      ).body as { data: EventBody };
      expect(london.data).toMatchObject({
        startTime: '19:00',
        startAt: '2099-07-10T18:00:00.000Z',
      });

      // A day without a time has no instant yet.
      const dayOnly = (
        await create(cookie, weddingId, { title: 'Mehendi', startDate: '2099-12-12' })
      ).body as { data: EventBody };
      expect(dayOnly.data.startDate).toBe('2099-12-12');
      expect(dayOnly.data).not.toHaveProperty('startAt');
      expect(dayOnly.data).not.toHaveProperty('startTime');
    });

    it('lets owners and managers add events, as many and as named as they like', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const manager = await addManager(weddingId);
      expect((await create(cookie, weddingId, { title: 'Haldi' })).status).toBe(201);
      expect((await create(manager.cookie, weddingId, { title: 'Haldi' })).status).toBe(201);
      expect((await create(manager.cookie, weddingId, { title: 'Nani’s Garba' })).status).toBe(201);
      const listed = (await list(cookie, weddingId)).body as { data: { events: EventBody[] } };
      expect(listed.data.events.map((e) => e.title)).toEqual(['Haldi', 'Haldi', 'Nani’s Garba']);
    });

    it.each([
      [{}, 'title'],
      [{ title: '   ' }, 'title'],
      [{ title: 'x'.repeat(81) }, 'title'],
      [{ title: 'Haldi\u0007' }, 'title'],
      [{ title: 'Haldi', description: 'x'.repeat(2001) }, 'description'],
      [{ title: 'Haldi', startDate: '2099-02-30' }, 'startDate'],
      [{ title: 'Haldi', startDate: '2020-01-01' }, 'startDate'],
      [{ title: 'Haldi', startTime: '18:30' }, 'startTime'],
      [{ title: 'Haldi', startDate: '2099-12-13', startTime: '6:30 pm' }, 'startTime'],
      [{ title: 'Haldi', timeZone: 'IST' }, 'timeZone'],
      [{ title: 'Haldi', timeZone: '+05:30' }, 'timeZone'],
      [{ title: 'Haldi', venue: { name: 'x'.repeat(121) } }, 'venue.name'],
      [{ title: 'Haldi', venue: 'Rambagh' }, 'venue'],
      [{ title: 'Haldi', venue: { mapsUrl: 'https://maps.example' } }, 'venue.mapsUrl'],
      [{ title: 'Haldi', weddingId: new Types.ObjectId().toHexString() }, 'weddingId'],
      [{ title: 'Haldi', state: 'completed' }, 'state'],
      [{ title: 'Haldi', managerIds: [] }, 'managerIds'],
    ])('refuses %j, naming the field', async (body, field) => {
      const { cookie, weddingId } = await ownerWithWedding();
      const res = await create(cookie, weddingId, body);
      expect(res.status).toBe(400);
      expect(errorOf(res).code).toBe('VALIDATION_ERROR');
      expect(errorOf(res).details?.map((d) => d.field)).toContain(field);
      expect(await events.countDocuments({ weddingId: new Types.ObjectId(weddingId) })).toBe(0);
    });

    it('is read-only once the wedding is archived, and writes nothing', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      await create(cookie, weddingId, { title: 'Haldi' });
      await weddings.updateOne({ _id: weddingId }, { $set: { status: 'archived' } });
      const before = await fenceOf(weddingId);

      const res = await create(cookie, weddingId, { title: 'Mehendi' });
      expect(res.status).toBe(409);
      expect(errorOf(res).code).toBe('WEDDING_ARCHIVED');
      expect(await fenceOf(weddingId)).toBe(before);
      // Still readable.
      const listed = (await list(cookie, weddingId)).body as { data: { events: EventBody[] } };
      expect(listed.data.events.map((e) => e.title)).toEqual(['Haldi']);
    });

    it('refuses an event when the wedding is archived between the check and the write', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      // The access check reads the wedding as active; it is archived just after.
      const findById = weddings.findById.bind(weddings);
      vi.spyOn(weddings, 'findById').mockImplementationOnce(
        (id: unknown) =>
          ({
            lean: async () => {
              const wedding = await findById(id).lean();
              await weddings.updateOne({ _id: weddingId }, { $set: { status: 'archived' } });
              return wedding;
            },
          }) as never,
      );
      const res = await create(cookie, weddingId, { title: 'Haldi' });
      expect(res.status).toBe(409);
      expect(await events.countDocuments({ weddingId: new Types.ObjectId(weddingId) })).toBe(0);
    });

    it('leaves the write fence alone when saving the event fails', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const before = await fenceOf(weddingId);
      vi.spyOn(events, 'create').mockRejectedValueOnce(new Error('disk full'));
      const res = await create(cookie, weddingId, { title: 'Haldi' });
      expect(res.status).toBe(500);
      expect(await fenceOf(weddingId)).toBe(before);
    });
  });

  describe('listing events', () => {
    it('lists by day, then time, then the order added; events without a day last', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      for (const body of [
        { title: 'No date yet' },
        { title: 'Wedding', startDate: '2099-12-14', startTime: '16:00' },
        { title: 'Mehendi evening', startDate: '2099-12-12', startTime: '16:30' },
        { title: 'Haldi morning', startDate: '2099-12-12', startTime: '10:00' },
        { title: 'Also undated' },
        { title: 'Reception', startDate: '2099-12-15' },
      ]) {
        expect((await create(cookie, weddingId, body)).status).toBe(201);
      }
      const res = await list(cookie, weddingId);
      expect(res.status).toBe(200);
      const data = (res.body as { data: { events: EventBody[]; truncated: boolean } }).data;
      expect(data.truncated).toBe(false);
      expect(data.events.map((e) => e.title)).toEqual([
        'Haldi morning',
        'Mehendi evening',
        'Wedding',
        'Reception',
        'No date yet',
        'Also undated',
      ]);
    });

    it('says when there are more events than it returns', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      await events.insertMany(
        Array.from({ length: 101 }, (_, i) => ({
          weddingId: new Types.ObjectId(weddingId),
          title: `Event ${i}`,
          timeZone: 'Asia/Kolkata',
          state: 'scheduled',
          managerIds: [],
          scheduleVersion: 0,
        })),
      );
      const data = (
        (await list(cookie, weddingId)).body as {
          data: { events: EventBody[]; truncated: boolean };
        }
      ).data;
      expect(data.events).toHaveLength(100);
      expect(data.truncated).toBe(true);
    });

    it('shows a wedding’s events to its members only, and nothing of other weddings', async () => {
      const a = await ownerWithWedding();
      const b = await ownerWithWedding();
      const manager = await addManager(a.weddingId);
      await create(a.cookie, a.weddingId, { title: 'Haldi of A' });
      await create(b.cookie, b.weddingId, { title: 'Haldi of B' });

      const ofB = (await list(b.cookie, b.weddingId)).body as { data: { events: EventBody[] } };
      expect(ofB.data.events.map((e) => e.title)).toEqual(['Haldi of B']);
      const managed = (await list(manager.cookie, a.weddingId)).body as {
        data: { events: EventBody[] };
      };
      expect(managed.data.events.map((e) => e.title)).toEqual(['Haldi of A']);

      // B, a removed manager, a malformed ID and an unknown one: the same 404, on both routes.
      await memberships.updateOne(
        { weddingId: new Types.ObjectId(a.weddingId), userId: new Types.ObjectId(manager.userId) },
        { $set: { status: 'removed' } },
      );
      for (const [cookie, weddingId] of [
        [b.cookie, a.weddingId],
        [manager.cookie, a.weddingId],
        [a.cookie, 'not-an-id'],
        [a.cookie, new Types.ObjectId().toHexString()],
      ] as const) {
        for (const res of [
          await list(cookie, weddingId),
          await create(cookie, weddingId, { title: 'Intruder' }),
        ]) {
          expect(res.status).toBe(404);
          expect(errorOf(res).code).toBe('WEDDING_NOT_FOUND');
        }
      }
      expect(await events.countDocuments({ title: 'Intruder' })).toBe(0);
    });

    it('needs a signed-in user with a verified email', async () => {
      const { weddingId } = await ownerWithWedding();
      expect((await list(undefined, weddingId)).status).toBe(401);
      expect((await create(undefined, weddingId, { title: 'Haldi' })).status).toBe(401);
      const unverified = await signup(app);
      expect((await list(unverified.cookie, weddingId)).status).toBe(403);
    });
  });

  describe('editing an event', () => {
    it('changes only the fields given, clears those set to null, and raises the write fence', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const id = await createdId(cookie, weddingId, {
        title: 'Haldi',
        description: 'By the pool.',
        startDate: '2099-12-12',
        startTime: '10:00',
        venue: { name: 'Rambagh Palace', address: 'Jaipur' },
      });
      const before = await fenceOf(weddingId);

      const renamed = await patch(cookie, weddingId, id, { title: '  Haldi  & Pithi ' });
      expect(renamed.status).toBe(200);
      expect((renamed.body as { data: EventBody }).data).toMatchObject({
        id,
        title: 'Haldi & Pithi',
        description: 'By the pool.',
        startDate: '2099-12-12',
        startTime: '10:00',
        venue: { name: 'Rambagh Palace', address: 'Jaipur' },
      });
      expect(await fenceOf(weddingId)).toBe((before ?? 0) + 1);
      // A new name does not move reminders.
      expect((await events.findById(id).lean())?.scheduleVersion).toBe(0);

      const cleared = await patch(cookie, weddingId, id, {
        description: null,
        venue: null,
        startTime: null,
      });
      expect(cleared.status).toBe(200);
      const event = (cleared.body as { data: EventBody }).data;
      expect(event.description).toBeUndefined();
      expect(event.venue).toBeUndefined();
      expect(event.startTime).toBeUndefined();
      expect(event.startAt).toBeUndefined();
      expect(event.startDate).toBe('2099-12-12');
      const stored = await events.findById(id).lean();
      expect(stored?.startAt).toBeUndefined();
      expect(stored?.scheduleVersion).toBe(1);
    });

    it('keeps the clock reading when the zone changes, and removes the time with the day', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const id = await createdId(cookie, weddingId, {
        title: 'Wedding',
        startDate: '2099-12-12',
        startTime: '10:00',
      });

      const london = (await patch(cookie, weddingId, id, { timeZone: 'Europe/London' })).body as {
        data: EventBody;
      };
      expect(london.data).toMatchObject({
        startDate: '2099-12-12',
        startTime: '10:00',
        startAt: '2099-12-12T10:00:00.000Z',
        timeZone: 'Europe/London',
      });

      const moved = (await patch(cookie, weddingId, id, { startTime: '16:45' })).body as {
        data: EventBody;
      };
      expect(moved.data.startAt).toBe('2099-12-12T16:45:00.000Z');

      const undated = (await patch(cookie, weddingId, id, { startDate: null })).body as {
        data: EventBody;
      };
      expect(undated.data.startDate).toBeUndefined();
      expect(undated.data.startTime).toBeUndefined();

      const timeAlone = await patch(cookie, weddingId, id, { startTime: '09:00' });
      expect(timeAlone.status).toBe(400);
      expect(errorOf(timeAlone).details?.map((d) => d.field)).toEqual(['startTime']);
    });

    it('keeps a day that has passed, but refuses moving to one', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const id = await createdId(cookie, weddingId, { title: 'Mehendi', startDate: '2099-12-11' });
      await events.updateOne({ _id: id }, { $set: { startDate: new Date('2020-01-10') } });

      const kept = await patch(cookie, weddingId, id, {
        startDate: '2020-01-10',
        state: 'completed',
      });
      expect(kept.status).toBe(200);
      expect((kept.body as { data: EventBody }).data.state).toBe('completed');

      const moved = await patch(cookie, weddingId, id, { startDate: '2020-01-11' });
      expect(moved.status).toBe(400);
      expect(errorOf(moved).details?.map((d) => d.field)).toEqual(['startDate']);
    });

    it('marks an event cancelled or completed, and refuses what cannot be stored', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const id = await createdId(cookie, weddingId, { title: 'Garba' });

      const cancelled = await patch(cookie, weddingId, id, { state: 'cancelled' });
      expect((cancelled.body as { data: EventBody }).data.state).toBe('cancelled');
      expect((await events.findById(id).lean())?.scheduleVersion).toBe(1);

      for (const [body, field] of [
        [{ title: null }, 'title'],
        [{ title: '   ' }, 'title'],
        [{ timeZone: null }, 'timeZone'],
        [{ timeZone: 'IST' }, 'timeZone'],
        [{ state: 'deleted' }, 'state'],
        [{ startTime: '25:00' }, 'startTime'],
        [{ venue: 'Jaipur' }, 'venue'],
        [{ deletedAt: '2020-01-01' }, 'deletedAt'],
      ] as const) {
        const res = await patch(cookie, weddingId, id, body);
        expect(res.status, JSON.stringify(body)).toBe(400);
        expect(errorOf(res).details?.map((d) => d.field)).toContain(field);
      }
      const stored = await events.findById(id).lean();
      expect(stored?.title).toBe('Garba');
      expect(stored?.deletedAt).toBeUndefined();
    });

    it('lets managers edit, and finds only the wedding’s own events', async () => {
      const a = await ownerWithWedding();
      const b = await ownerWithWedding();
      const manager = await addManager(a.weddingId);
      const ofA = await createdId(a.cookie, a.weddingId, { title: 'Haldi' });
      const ofB = await createdId(b.cookie, b.weddingId, { title: 'Haldi of B' });

      const edited = await patch(manager.cookie, a.weddingId, ofA, { title: 'Haldi Ceremony' });
      expect(edited.status).toBe(200);

      // B's event through A's wedding, a malformed ID and an unknown one.
      for (const eventId of [ofB, 'not-an-id', new Types.ObjectId().toHexString()]) {
        const res = await patch(a.cookie, a.weddingId, eventId, { title: 'Intruder' });
        expect(res.status).toBe(404);
        expect(errorOf(res).code).toBe('EVENT_NOT_FOUND');
      }
      const notMember = await patch(b.cookie, a.weddingId, ofA, { title: 'Intruder' });
      expect(errorOf(notMember).code).toBe('WEDDING_NOT_FOUND');
      expect(await events.countDocuments({ title: 'Intruder' })).toBe(0);
      expect((await events.findById(ofB).lean())?.title).toBe('Haldi of B');
    });

    it('is read-only once the wedding is archived', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const id = await createdId(cookie, weddingId, { title: 'Haldi' });
      await weddings.updateOne({ _id: weddingId }, { $set: { status: 'archived' } });
      const before = await fenceOf(weddingId);

      const res = await patch(cookie, weddingId, id, { title: 'Mehendi' });
      expect(res.status).toBe(409);
      expect(errorOf(res).code).toBe('WEDDING_ARCHIVED');
      expect((await events.findById(id).lean())?.title).toBe('Haldi');
      expect(await fenceOf(weddingId)).toBe(before);
    });
  });

  describe('deleting an event', () => {
    it('keeps the record, marked deleted, and leaves it out from then on', async () => {
      const { cookie, weddingId, userId } = await ownerWithWedding();
      const id = await createdId(cookie, weddingId, { title: 'Haldi' });
      await create(cookie, weddingId, { title: 'Mehendi' });
      const before = await fenceOf(weddingId);

      const res = await remove(cookie, weddingId, id);
      expect(res.status).toBe(204);
      expect(res.text).toBe('');
      expect(await fenceOf(weddingId)).toBe((before ?? 0) + 1);

      const stored = await events.findById(id).lean();
      expect(stored?.title).toBe('Haldi');
      expect(stored?.deletedAt).toBeInstanceOf(Date);
      expect(stored?.deletedBy?.toHexString()).toBe(userId);

      const listed = (await list(cookie, weddingId)).body as { data: { events: EventBody[] } };
      expect(listed.data.events.map((e) => e.title)).toEqual(['Mehendi']);
      for (const again of [
        await remove(cookie, weddingId, id),
        await patch(cookie, weddingId, id, { title: 'Back' }),
      ]) {
        expect(again.status).toBe(404);
        expect(errorOf(again).code).toBe('EVENT_NOT_FOUND');
      }
    });

    it('is for owners only', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const manager = await addManager(weddingId);
      const id = await createdId(cookie, weddingId, { title: 'Haldi' });

      const res = await remove(manager.cookie, weddingId, id);
      expect(res.status).toBe(403);
      expect(errorOf(res).code).toBe('OWNER_REQUIRED');
      expect((await events.findById(id).lean())?.deletedAt).toBeUndefined();
    });

    it('finds only the wedding’s own events, and is refused once archived', async () => {
      const a = await ownerWithWedding();
      const b = await ownerWithWedding();
      const ofA = await createdId(a.cookie, a.weddingId, { title: 'Haldi' });
      const ofB = await createdId(b.cookie, b.weddingId, { title: 'Haldi of B' });

      const across = await remove(a.cookie, a.weddingId, ofB);
      expect(errorOf(across).code).toBe('EVENT_NOT_FOUND');
      const notMember = await remove(b.cookie, a.weddingId, ofA);
      expect(errorOf(notMember).code).toBe('WEDDING_NOT_FOUND');
      expect((await events.findById(ofB).lean())?.deletedAt).toBeUndefined();

      await weddings.updateOne({ _id: a.weddingId }, { $set: { status: 'archived' } });
      const archived = await remove(a.cookie, a.weddingId, ofA);
      expect(archived.status).toBe(409);
      expect((await events.findById(ofA).lean())?.deletedAt).toBeUndefined();
    });

    it('needs a signed-in user', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const id = await createdId(cookie, weddingId, { title: 'Haldi' });
      expect((await patch(undefined, weddingId, id, { title: 'X' })).status).toBe(401);
      expect((await remove(undefined, weddingId, id)).status).toBe(401);
    });
  });
});
