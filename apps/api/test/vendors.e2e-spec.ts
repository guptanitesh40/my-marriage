import { getModelToken } from '@nestjs/mongoose';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Types, type Model } from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Vendor } from '../src/modules/vendors/schemas/vendor.schema.js';
import { WeddingMembership } from '../src/modules/weddings/schemas/wedding-membership.schema.js';
import { Wedding } from '../src/modules/weddings/schemas/wedding.schema.js';
import { createTestApp } from './support/app.js';
import { resetRateLimits, signupVerified } from './support/auth.js';

interface VendorBody {
  id: string;
  name: string;
  category: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  events: { id: string; title: string }[];
  createdAt: string;
  updatedAt: string;
}

function errorOf(res: request.Response) {
  return (res.body as { error: { code: string; details?: { field: string }[] } }).error;
}

function fieldsOf(res: request.Response) {
  return errorOf(res).details?.map((d) => d.field) ?? [];
}

describe('Vendors (integration)', () => {
  let app: NestExpressApplication;
  let weddings: Model<Wedding>;
  let memberships: Model<WeddingMembership>;
  let vendors: Model<Vendor>;

  beforeAll(async () => {
    app = await createTestApp();
    weddings = app.get<Model<Wedding>>(getModelToken(Wedding.name));
    memberships = app.get<Model<WeddingMembership>>(getModelToken(WeddingMembership.name));
    vendors = app.get<Model<Vendor>>(getModelToken(Vendor.name));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => resetRateLimits(app));

  const server = () => app.getHttpServer();
  const base = (weddingId: string) => `/api/v1/weddings/${weddingId}/vendors`;

  /** A verified owner with a wedding of their own. */
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

  async function addManager(weddingId: string, name = 'Rajesh Mehta') {
    const manager = await signupVerified(app, { displayName: name });
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

  async function eventIn(cookie: string, weddingId: string, title: string, startDate?: string) {
    const res = await request(server())
      .post(`/api/v1/weddings/${weddingId}/events`)
      .set('Cookie', cookie)
      .send({ title, ...(startDate ? { startDate } : {}) });
    expect(res.status).toBe(201);
    return (res.body as { data: { id: string } }).data.id;
  }

  function create(cookie: string | undefined, weddingId: string, body: unknown) {
    const req = request(server()).post(base(weddingId));
    return (cookie ? req.set('Cookie', cookie) : req).send(body as object);
  }

  async function created(cookie: string, weddingId: string, body: unknown) {
    const res = await create(cookie, weddingId, body);
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    return (res.body as { data: VendorBody }).data;
  }

  function patch(cookie: string | undefined, weddingId: string, vendorId: string, body: unknown) {
    const req = request(server()).patch(`${base(weddingId)}/${vendorId}`);
    return (cookie ? req.set('Cookie', cookie) : req).send(body as object);
  }

  function read(cookie: string | undefined, weddingId: string, vendorId: string) {
    const req = request(server()).get(`${base(weddingId)}/${vendorId}`);
    return cookie ? req.set('Cookie', cookie) : req;
  }

  function list(cookie: string | undefined, weddingId: string) {
    const req = request(server()).get(base(weddingId));
    return cookie ? req.set('Cookie', cookie) : req;
  }

  function remove(cookie: string | undefined, weddingId: string, vendorId: string) {
    const req = request(server()).delete(`${base(weddingId)}/${vendorId}`);
    return cookie ? req.set('Cookie', cookie) : req;
  }

  async function names(cookie: string, weddingId: string) {
    const res = await list(cookie, weddingId);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    return (res.body as { data: { vendors: VendorBody[] } }).data.vendors.map((v) => v.name);
  }

  async function fenceOf(weddingId: string) {
    return (await weddings.findById(weddingId).lean())?.writeFenceVersion;
  }

  describe('adding a vendor', () => {
    it('needs only a name and a category, with no contact details or events', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const before = await fenceOf(weddingId);
      const vendor = await created(cookie, weddingId, {
        name: '  Cityline   Guest Travel ',
        category: 'Transportation',
      });
      expect(vendor).toMatchObject({
        name: 'Cityline Guest Travel',
        category: 'Transportation',
        events: [],
      });
      expect(vendor).not.toHaveProperty('phone');
      expect(vendor).not.toHaveProperty('email');
      expect(await fenceOf(weddingId)).toBe((before ?? 0) + 1);

      const stored = await vendors.findById(vendor.id).lean();
      expect(stored?.weddingId.toHexString()).toBe(weddingId);
      expect(stored?.eventIds).toEqual([]);
    });

    it('keeps every detail and links several of the wedding’s events, once each', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const wedding = await eventIn(cookie, weddingId, 'Wedding', '2031-02-20');
      const haldi = await eventIn(cookie, weddingId, 'Haldi', '2031-02-18');
      const sangeet = await eventIn(cookie, weddingId, 'Sangeet', '2031-02-19');
      const vendor = await created(cookie, weddingId, {
        name: 'The Marigold Studio',
        category: 'Photography & Videography',
        contactName: 'Rohan Shah',
        phone: '+91 98201 44521',
        email: ' rohan@marigoldstudio.in ',
        address: '402, Heritage Arts Enclave\nC-Scheme, Jaipur',
        notes: 'Three drones and four ground cinematographers.',
        eventIds: [wedding, haldi, sangeet, wedding.toUpperCase()],
      });
      expect(vendor).toMatchObject({
        contactName: 'Rohan Shah',
        phone: '+91 98201 44521',
        email: 'rohan@marigoldstudio.in',
        address: '402, Heritage Arts Enclave\nC-Scheme, Jaipur',
        notes: 'Three drones and four ground cinematographers.',
      });
      // In the wedding's order, not the order given.
      expect(vendor.events).toEqual([
        { id: haldi, title: 'Haldi' },
        { id: sangeet, title: 'Sangeet' },
        { id: wedding, title: 'Wedding' },
      ]);
      expect((await vendors.findById(vendor.id).lean())?.eventIds).toHaveLength(3);
    });

    it('treats empty optional fields as not given', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const vendor = await created(cookie, weddingId, {
        name: 'Royal Bloom Decor',
        category: 'Decoration',
        contactName: ' ',
        phone: '',
        email: '',
        address: '',
        notes: '',
        eventIds: [],
      });
      const stored = await vendors.findById(vendor.id).lean();
      for (const field of ['contactName', 'phone', 'email', 'address', 'notes']) {
        expect(stored).not.toHaveProperty(field);
      }
    });

    it('requires a name and a category, and checks the email and phone', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const empty = await create(cookie, weddingId, { name: ' ', category: '' });
      expect(empty.status).toBe(400);
      expect(fieldsOf(empty).sort()).toEqual(['category', 'name']);

      const missing = await create(cookie, weddingId, {});
      expect(fieldsOf(missing).sort()).toEqual(['category', 'name']);

      const bad = await create(cookie, weddingId, {
        name: 'Saffron Table',
        category: 'Catering',
        email: 'not-an-email',
        phone: 'call me',
        eventIds: ['nope'],
        website: 'https://example.com',
      });
      expect(bad.status).toBe(400);
      expect(fieldsOf(bad).sort()).toEqual(['email', 'eventIds', 'phone', 'website']);

      for (const phone of ['12345', '+91 98201 44521 99999', '98201-44521x']) {
        const res = await create(cookie, weddingId, { name: 'A', category: 'B', phone });
        expect(fieldsOf(res), phone).toEqual(['phone']);
      }
      expect(await vendors.countDocuments({ weddingId: new Types.ObjectId(weddingId) })).toBe(0);
    });

    it('allows any category and two vendors with the same name', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      await created(cookie, weddingId, { name: 'Sharma Tent House', category: 'Tent & Lights' });
      await created(cookie, weddingId, { name: 'Sharma Tent House', category: 'Tent & Lights' });
      expect(await names(cookie, weddingId)).toEqual(['Sharma Tent House', 'Sharma Tent House']);
    });

    it('refuses events of another wedding, deleted events and unknown IDs', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const other = await ownerWithWedding('Meera Iyer');
      const theirs = await eventIn(other.cookie, other.weddingId, 'Their Sangeet');
      const ours = await eventIn(cookie, weddingId, 'Haldi');
      const gone = await eventIn(cookie, weddingId, 'Tilak');
      const deleted = await request(server())
        .delete(`/api/v1/weddings/${weddingId}/events/${gone}`)
        .set('Cookie', cookie);
      expect(deleted.status).toBe(204);

      for (const eventId of [theirs, gone, new Types.ObjectId().toHexString()]) {
        const res = await create(cookie, weddingId, {
          name: 'Rhythm Collective',
          category: 'Music & DJ',
          eventIds: [ours, eventId],
        });
        expect(res.status).toBe(400);
        expect(fieldsOf(res)).toEqual(['eventIds']);
      }
      expect(await vendors.countDocuments({ weddingId: new Types.ObjectId(weddingId) })).toBe(0);
    });

    it('lets managers add vendors too', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const manager = await addManager(weddingId);
      await created(manager.cookie, weddingId, { name: 'Meera Bridal', category: 'Makeup' });
      expect(await names(cookie, weddingId)).toEqual(['Meera Bridal']);
    });
  });

  describe('listing and reading vendors', () => {
    it('lists by name whatever the case, and reads one with its events', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const haldi = await eventIn(cookie, weddingId, 'Haldi');
      await created(cookie, weddingId, { name: 'saffron Table', category: 'Catering' });
      const bloom = await created(cookie, weddingId, {
        name: 'Royal Bloom',
        category: 'Decoration',
        eventIds: [haldi],
      });
      await created(cookie, weddingId, { name: 'Aarav Sounds', category: 'Music & DJ' });
      expect(await names(cookie, weddingId)).toEqual([
        'Aarav Sounds',
        'Royal Bloom',
        'saffron Table',
      ]);

      const res = await read(cookie, weddingId, bloom.id);
      expect(res.status).toBe(200);
      expect((res.body as { data: VendorBody }).data).toMatchObject({
        id: bloom.id,
        events: [{ id: haldi, title: 'Haldi' }],
      });
      const listed = await list(cookie, weddingId);
      expect((listed.body as { data: { truncated: boolean } }).data.truncated).toBe(false);
    });

    it('stops showing an event once it is deleted, without losing the vendor', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const haldi = await eventIn(cookie, weddingId, 'Haldi');
      const sangeet = await eventIn(cookie, weddingId, 'Sangeet');
      const vendor = await created(cookie, weddingId, {
        name: 'Royal Bloom',
        category: 'Decoration',
        eventIds: [haldi, sangeet],
      });
      await request(server())
        .delete(`/api/v1/weddings/${weddingId}/events/${haldi}`)
        .set('Cookie', cookie)
        .expect(204);
      const res = await read(cookie, weddingId, vendor.id);
      expect((res.body as { data: VendorBody }).data.events).toEqual([
        { id: sangeet, title: 'Sangeet' },
      ]);
    });
  });

  describe('changing a vendor', () => {
    it('changes what is given, clears with null or empty, and keeps the rest', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const manager = await addManager(weddingId);
      const vendor = await created(cookie, weddingId, {
        name: 'The Marigold Studio',
        category: 'Photography',
        contactName: 'Rohan Shah',
        phone: '+91 98201 44521',
        email: 'rohan@marigoldstudio.in',
        address: 'C-Scheme, Jaipur',
        notes: 'Advance paid.',
      });
      const res = await patch(manager.cookie, weddingId, vendor.id, {
        category: 'Photography & Videography',
        phone: null,
        email: '',
        notes: 'Advance and second instalment paid.',
      });
      expect(res.status, JSON.stringify(res.body)).toBe(200);
      const changed = (res.body as { data: VendorBody }).data;
      expect(changed).toMatchObject({
        name: 'The Marigold Studio',
        category: 'Photography & Videography',
        contactName: 'Rohan Shah',
        address: 'C-Scheme, Jaipur',
        notes: 'Advance and second instalment paid.',
      });
      expect(changed).not.toHaveProperty('phone');
      expect(changed).not.toHaveProperty('email');
      const stored = await vendors.findById(vendor.id).lean();
      expect(stored).not.toHaveProperty('phone');
      expect(stored).not.toHaveProperty('email');
    });

    it('replaces, adds and removes linked events, down to none', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const haldi = await eventIn(cookie, weddingId, 'Haldi', '2031-02-18');
      const sangeet = await eventIn(cookie, weddingId, 'Sangeet', '2031-02-19');
      const wedding = await eventIn(cookie, weddingId, 'Wedding', '2031-02-20');
      const vendor = await created(cookie, weddingId, {
        name: 'The Marigold Studio',
        category: 'Photography',
        eventIds: [sangeet],
      });
      const events = async (body: unknown) => {
        const res = await patch(cookie, weddingId, vendor.id, body);
        expect(res.status, JSON.stringify(res.body)).toBe(200);
        return (res.body as { data: VendorBody }).data.events.map((e) => e.title);
      };
      expect(await events({ eventIds: [sangeet, wedding, haldi] })).toEqual([
        'Haldi',
        'Sangeet',
        'Wedding',
      ]);
      expect(await events({ name: 'Marigold' })).toEqual(['Haldi', 'Sangeet', 'Wedding']);
      expect(await events({ eventIds: [wedding] })).toEqual(['Wedding']);
      expect(await events({ eventIds: [] })).toEqual([]);
      expect((await vendors.findById(vendor.id).lean())?.eventIds).toEqual([]);
      expect(await names(cookie, weddingId)).toEqual(['Marigold']);
    });

    it('refuses an empty name, a null event list and another wedding’s event', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const other = await ownerWithWedding('Meera Iyer');
      const theirs = await eventIn(other.cookie, other.weddingId, 'Their Haldi');
      const vendor = await created(cookie, weddingId, { name: 'Royal Bloom', category: 'Decor' });

      const blank = await patch(cookie, weddingId, vendor.id, { name: '', category: null });
      expect(fieldsOf(blank).sort()).toEqual(['category', 'name']);
      expect(fieldsOf(await patch(cookie, weddingId, vendor.id, { eventIds: null }))).toEqual([
        'eventIds',
      ]);
      expect(fieldsOf(await patch(cookie, weddingId, vendor.id, { eventIds: [theirs] }))).toEqual([
        'eventIds',
      ]);
      expect((await vendors.findById(vendor.id).lean())?.eventIds).toEqual([]);
    });

    it('answers not found for an unknown or malformed vendor', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      for (const id of [new Types.ObjectId().toHexString(), 'not-an-id']) {
        const res = await patch(cookie, weddingId, id, { name: 'X' });
        expect(res.status).toBe(404);
        expect(errorOf(res).code).toBe('VENDOR_NOT_FOUND');
        expect(errorOf(await read(cookie, weddingId, id)).code).toBe('VENDOR_NOT_FOUND');
      }
    });
  });

  describe('deleting a vendor', () => {
    it('keeps the record, marked deleted, and takes it out of the directory', async () => {
      const { cookie, weddingId, userId } = await ownerWithWedding();
      const haldi = await eventIn(cookie, weddingId, 'Haldi');
      const vendor = await created(cookie, weddingId, {
        name: 'Royal Bloom',
        category: 'Decoration',
        eventIds: [haldi],
      });
      await created(cookie, weddingId, { name: 'Saffron Table', category: 'Catering' });
      const before = await fenceOf(weddingId);

      const res = await remove(cookie, weddingId, vendor.id);
      expect(res.status).toBe(204);
      expect(await fenceOf(weddingId)).toBe((before ?? 0) + 1);
      expect(await names(cookie, weddingId)).toEqual(['Saffron Table']);
      for (const gone of [
        await read(cookie, weddingId, vendor.id),
        await patch(cookie, weddingId, vendor.id, { name: 'Back' }),
        await remove(cookie, weddingId, vendor.id),
      ]) {
        expect(gone.status).toBe(404);
        expect(errorOf(gone).code).toBe('VENDOR_NOT_FOUND');
      }

      // Still in the database, for expenses that name it.
      const stored = await vendors.findById(vendor.id).lean();
      expect(stored?.name).toBe('Royal Bloom');
      expect(stored?.eventIds.map(String)).toEqual([haldi]);
      expect(stored?.deletedAt).toBeInstanceOf(Date);
      expect(stored?.deletedBy?.toHexString()).toBe(userId);
    });

    it('is for owners only', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const manager = await addManager(weddingId);
      const vendor = await created(cookie, weddingId, { name: 'Royal Bloom', category: 'Decor' });
      const res = await remove(manager.cookie, weddingId, vendor.id);
      expect(res.status).toBe(403);
      expect(errorOf(res).code).toBe('OWNER_REQUIRED');
      expect(await names(manager.cookie, weddingId)).toEqual(['Royal Bloom']);
    });

    it('refuses visitors, other weddings, unknown IDs and archived weddings', async () => {
      const ours = await ownerWithWedding();
      const theirs = await ownerWithWedding('Meera Iyer');
      const vendor = await created(theirs.cookie, theirs.weddingId, {
        name: 'Private Caterer',
        category: 'Catering',
      });
      expect((await remove(undefined, theirs.weddingId, vendor.id)).status).toBe(401);
      expect(errorOf(await remove(ours.cookie, theirs.weddingId, vendor.id)).code).toBe(
        'WEDDING_NOT_FOUND',
      );
      expect(errorOf(await remove(ours.cookie, ours.weddingId, vendor.id)).code).toBe(
        'VENDOR_NOT_FOUND',
      );
      expect(errorOf(await remove(ours.cookie, ours.weddingId, 'not-an-id')).code).toBe(
        'VENDOR_NOT_FOUND',
      );

      await weddings.updateOne({ _id: theirs.weddingId }, { $set: { status: 'archived' } });
      const archived = await remove(theirs.cookie, theirs.weddingId, vendor.id);
      expect(archived.status).toBe(409);
      expect(errorOf(archived).code).toBe('WEDDING_ARCHIVED');
      expect((await vendors.findById(vendor.id).lean())?.deletedAt).toBeUndefined();
    });
  });

  describe('privacy and isolation', () => {
    it('refuses visitors who are not signed in', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const vendor = await created(cookie, weddingId, { name: 'Royal Bloom', category: 'Decor' });
      for (const res of [
        await list(undefined, weddingId),
        await read(undefined, weddingId, vendor.id),
        await create(undefined, weddingId, { name: 'X', category: 'Y' }),
        await patch(undefined, weddingId, vendor.id, { name: 'X' }),
      ]) {
        expect(res.status).toBe(401);
      }
    });

    it('never shows or changes another wedding’s vendor, whichever ID is changed', async () => {
      const ours = await ownerWithWedding();
      const theirs = await ownerWithWedding('Meera Iyer');
      const vendor = await created(theirs.cookie, theirs.weddingId, {
        name: 'Private Caterer',
        category: 'Catering',
        phone: '+91 99200 81290',
      });

      // Their wedding: not a member, so the wedding itself is not found.
      for (const res of [
        await list(ours.cookie, theirs.weddingId),
        await read(ours.cookie, theirs.weddingId, vendor.id),
        await create(ours.cookie, theirs.weddingId, { name: 'X', category: 'Y' }),
        await patch(ours.cookie, theirs.weddingId, vendor.id, { name: 'Taken' }),
      ]) {
        expect(res.status).toBe(404);
        expect(errorOf(res).code).toBe('WEDDING_NOT_FOUND');
      }
      // Our wedding with their vendor's ID: no such vendor here.
      for (const res of [
        await read(ours.cookie, ours.weddingId, vendor.id),
        await patch(ours.cookie, ours.weddingId, vendor.id, { name: 'Taken' }),
      ]) {
        expect(res.status).toBe(404);
        expect(errorOf(res).code).toBe('VENDOR_NOT_FOUND');
      }
      expect(await names(ours.cookie, ours.weddingId)).toEqual([]);
      expect((await vendors.findById(vendor.id).lean())?.name).toBe('Private Caterer');
    });

    it('stops answering a manager who was removed', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const manager = await addManager(weddingId);
      await created(cookie, weddingId, { name: 'Royal Bloom', category: 'Decor' });
      await memberships.updateOne(
        { weddingId: new Types.ObjectId(weddingId), userId: new Types.ObjectId(manager.userId) },
        { $set: { status: 'removed' } },
      );
      expect((await list(manager.cookie, weddingId)).status).toBe(404);
    });
  });

  describe('an archived wedding', () => {
    it('stays readable but refuses every change, writing nothing', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const vendor = await created(cookie, weddingId, { name: 'Royal Bloom', category: 'Decor' });
      await weddings.updateOne({ _id: weddingId }, { $set: { status: 'archived' } });
      const before = await fenceOf(weddingId);

      expect(await names(cookie, weddingId)).toEqual(['Royal Bloom']);
      expect((await read(cookie, weddingId, vendor.id)).status).toBe(200);
      for (const res of [
        await create(cookie, weddingId, { name: 'More', category: 'Decor' }),
        await patch(cookie, weddingId, vendor.id, { name: 'Renamed' }),
      ]) {
        expect(res.status).toBe(409);
        expect(errorOf(res).code).toBe('WEDDING_ARCHIVED');
      }
      expect((await vendors.findById(vendor.id).lean())?.name).toBe('Royal Bloom');
      expect(await vendors.countDocuments({ weddingId: new Types.ObjectId(weddingId) })).toBe(1);
      expect(await fenceOf(weddingId)).toBe(before);
    });
  });
});
