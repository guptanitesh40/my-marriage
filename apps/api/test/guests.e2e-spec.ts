import { getModelToken } from '@nestjs/mongoose';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Types, type Model } from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { GuestInviteComposer } from '../src/modules/guests/guest-invite.composer.js';
import { GuestsModule } from '../src/modules/guests/guests.module.js';
import { EventInvitation } from '../src/modules/guests/schemas/event-invitation.schema.js';
import { GuestContact } from '../src/modules/guests/schemas/guest-contact.schema.js';
import { InvitationToken } from '../src/modules/guests/schemas/invitation-token.schema.js';
import { Notification } from '../src/modules/notifications/notification.schema.js';
import { OutboxEvent } from '../src/platform/outbox/outbox-event.schema.js';
import { WeddingMembership } from '../src/modules/weddings/schemas/wedding-membership.schema.js';
import { Wedding } from '../src/modules/weddings/schemas/wedding.schema.js';
import { createTestApp } from './support/app.js';
import { resetRateLimits, signupVerified } from './support/auth.js';
import { createTestWorker, waitFor, type TestWorker } from './support/worker.js';

interface InvitationBody {
  id: string;
  eventId: string;
  title: string;
  available: boolean;
  cancelled: boolean;
  rsvp: { status: string; attendingCount?: number; responseVersion: number };
  history?: { status: string; attendingCount?: number }[];
}

interface GuestBody {
  id: string;
  name: string;
  partySize: number;
  email?: string;
  phone?: string;
  organizerNotes?: string;
  invitations: InvitationBody[];
  link: { status: string; secretUrl?: string };
  lastEmail?: { state: string };
}

interface DetailBody {
  guest: GuestBody;
  invitations: InvitationBody[];
}

interface ViewBody {
  coupleName: string;
  guestName: string;
  partySize: number;
  writable: boolean;
  templateId: string;
  place: string;
  slug: string;
  events: {
    invitationId: string;
    title: string;
    cancelled: boolean;
    venueName?: string;
    dressCode?: string;
    rsvp: { status: string; attendingCount?: number; responseVersion: number };
  }[];
}

function errorOf(res: request.Response) {
  return (res.body as { error: { code: string; message: string; details?: { field: string }[] } })
    .error;
}

function fieldsOf(res: request.Response) {
  return errorOf(res).details?.map((d) => d.field) ?? [];
}

const tokenOf = (url: string) => url.split('#t=')[1] ?? '';

