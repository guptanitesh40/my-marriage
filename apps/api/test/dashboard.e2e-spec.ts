import { getModelToken } from '@nestjs/mongoose';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Types, type Model } from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { WeddingEvent } from '../src/modules/events/schemas/event.schema.js';
import { EventInvitation } from '../src/modules/guests/schemas/event-invitation.schema.js';
import { ModerationService } from '../src/modules/media/moderation.service.js';
import { Photo } from '../src/modules/media/schemas/photo.schema.js';
import { WeddingMembership } from '../src/modules/weddings/schemas/wedding-membership.schema.js';
import { todayInIndia } from '../src/modules/weddings/wedding-policy.js';
import { createTestApp } from './support/app.js';
import { resetRateLimits, signupVerified } from './support/auth.js';

const dataOf = <T>(res: request.Response): T => (res.body as { data: T }).data;
const guestIdOf = (res: request.Response): string =>
  dataOf<{ guest: { id: string } }>(res).guest.id;

interface Dashboard {
  wedding: { id: string; status: string; mainVenue?: { name?: string } };
  today: string;
  ceremonies?: {
    upcoming: number;
    undated: number;
    next: { id: string; title: string; startDate: string; confirmedPeople?: number }[];
  };
  tasks?: {
    open: number;
    overdue: number;
    dueSoon: number;
    attention: { title: string; overdue: boolean }[];
  };
  expenses?: {
    finalPaise: number;
    paidPaise: number;
    outstandingPaise: number;
    count: number;
    topCategories: { category: string; finalPaise: number; count: number }[];
  };
  guests?: {
    contacts: number;
    invitedPeople: number;
    answered: number;
    pending: number;
    events: { eventId: string; confirmedPeople: number; attending: number; maybe: number }[];
  };
  photos?: { awaitingReview: number; approved: number; usedBytes: number; limitBytes: number };
  website?: { published: boolean; slug: string };
  team?: { owners: number; admins: number; managers: number; pendingInvites?: number };
  unavailable: string[];
}