describe('Guests and RSVP (integration)', () => {
  let app: NestExpressApplication;
  let worker: TestWorker;
  let weddings: Model<Wedding>;
  let memberships: Model<WeddingMembership>;
  let guests: Model<GuestContact>;
  let invitations: Model<EventInvitation>;
  let tokens: Model<InvitationToken>;
  let notifications: Model<Notification>;
  let outbox: Model<OutboxEvent>;

  beforeAll(async () => {
    app = await createTestApp();
    worker = await createTestWorker({ imports: [GuestsModule], composers: [GuestInviteComposer] });
    weddings = app.get<Model<Wedding>>(getModelToken(Wedding.name));
    memberships = app.get<Model<WeddingMembership>>(getModelToken(WeddingMembership.name));
    guests = app.get<Model<GuestContact>>(getModelToken(GuestContact.name));
    invitations = app.get<Model<EventInvitation>>(getModelToken(EventInvitation.name));
    tokens = app.get<Model<InvitationToken>>(getModelToken(InvitationToken.name));
    notifications = app.get<Model<Notification>>(getModelToken(Notification.name));
    outbox = app.get<Model<OutboxEvent>>(getModelToken(OutboxEvent.name));
  });

  afterAll(async () => {
    await worker.context.close();
    await app.close();
  });

  beforeEach(() => resetRateLimits(app));

  const server = () => app.getHttpServer();
  const base = (weddingId: string) => `/api/v1/weddings/${weddingId}/guests`;

  async function ownerWithWedding(name = 'Ananya Sharma') {
    const owner = await signupVerified(app, { displayName: name });
    const tag = Math.random().toString(36).slice(2, 10).replace(/\d/g, 'x');
    const res = await request(server())
      .post('/api/v1/weddings')
      .set('Cookie', owner.cookie)
      .send({ brideName: `Ananya ${tag}`, groomName: 'Arjun', city: 'Jaipur', state: 'Rajasthan' });
    expect(res.status).toBe(201);
    return { ...owner, weddingId: (res.body as { data: { id: string } }).data.id };
  }

  async function addManager(weddingId: string) {
    const manager = await signupVerified(app, { displayName: 'Rajesh Mehta' });
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

  async function eventIn(cookie: string, weddingId: string, body: object) {
    const res = await request(server())
      .post(`/api/v1/weddings/${weddingId}/events`)
      .set('Cookie', cookie)
      .send(body);
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    return (res.body as { data: { id: string } }).data.id;
  }

  function send(
    method: 'get' | 'post' | 'patch' | 'put' | 'delete',
    cookie: string | undefined,
    path: string,
    body?: unknown,
  ) {
    const req = request(server())[method](path);
    const withCookie = cookie ? req.set('Cookie', cookie) : req;
    return body === undefined ? withCookie : withCookie.send(body as object);
  }

  async function added(cookie: string, weddingId: string, body: object) {
    const res = await send('post', cookie, base(weddingId), body);
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    return (res.body as { data: DetailBody }).data.guest;
  }

  async function list(cookie: string, weddingId: string) {
    const res = await send('get', cookie, base(weddingId));
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    return (res.body as { data: { guests: GuestBody[]; totals: Record<string, unknown> } }).data;
  }

  async function linkOf(cookie: string, weddingId: string, guestId: string, reissue = false) {
    const res = await send('post', cookie, `${base(weddingId)}/${guestId}/invitation-links`, {
      ...(reissue ? { reissue: true } : {}),
    });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    const data = (res.body as { data: { status: string; secretUrl: string } }).data;
    return { status: data.status, url: data.secretUrl };
  }

  /** Opens a link as a guest would: exchanges its secret for a guest cookie. */
  async function open(url: string) {
    const res = await request(server())
      .post('/api/v1/guest-access/exchange')
      .send({ token: tokenOf(url) });
    if (res.status !== 204) return { res, cookie: '' };
    const set = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
    const cookie = set.find((c) => c.startsWith('mm_guest_session='))?.split(';')[0] ?? '';
    return { res, cookie };
  }

  function view(guestCookie: string) {
    return send('get', guestCookie, '/api/v1/guest-access/invitation');
  }

  async function viewed(guestCookie: string) {
    const res = await view(guestCookie);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    return (res.body as { data: ViewBody }).data;
  }

  function answer(guestCookie: string, invitationId: string, body: object) {
    return send('patch', guestCookie, `/api/v1/guest-access/events/${invitationId}/rsvp`, body);
  }

  async function fenceOf(weddingId: string) {
    return (await weddings.findById(weddingId).lean())?.writeFenceVersion;
  }

  /** Rajesh (5, Haldi and Wedding), Priya (2, Sangeet and Reception), Kavya (4, none). */
  async function plannedWedding() {
    const owner = await ownerWithWedding();
    const { cookie, weddingId } = owner;
    const haldi = await eventIn(cookie, weddingId, {
      title: 'Haldi',
      startDate: '2031-02-18',
      startTime: '10:00',
      venue: { name: 'Poolside lawn' },
    });
    const sangeet = await eventIn(cookie, weddingId, { title: 'Sangeet', startDate: '2031-02-19' });
    const wedding = await eventIn(cookie, weddingId, { title: 'Wedding', startDate: '2031-02-20' });
    const reception = await eventIn(cookie, weddingId, {
      title: 'Reception',
      startDate: '2031-02-21',
    });
    const rajesh = await added(cookie, weddingId, {
      name: 'Rajesh Sharma',
      partySize: 5,
      email: 'Rajesh@Example.com',
      phone: '+91 98200 11111',
      organizerNotes: 'Needs a ground-floor room.',
      eventIds: [wedding, haldi],
    });
    const priya = await added(cookie, weddingId, {
      name: 'Priya Desai',
      partySize: 2,
      eventIds: [sangeet, reception],
    });
    const kavya = await added(cookie, weddingId, { name: 'Kavya Shah', partySize: 4 });
    return { owner, haldi, sangeet, wedding, reception, rajesh, priya, kavya };
  }

  describe('guest contacts', () => {
    it('adds a family contact with one party size, invited to chosen ceremonies', async () => {
      const { owner, rajesh, kavya } = await plannedWedding();
      expect(rajesh).toMatchObject({
        name: 'Rajesh Sharma',
        partySize: 5,
        email: 'rajesh@example.com',
        organizerNotes: 'Needs a ground-floor room.',
        link: { status: 'none' },
      });
      expect(rajesh.invitations.map((i) => [i.title, i.rsvp.status])).toEqual([
        ['Haldi', 'pending'],
        ['Wedding', 'pending'],
      ]);
      expect(kavya.invitations).toEqual([]);
      const stored = await guests.countDocuments({
        weddingId: new Types.ObjectId(owner.weddingId),
      });
      expect(stored).toBe(3);
    });

    it('needs a name and a whole party size of at least 1, and checks email and events', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const other = await ownerWithWedding('Meera Iyer');
      const theirs = await eventIn(other.cookie, other.weddingId, { title: 'Their Haldi' });
      const missing = await send('post', cookie, base(weddingId), {});
      expect(fieldsOf(missing).sort()).toEqual(['name', 'partySize']);
      for (const partySize of [0, 1.5, '5', 101]) {
        const res = await send('post', cookie, base(weddingId), { name: 'A', partySize });
        expect(fieldsOf(res), String(partySize)).toEqual(['partySize']);
      }
      const bad = await send('post', cookie, base(weddingId), {
        name: 'A',
        partySize: 2,
        email: 'not-an-email',
        eventIds: [theirs],
      });
      expect(fieldsOf(bad).sort()).toEqual(['email']);
      const foreign = await send('post', cookie, base(weddingId), {
        name: 'A',
        partySize: 2,
        eventIds: [theirs],
      });
      expect(fieldsOf(foreign)).toEqual(['eventIds']);
    });

    it('keeps contacts, people and answers apart in the totals', async () => {
      const { owner, haldi, wedding, rajesh } = await plannedWedding();
      const url = (await linkOf(owner.cookie, owner.weddingId, rajesh.id)).url;
      const { cookie } = await open(url);
      const events = (await viewed(cookie)).events;
      const haldiId = events.find((e) => e.title === 'Haldi')?.invitationId ?? '';
      const weddingId = events.find((e) => e.title === 'Wedding')?.invitationId ?? '';
      expect(
        (
          await answer(cookie, haldiId, {
            status: 'attending',
            attendingCount: 3,
            responseVersion: 0,
          })
        ).status,
      ).toBe(200);
      expect(
        (
          await answer(cookie, weddingId, {
            status: 'attending',
            attendingCount: 5,
            responseVersion: 0,
          })
        ).status,
      ).toBe(200);

      const { totals } = await list(owner.cookie, owner.weddingId);
      expect(totals).toMatchObject({ contacts: 3, invitedPeople: 7, answered: 2, pending: 2 });
      const perEvent = Object.fromEntries(
        (
          totals.events as { eventId: string; confirmedPeople: number; invitedPeople: number }[]
        ).map((e) => [e.eventId, [e.confirmedPeople, e.invitedPeople]]),
      );
      expect(perEvent[haldi]).toEqual([3, 5]);
      expect(perEvent[wedding]).toEqual([5, 5]);
    });
  });

  describe('the guest’s private invitation', () => {
    it('opens without an account and shows only the invited ceremonies, nothing private', async () => {
      const { owner, rajesh } = await plannedWedding();
      const link = await linkOf(owner.cookie, owner.weddingId, rajesh.id);
      expect(link.url).toMatch(/\/invitation#t=[A-Za-z0-9_-]{43}$/);
      // The same link again, until it is reissued.
      expect((await linkOf(owner.cookie, owner.weddingId, rajesh.id)).url).toBe(link.url);
      const stored = await tokens.findOne({ guestId: new Types.ObjectId(rajesh.id) }).lean();
      expect(JSON.stringify(stored)).not.toContain(tokenOf(link.url));

      const { res, cookie } = await open(link.url);
      expect(res.status).toBe(204);
      expect(String(res.headers['set-cookie'])).toMatch(/HttpOnly/);
      const seen = await viewed(cookie);
      expect(seen).toMatchObject({ guestName: 'Rajesh Sharma', partySize: 5, writable: true });
      expect(seen.events.map((e) => e.title)).toEqual(['Haldi', 'Wedding']);
      expect(seen.events[0]?.venueName).toBe('Poolside lawn');
      const text = JSON.stringify(seen);
      for (const secret of ['ground-floor', 'example.com', '98200', 'Priya', 'Reception']) {
        expect(text).not.toContain(secret);
      }
    });

    it('records a separate answer per ceremony, within the party size, with version checks', async () => {
      const { owner, rajesh, priya } = await plannedWedding();
      const { cookie } = await open((await linkOf(owner.cookie, owner.weddingId, rajesh.id)).url);
      const [haldi, wedding] = (await viewed(cookie)).events;
      const id = haldi?.invitationId ?? '';

      const tooMany = await answer(cookie, id, {
        status: 'attending',
        attendingCount: 6,
        responseVersion: 0,
      });
      expect(fieldsOf(tooMany)).toEqual(['attendingCount']);
      const noCount = await answer(cookie, id, { status: 'attending', responseVersion: 0 });
      expect(fieldsOf(noCount)).toEqual(['attendingCount']);

      const first = await answer(cookie, id, {
        status: 'attending',
        attendingCount: 3,
        responseVersion: 0,
      });
      expect((first.body as { data: ViewBody['events'][number] }).data.rsvp).toMatchObject({
        status: 'attending',
        attendingCount: 3,
        responseVersion: 1,
      });
      // Saved in another tab meanwhile: refused, never overwritten.
      const stale = await answer(cookie, id, { status: 'maybe', responseVersion: 0 });
      expect(stale.status).toBe(409);
      expect(errorOf(stale).code).toBe('RSVP_VERSION_CONFLICT');

      const declined = await answer(cookie, wedding?.invitationId ?? '', {
        status: 'not_attending',
        attendingCount: 4,
        responseVersion: 0,
      });
      expect((declined.body as { data: ViewBody['events'][number] }).data.rsvp).toMatchObject({
        status: 'not_attending',
        attendingCount: 0,
      });
      const maybe = await answer(cookie, id, { status: 'maybe', responseVersion: 1 });
      expect((maybe.body as { data: ViewBody['events'][number] }).data.rsvp.status).toBe('maybe');

      // Another guest's ceremony, even with its real ID, is not part of this invitation.
      const priyaInvitation = priya.invitations[0]?.id ?? '';
      const crossed = await answer(cookie, priyaInvitation, {
        status: 'attending',
        attendingCount: 1,
        responseVersion: 0,
      });
      expect(crossed.status).toBe(404);
      expect(errorOf(crossed).code).toBe('EVENT_INVITATION_NOT_FOUND');

      // The organizer sees the current answer and how it changed.
      const detail = await send('get', owner.cookie, `${base(owner.weddingId)}/${rajesh.id}`);
      const haldiDetail = (detail.body as { data: DetailBody }).data.invitations[0];
      expect(haldiDetail?.rsvp.status).toBe('maybe');
      expect(haldiDetail?.history).toEqual([
        expect.objectContaining({ status: 'attending', attendingCount: 3 }),
      ]);
    });

    it('can’t answer an unselected ceremony, and gets its answer back when reselected', async () => {
      const { owner, rajesh, haldi, wedding, reception } = await plannedWedding();
      const { cookie } = await open((await linkOf(owner.cookie, owner.weddingId, rajesh.id)).url);
      const haldiId = (await viewed(cookie)).events[0]?.invitationId ?? '';
      await answer(cookie, haldiId, { status: 'attending', attendingCount: 2, responseVersion: 0 });

      const put = (eventIds: string[]) =>
        send('put', owner.cookie, `${base(owner.weddingId)}/${rajesh.id}/invitations`, {
          eventIds,
        });
      expect((await put([wedding, reception])).status).toBe(200);
      expect((await viewed(cookie)).events.map((e) => e.title)).toEqual(['Wedding', 'Reception']);
      const refused = await answer(cookie, haldiId, {
        status: 'maybe',
        responseVersion: 1,
      });
      expect(refused.status).toBe(404);

      await put([haldi, wedding]);
      const back = (await viewed(cookie)).events[0];
      expect(back?.rsvp).toMatchObject({ status: 'attending', attendingCount: 2 });
    });

    it('closes a cancelled ceremony and hides a deleted one', async () => {
      const { owner, rajesh, haldi, wedding } = await plannedWedding();
      const { cookie } = await open((await linkOf(owner.cookie, owner.weddingId, rajesh.id)).url);
      const [haldiView] = (await viewed(cookie)).events;
      await send('patch', owner.cookie, `/api/v1/weddings/${owner.weddingId}/events/${haldi}`, {
        state: 'cancelled',
      }).expect(200);
      const closed = await answer(cookie, haldiView?.invitationId ?? '', {
        status: 'attending',
        attendingCount: 1,
        responseVersion: 0,
      });
      expect(errorOf(closed).code).toBe('RSVP_CLOSED');
      expect((await viewed(cookie)).events[0]?.cancelled).toBe(true);

      await send(
        'delete',
        owner.cookie,
        `/api/v1/weddings/${owner.weddingId}/events/${wedding}`,
      ).expect(204);
      expect((await viewed(cookie)).events.map((e) => e.title)).toEqual(['Haldi']);
    });

    it('wears the published website’s design, and the standard one while it isn’t published', async () => {
      const { owner, rajesh, haldi } = await plannedWedding();
      await send('patch', owner.cookie, `/api/v1/weddings/${owner.weddingId}/events/${haldi}`, {
        dressCode: 'Yellow and floral',
      }).expect(200);
      const { cookie } = await open((await linkOf(owner.cookie, owner.weddingId, rajesh.id)).url);
      const first = await viewed(cookie);
      expect(first.templateId).toBe('traditional');
      expect(first.place).toBe('Jaipur, Rajasthan');
      expect(first.events[0]?.dressCode).toBe('Yellow and floral');

      const site = `/api/v1/weddings/${owner.weddingId}/website`;
      await send('patch', owner.cookie, site, { templateId: 'royal', contentVersion: 0 }).expect(
        200,
      );
      // A design chosen in an unpublished website doesn't reach guests.
      expect((await viewed(cookie)).templateId).toBe('traditional');
      await send('post', owner.cookie, `${site}/publish`, { contentVersion: 1 }).expect(200);
      expect((await viewed(cookie)).templateId).toBe('royal');
      // A draft change waits for "Publish changes", on the RSVP page as on the site.
      await send('patch', owner.cookie, site, { templateId: 'modern', contentVersion: 1 }).expect(
        200,
      );
      expect((await viewed(cookie)).templateId).toBe('royal');

      // Once published, the private link opens the website, where they answer.
      const slug = (await viewed(cookie)).slug;
      expect(slug).toMatch(/^ananya-/);
      const onSite = await linkOf(owner.cookie, owner.weddingId, rajesh.id);
      expect(onSite.url).toMatch(new RegExp(`/w/${slug}#t=[A-Za-z0-9_-]{43}$`));
      expect((await open(onSite.url)).res.status).toBe(204);
      await send('post', owner.cookie, `${site}/unpublish`).expect(200);
      // Taken down: back to the standard RSVP page.
      expect((await viewed(cookie)).templateId).toBe('traditional');
      expect((await linkOf(owner.cookie, owner.weddingId, rajesh.id)).url).toMatch(
        /\/invitation#t=/,
      );
    });
  });

  describe('links: reissue, revoke and removal', () => {
    it('stops old links and the browsers they opened once reissued or revoked', async () => {
      const { owner, rajesh } = await plannedWedding();
      const first = await linkOf(owner.cookie, owner.weddingId, rajesh.id);
      const { cookie: oldCookie } = await open(first.url);
      const second = await linkOf(owner.cookie, owner.weddingId, rajesh.id, true);
      expect(second.url).not.toBe(first.url);

      const stale = await open(first.url);
      expect(stale.res.status).toBe(404);
      expect(errorOf(stale.res).code).toBe('INVITATION_LINK_UNAVAILABLE');
      const oldView = await view(oldCookie);
      expect(oldView.status).toBe(401);
      expect(errorOf(oldView).code).toBe('GUEST_SESSION_REQUIRED');

      const { cookie } = await open(second.url);
      expect((await view(cookie)).status).toBe(200);
      const revoked = await send(
        'post',
        owner.cookie,
        `${base(owner.weddingId)}/${rajesh.id}/invitation-links/revoke`,
      );
      expect((revoked.body as { data: { status: string } }).data.status).toBe('revoked');
      expect((await view(cookie)).status).toBe(401);
      expect((await open(second.url)).res.status).toBe(404);
    });

    it('removing a guest (owners only) keeps the record and stops their link', async () => {
      const { owner, rajesh } = await plannedWedding();
      const manager = await addManager(owner.weddingId);
      const { cookie } = await open((await linkOf(owner.cookie, owner.weddingId, rajesh.id)).url);
      const path = `${base(owner.weddingId)}/${rajesh.id}`;
      const byManager = await send('delete', manager.cookie, path);
      expect(errorOf(byManager).code).toBe('OWNER_REQUIRED');

      expect((await send('delete', owner.cookie, path)).status).toBe(204);
      expect((await view(cookie)).status).toBe(401);
      expect((await send('get', owner.cookie, path)).status).toBe(404);
      const { guests: left } = await list(owner.cookie, owner.weddingId);
      expect(left.map((g) => g.name)).toEqual(['Kavya Shah', 'Priya Desai']);
      expect((await guests.findById(rajesh.id).lean())?.status).toBe('removed');
    });
  });

  describe('party size', () => {
    it('refuses a size below an answer already given, naming the ceremony, and changes nothing', async () => {
      const { owner, rajesh } = await plannedWedding();
      const { cookie } = await open((await linkOf(owner.cookie, owner.weddingId, rajesh.id)).url);
      const [, wedding] = (await viewed(cookie)).events;
      await answer(cookie, wedding?.invitationId ?? '', {
        status: 'attending',
        attendingCount: 5,
        responseVersion: 0,
      });
      const path = `${base(owner.weddingId)}/${rajesh.id}`;
      const lowered = await send('patch', owner.cookie, path, { partySize: 3, name: 'R. Sharma' });
      expect(lowered.status).toBe(409);
      expect(errorOf(lowered)).toMatchObject({ code: 'PARTY_SIZE_CONFLICT' });
      expect(errorOf(lowered).message).toContain('Wedding: 5 attending');
      expect(await guests.findById(rajesh.id).lean()).toMatchObject({
        partySize: 5,
        name: 'Rajesh Sharma',
      });
      const raised = await send('patch', owner.cookie, path, { partySize: 6, email: null });
      expect((raised.body as { data: DetailBody }).data.guest).toMatchObject({ partySize: 6 });
      expect((raised.body as { data: DetailBody }).data.guest.email).toBeUndefined();
    });
  });

  describe('invitation email', () => {
    it('queues the email with no link in the queue; the worker writes it with a working link', async () => {
      const { owner, rajesh, priya, kavya } = await plannedWedding();
      const noEmail = await send(
        'post',
        owner.cookie,
        `${base(owner.weddingId)}/${priya.id}/invitation-email`,
      );
      expect(fieldsOf(noEmail)).toEqual(['email']);
      await send('patch', owner.cookie, `${base(owner.weddingId)}/${kavya.id}`, {
        email: 'kavya@example.com',
      });
      const noEvents = await send(
        'post',
        owner.cookie,
        `${base(owner.weddingId)}/${kavya.id}/invitation-email`,
      );
      expect(errorOf(noEvents).code).toBe('NO_CEREMONIES_SELECTED');

      const res = await send(
        'post',
        owner.cookie,
        `${base(owner.weddingId)}/${rajesh.id}/invitation-email`,
      );
      expect(res.status, JSON.stringify(res.body)).toBe(202);
      const guest = (res.body as { data: DetailBody }).data.guest;
      expect(guest.link.status).toBe('active');
      expect(guest.lastEmail?.state).toBe('queued');

      const email = await waitFor(
        () => worker.mail.sent.find((sent) => sent.to === 'rajesh@example.com'),
        { what: 'the invitation email' },
      );
      expect(email.subject).toContain('wedding');
      expect(email.text).toContain('Haldi');
      expect(email.text).toContain(guest.link.secretUrl ?? 'missing link');
      const queued = await outbox.find({}).lean();
      expect(JSON.stringify(queued)).not.toContain(tokenOf(guest.link.secretUrl ?? ''));
      expect((await open(guest.link.secretUrl ?? '')).res.status).toBe(204);

      await waitFor(
        async () =>
          (await notifications.findOne({ recipientEmailNormalized: 'rajesh@example.com' }).lean())
            ?.state === 'sent',
        { what: 'the email to be sent' },
      );
      const after = await send('get', owner.cookie, `${base(owner.weddingId)}/${rajesh.id}`);
      expect((after.body as { data: DetailBody }).data.guest.lastEmail?.state).toBe('sent');
    });
  });

  describe('import', () => {
    it('previews problems and duplicates per row, then imports the rows that pass', async () => {
      const { owner } = await plannedWedding();
      const rows = [
        {
          name: 'Vikram Singhania',
          partySize: '4',
          email: 'vikram@example.com',
          events: ['wedding', 'Reception'],
        },
        { name: 'Sunita Verma', partySize: '0' },
        { name: 'Manoj Gupta', partySize: 2, email: 'manoj@@invalid' },
        { name: ' rajesh  sharma ', partySize: 5 },
        { name: 'Asha Rao', partySize: 1, events: ['Garba'] },
        { name: 'Vikram Singhania', partySize: 2 },
      ];
      const preview = await send('post', owner.cookie, `${base(owner.weddingId)}/import/preview`, {
        fileName: 'guest-list.csv',
        mode: 'csv',
        rows,
      });
      expect(preview.status, JSON.stringify(preview.body)).toBe(200);
      const result = (
        preview.body as {
          data: {
            rows: { status: string; problems: { field: string }[]; duplicateOf?: string }[];
            ready: number;
            errors: number;
            duplicates: number;
          };
        }
      ).data;
      expect(result.rows.map((r) => r.status)).toEqual([
        'ready',
        'error',
        'error',
        'duplicate',
        'error',
        'duplicate',
      ]);
      expect(result.rows[1]?.problems.map((p) => p.field)).toEqual(['partySize']);
      expect(result.rows[2]?.problems.map((p) => p.field)).toEqual(['email']);
      expect(result.rows[3]?.duplicateOf).toBe('Rajesh Sharma');
      expect(result.rows[5]?.duplicateOf).toBe('Vikram Singhania');
      expect(result).toMatchObject({ ready: 1, errors: 3, duplicates: 2 });
      expect(await guests.countDocuments({ weddingId: new Types.ObjectId(owner.weddingId) })).toBe(
        3,
      );

      const commit = await send('post', owner.cookie, `${base(owner.weddingId)}/import/commit`, {
        rows,
        skipDuplicates: true,
        sourceFormat: 'csv',
      });
      expect((commit.body as { data: object }).data).toEqual({
        created: 1,
        skipped: 2,
        rejected: 3,
      });
      const { guests: now } = await list(owner.cookie, owner.weddingId);
      const vikram = now.find((g) => g.name === 'Vikram Singhania');
      expect(vikram?.invitations.map((i) => i.title)).toEqual(['Wedding', 'Reception']);
      expect(now).toHaveLength(4);
    });
  });

  describe('privacy and isolation', () => {
    it('refuses visitors and other weddings, and never mixes guests across weddings', async () => {
      const ours = await plannedWedding();
      const theirs = await plannedWedding();
      const path = `${base(theirs.owner.weddingId)}/${theirs.rajesh.id}`;
      expect((await send('get', undefined, base(theirs.owner.weddingId))).status).toBe(401);
      for (const res of [
        await send('get', ours.owner.cookie, base(theirs.owner.weddingId)),
        await send('get', ours.owner.cookie, path),
        await send('patch', ours.owner.cookie, path, { name: 'Taken' }),
        await send('post', ours.owner.cookie, `${path}/invitation-links`, {}),
      ]) {
        expect(errorOf(res).code).toBe('WEDDING_NOT_FOUND');
      }
      const crossed = await send(
        'get',
        ours.owner.cookie,
        `${base(ours.owner.weddingId)}/${theirs.rajesh.id}`,
      );
      expect(errorOf(crossed).code).toBe('GUEST_NOT_FOUND');
      expect((await view('')).status).toBe(401);
      const badLink = await request(server())
        .post('/api/v1/guest-access/exchange')
        .send({ token: 'x'.repeat(43) });
      expect(errorOf(badLink).code).toBe('INVITATION_LINK_UNAVAILABLE');
    });
  });

  describe('an archived wedding', () => {
    it('stays readable for organizers and guests, but nothing can change', async () => {
      const { owner, rajesh, kavya } = await plannedWedding();
      const { cookie } = await open((await linkOf(owner.cookie, owner.weddingId, rajesh.id)).url);
      const [haldi] = (await viewed(cookie)).events;
      await weddings.updateOne({ _id: owner.weddingId }, { $set: { status: 'archived' } });
      const before = await fenceOf(owner.weddingId);

      expect((await list(owner.cookie, owner.weddingId)).guests).toHaveLength(3);
      expect((await viewed(cookie)).writable).toBe(false);
      for (const res of [
        await send('post', owner.cookie, base(owner.weddingId), { name: 'X', partySize: 1 }),
        await send('patch', owner.cookie, `${base(owner.weddingId)}/${kavya.id}`, { partySize: 2 }),
        await send('put', owner.cookie, `${base(owner.weddingId)}/${kavya.id}/invitations`, {
          eventIds: [],
        }),
        await send(
          'post',
          owner.cookie,
          `${base(owner.weddingId)}/${kavya.id}/invitation-links`,
          {},
        ),
        await answer(cookie, haldi?.invitationId ?? '', {
          status: 'attending',
          attendingCount: 1,
          responseVersion: 0,
        }),
      ]) {
        expect(res.status).toBe(409);
        expect(errorOf(res).code).toBe('WEDDING_ARCHIVED');
      }
      expect(await fenceOf(owner.weddingId)).toBe(before);
      const stored = await invitations.findOne({ guestId: new Types.ObjectId(rajesh.id) }).lean();
      expect(stored?.rsvp.status).toBe('pending');
    });
  });
});