/** `YYYY-MM-DD`, `days` from today in India. */
function day(days: number): string {
  const today = new Date(`${todayInIndia()}T00:00:00Z`);
  return new Date(today.getTime() + days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * The wedding overview (PRD DASH-01 to DASH-03, decision 0022): its numbers
 * follow the same rules as the pages they summarise, it is for members
 * only, and one section failing never hides the others.
 */
describe('Wedding overview (integration)', () => {
  let app: NestExpressApplication;
  let memberships: Model<WeddingMembership>;
  let invitations: Model<EventInvitation>;
  let photos: Model<Photo>;
  let events: Model<WeddingEvent>;

  beforeAll(async () => {
    app = await createTestApp();
    memberships = app.get<Model<WeddingMembership>>(getModelToken(WeddingMembership.name));
    invitations = app.get<Model<EventInvitation>>(getModelToken(EventInvitation.name));
    photos = app.get<Model<Photo>>(getModelToken(Photo.name));
    events = app.get<Model<WeddingEvent>>(getModelToken(WeddingEvent.name));
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
    const base = `/weddings/${wedding.id}`;
    const dashboard = async (who = api) => {
      const got = await who.get(`${base}/dashboard`);
      expect(got.status, JSON.stringify(got.body)).toBe(200);
      return dataOf<Dashboard>(got);
    };
    return { ...owner, api, weddingId: wedding.id, base, dashboard };
  }

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

  async function addEvent(w: Awaited<ReturnType<typeof ownerWithWedding>>, body: object) {
    const res = await w.api.post(`${w.base}/events`, body);
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    return dataOf<{ id: string }>(res).id;
  }

  async function answer(guestId: string, eventId: string, status: string, attendingCount?: number) {
    await invitations.updateOne(
      { guestId: new Types.ObjectId(guestId), eventId: new Types.ObjectId(eventId) },
      { $set: { rsvp: { status, ...(attendingCount !== undefined ? { attendingCount } : {}) } } },
    );
  }

  it('starts empty for a new wedding, with zero counts rather than missing sections', async () => {
    const w = await ownerWithWedding();
    const got = await w.dashboard();
    expect(got.today).toBe(todayInIndia());
    expect(got.unavailable).toEqual([]);
    expect(got.ceremonies).toEqual({ upcoming: 0, undated: 0, next: [] });
    expect(got.tasks).toEqual({ open: 0, overdue: 0, dueSoon: 0, attention: [] });
    expect(got.expenses).toMatchObject({
      finalPaise: 0,
      paidPaise: 0,
      count: 0,
      topCategories: [],
    });
    expect(got.guests).toMatchObject({ contacts: 0, invitedPeople: 0, events: [] });
    expect(got.photos).toMatchObject({ awaitingReview: 0, approved: 0, usedBytes: 0 });
    expect(got.photos?.limitBytes).toBe(5_000_000_000);
    expect(got.website?.published).toBe(false);
    expect(got.team).toEqual({ owners: 1, admins: 0, managers: 0, pendingInvites: 0 });
  });

  it('lists ceremonies to come by their real start, leaving out cancelled, completed, past and undated ones', async () => {
    const w = await ownerWithWedding();
    // 09:00 in London is 14:30 in India: after the 12:00 Haldi in Jaipur.
    const london = await addEvent(w, {
      title: 'Reception in London',
      startDate: day(3),
      startTime: '09:00',
      timeZone: 'Europe/London',
    });
    const haldi = await addEvent(w, { title: 'Haldi', startDate: day(3), startTime: '12:00' });
    const today = await addEvent(w, { title: 'Puja', startDate: day(0) });
    const past = await addEvent(w, { title: 'Tilak', startDate: day(0) });
    await events.updateOne(
      { _id: new Types.ObjectId(past) },
      { $set: { startDate: new Date(`${day(-2)}T00:00:00Z`) } },
    );
    await addEvent(w, { title: 'Undated', startDate: undefined });
    const cancelled = await addEvent(w, { title: 'Garba', startDate: day(5) });
    await w.api.patch(`${w.base}/events/${cancelled}`, { state: 'cancelled' }).expect(200);
    const done = await addEvent(w, { title: 'Roka', startDate: day(1) });
    await w.api.patch(`${w.base}/events/${done}`, { state: 'completed' }).expect(200);
    for (const title of ['Sangeet', 'Wedding']) {
      await addEvent(w, { title, startDate: day(10) });
    }

    const { ceremonies } = await w.dashboard();
    expect(ceremonies?.upcoming).toBe(5);
    expect(ceremonies?.undated).toBe(1);
    expect(ceremonies?.next.map((event) => event.id).slice(0, 3)).toEqual([today, haldi, london]);
    expect(ceremonies?.next).toHaveLength(4);
  });

  it('counts contacts, people once each, and only attending people as confirmed', async () => {
    const w = await ownerWithWedding();
    const haldi = await addEvent(w, { title: 'Haldi', startDate: day(20) });
    const wedding = await addEvent(w, { title: 'Wedding', startDate: day(21) });
    const family = guestIdOf(
      await w.api
        .post(`${w.base}/guests`, {
          name: 'Sharma family',
          partySize: 5,
          eventIds: [haldi, wedding],
        })
        .expect(201),
    );
    const maybe = guestIdOf(
      await w.api
        .post(`${w.base}/guests`, { name: 'Verma family', partySize: 4, eventIds: [haldi] })
        .expect(201),
    );
    const declined = guestIdOf(
      await w.api
        .post(`${w.base}/guests`, { name: 'Mehta', partySize: 2, eventIds: [haldi] })
        .expect(201),
    );
    // A contact with no invitation adds a contact but no people.
    await w.api.post(`${w.base}/guests`, { name: 'Kapoor', partySize: 3 }).expect(201);

    await answer(family, haldi, 'attending', 3);
    await answer(family, wedding, 'attending', 5);
    await answer(maybe, haldi, 'maybe', 4);
    await answer(declined, haldi, 'not_attending', 0);

    const got = await w.dashboard();
    expect(got.guests).toMatchObject({ contacts: 4, invitedPeople: 11, answered: 4, pending: 0 });
    const confirmed = new Map(got.ceremonies?.next.map((e) => [e.id, e.confirmedPeople]));
    // 3 at the Haldi and 5 at the wedding: never added up to 8, and maybe is not confirmed.
    expect(confirmed.get(haldi)).toBe(3);
    expect(confirmed.get(wedding)).toBe(5);
    const perEvent = new Map(got.guests?.events.map((e) => [e.eventId, e]));
    expect(perEvent.get(haldi)).toMatchObject({ confirmedPeople: 3, attending: 1, maybe: 1 });
  });

  it('counts open, overdue and due-soon tasks and lists overdue ones first', async () => {
    const w = await ownerWithWedding();
    const add = (body: object) => w.api.post(`${w.base}/tasks`, body).expect(201);
    await add({ title: 'Book the band', dueDate: day(-3) });
    await add({ title: 'Send cards', dueDate: day(2), priority: 'high' });
    await add({ title: 'Order sweets', dueDate: day(7) });
    await add({ title: 'Pick jewellery', dueDate: day(8) });
    await add({ title: 'Someday', priority: 'high' });
    await add({ title: 'Done already', dueDate: day(-5), state: 'completed' });
    await add({ title: 'Dropped', dueDate: day(-5), state: 'cancelled' });

    const { tasks } = await w.dashboard();
    expect(tasks).toMatchObject({ open: 5, overdue: 1, dueSoon: 2 });
    expect(tasks?.attention.map((task) => task.title)).toEqual([
      'Book the band',
      'Send cards',
      'Order sweets',
      'Pick jewellery',
    ]);
    expect(tasks?.attention[0]?.overdue).toBe(true);
  });

  it('adds money in integer paise and ranks categories as typed in any case', async () => {
    const w = await ownerWithWedding();
    const add = async (title: string, category: string, amountPaise: number) =>
      dataOf<{ id: string }>(
        await w.api.post(`${w.base}/expenses`, { title, category, amountPaise }).expect(201),
      ).id;
    const venue = await add('Palace lawns', 'Venue', 50_000_000);
    const caterer = await add('Caterer', 'Catering', 25_000_000);
    await add('Sweets', 'catering', 5_000_000);
    await add('Flowers', 'Decor', 4_000_000);
    await add('Band', 'Music', 1_000_000);
    const pay = (id: string, amountPaise: number) =>
      w.api.post(`${w.base}/expenses/${id}/payments`, { amountPaise, paidAt: day(0) }).expect(201);
    await pay(venue, 50_000_000);
    await pay(caterer, 2_500_000);

    const { expenses } = await w.dashboard();
    // ₹8,50,000 recorded and ₹5,25,000 paid leave ₹3,25,000 outstanding.
    expect(expenses).toMatchObject({
      finalPaise: 85_000_000,
      paidPaise: 52_500_000,
      outstandingPaise: 32_500_000,
      count: 5,
    });
    expect(expenses?.topCategories).toEqual([
      { category: 'Venue', finalPaise: 50_000_000, count: 1 },
      { category: 'Catering', finalPaise: 30_000_000, count: 2 },
      { category: 'Decor', finalPaise: 4_000_000, count: 1 },
    ]);
  });

  it('counts photos waiting for review and the team by role; invitations only for those who manage the team', async () => {
    const w = await ownerWithWedding();
    const weddingId = new Types.ObjectId(w.weddingId);
    await photos.collection.insertMany([
      { weddingId, moderation: 'pending' },
      { weddingId, moderation: 'pending' },
      { weddingId, moderation: 'approved' },
      { weddingId, moderation: 'rejected' },
    ]);
    await member(w.weddingId, 'owner', 'Arjun Mehta');
    const admin = await member(w.weddingId, 'admin', 'Ramesh Kumar');
    const manager = await member(w.weddingId, 'manager', 'Kavya Sharma');
    await w.api
      .post(`${w.base}/member-invites`, {
        email: `planner-${Date.now()}@example.com`,
        role: 'manager',
      })
      .expect(201);

    const owner = await w.dashboard();
    expect(owner.photos).toMatchObject({ awaitingReview: 2, approved: 1 });
    expect(owner.team).toEqual({ owners: 2, admins: 1, managers: 1, pendingInvites: 1 });
    expect((await w.dashboard(admin.api)).team?.pendingInvites).toBe(1);
    const managerView = await w.dashboard(manager.api);
    expect(managerView.team).toEqual({ owners: 2, admins: 1, managers: 1 });
    expect(managerView.wedding.status).toBe('active');
  });

  it('answers 404 to anyone outside the wedding, and shows nothing of another wedding', async () => {
    const a = await ownerWithWedding();
    const b = await ownerWithWedding();
    await a.api.post(`${a.base}/tasks`, { title: 'Private task' }).expect(201);
    const res = await b.api.get(`${a.base}/dashboard`);
    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).not.toContain('Private task');
    expect((await b.dashboard()).tasks?.open).toBe(0);
    await request(server()).get(`/api/v1${a.base}/dashboard`).expect(401);
  });

  it('stays readable when archived, and still shows the published website', async () => {
    const w = await ownerWithWedding();
    await addEvent(w, { title: 'Mehendi', startDate: day(30) });
    await w.api
      .patch(`${w.base}/website`, { content: { headline: 'Welcome', faq: [] }, contentVersion: 0 })
      .expect(200);
    await w.api.post(`${w.base}/website/publish`, { contentVersion: 1 }).expect(200);
    await w.api.post(`${w.base}/archive`).expect(200);
    const got = await w.dashboard();
    expect(got.wedding.status).toBe('archived');
    expect(got.website?.published).toBe(true);
    expect(got.unavailable).toEqual([]);
  });

  it('leaves out a section that fails and names it, and still loads the rest', async () => {
    const w = await ownerWithWedding();
    await w.api.post(`${w.base}/tasks`, { title: 'Still here' }).expect(201);
    const spy = vi
      .spyOn(app.get(ModerationService), 'counts')
      .mockRejectedValueOnce(new Error('photos store down'));
    try {
      const got = await w.dashboard();
      expect(got.unavailable).toEqual(['photos']);
      expect(got.photos).toBeUndefined();
      expect(got.tasks?.open).toBe(1);
      expect(got.ceremonies).toBeDefined();
    } finally {
      spy.mockRestore();
    }
  });
});
