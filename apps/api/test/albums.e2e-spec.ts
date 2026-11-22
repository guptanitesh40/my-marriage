import { getModelToken } from '@nestjs/mongoose';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Types, type Model } from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Album } from '../src/modules/media/schemas/album.schema.js';
import { WeddingMembership } from '../src/modules/weddings/schemas/wedding-membership.schema.js';
import { Wedding } from '../src/modules/weddings/schemas/wedding.schema.js';
import { createTestApp } from './support/app.js';
import { resetRateLimits, signupVerified } from './support/auth.js';

interface AlbumBody {
  id: string;
  kind: 'event' | 'general' | 'custom';
  title: string;
  event?: {
    id: string;
    title: string;
    startDate?: string;
    venueName?: string;
    cancelled: boolean;
    completed: boolean;
  };
  isUploadEnabled: boolean;
}

function errorOf(res: request.Response) {
  return (res.body as { error: { code: string; details?: { field: string }[] } }).error;
}

describe('Albums (integration)', () => {
  let app: NestExpressApplication;
  let weddings: Model<Wedding>;
  let memberships: Model<WeddingMembership>;
  let albums: Model<Album>;

  beforeAll(async () => {
    app = await createTestApp();
    weddings = app.get<Model<Wedding>>(getModelToken(Wedding.name));
    memberships = app.get<Model<WeddingMembership>>(getModelToken(WeddingMembership.name));
    albums = app.get<Model<Album>>(getModelToken(Album.name));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => resetRateLimits(app));

  const server = () => app.getHttpServer();
  const base = (weddingId: string) => `/api/v1/weddings/${weddingId}/albums`;

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

  async function eventIn(cookie: string, weddingId: string, body: Record<string, unknown>) {
    const res = await request(server())
      .post(`/api/v1/weddings/${weddingId}/events`)
      .set('Cookie', cookie)
      .send(body);
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    return (res.body as { data: { id: string } }).data.id;
  }

  function list(cookie: string | undefined, weddingId: string) {
    const req = request(server()).get(base(weddingId));
    return cookie ? req.set('Cookie', cookie) : req;
  }

  async function listed(cookie: string, weddingId: string) {
    const res = await list(cookie, weddingId);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    return (res.body as { data: { albums: AlbumBody[] } }).data.albums;
  }

  function create(cookie: string, weddingId: string, body: unknown) {
    return request(server())
      .post(base(weddingId))
      .set('Cookie', cookie)
      .send(body as object);
  }

  function patch(cookie: string, weddingId: string, albumId: string, body: unknown) {
    return request(server())
      .patch(`${base(weddingId)}/${albumId}`)
      .set('Cookie', cookie)
      .send(body as object);
  }

  describe('automatic albums', () => {
    it('gives a new wedding its general album', async () => {
      const owner = await ownerWithWedding();
      const found = await listed(owner.cookie, owner.weddingId);
      expect(found).toEqual([
        expect.objectContaining({
          kind: 'general',
          title: 'General Collection',
          isUploadEnabled: true,
        }),
      ]);
    });

    it('gives every ceremony one album, in the Events page’s order, with its details', async () => {
      const owner = await ownerWithWedding();
      const wedding = await eventIn(owner.cookie, owner.weddingId, {
        title: 'Wedding',
        startDate: '2030-02-14',
        venue: { name: 'Mandapam Lawn' },
      });
      const haldi = await eventIn(owner.cookie, owner.weddingId, {
        title: 'Haldi',
        startDate: '2030-02-12',
      });

      const found = await listed(owner.cookie, owner.weddingId);
      expect(found.map((album) => [album.kind, album.title])).toEqual([
        ['event', 'Haldi'],
        ['event', 'Wedding'],
        ['general', 'General Collection'],
      ]);
      expect(found[1]?.event).toEqual({
        id: wedding,
        title: 'Wedding',
        startDate: '2030-02-14',
        venueName: 'Mandapam Lawn',
        cancelled: false,
        completed: false,
      });
      expect(found[0]?.event?.id).toBe(haldi);
    });

    it('makes each album once, however many lists run at the same time', async () => {
      const owner = await ownerWithWedding();
      await eventIn(owner.cookie, owner.weddingId, { title: 'Mehendi' });
      await eventIn(owner.cookie, owner.weddingId, { title: 'Sangeet' });

      const results = await Promise.all(
        Array.from({ length: 6 }, () => list(owner.cookie, owner.weddingId)),
      );
      for (const res of results) expect(res.status, JSON.stringify(res.body)).toBe(200);
      const stored = await albums.find({ weddingId: new Types.ObjectId(owner.weddingId) }).lean();
      expect(stored).toHaveLength(3);
    });

    it('follows a renamed ceremony and drops the album of a deleted one, keeping the record', async () => {
      const owner = await ownerWithWedding();
      const mehendi = await eventIn(owner.cookie, owner.weddingId, { title: 'Mehendi' });
      const sangeet = await eventIn(owner.cookie, owner.weddingId, { title: 'Sangeet' });
      await listed(owner.cookie, owner.weddingId);

      await request(server())
        .patch(`/api/v1/weddings/${owner.weddingId}/events/${mehendi}`)
        .set('Cookie', owner.cookie)
        .send({ title: 'Mehendi & Sundowner' })
        .expect(200);
      await request(server())
        .delete(`/api/v1/weddings/${owner.weddingId}/events/${sangeet}`)
        .set('Cookie', owner.cookie)
        .expect(204);

      const found = await listed(owner.cookie, owner.weddingId);
      expect(found.map((album) => album.title)).toEqual([
        'Mehendi & Sundowner',
        'General Collection',
      ]);
      const kept = await albums.countDocuments({ eventId: new Types.ObjectId(sangeet) });
      expect(kept).toBe(1);
    });

    it('makes no albums for an archived wedding, which stays readable', async () => {
      const owner = await ownerWithWedding();
      await eventIn(owner.cookie, owner.weddingId, { title: 'Haldi' });
      await weddings.updateOne({ _id: owner.weddingId }, { $set: { status: 'archived' } });

      expect(await listed(owner.cookie, owner.weddingId)).toEqual([]);
      expect(await albums.countDocuments({ weddingId: new Types.ObjectId(owner.weddingId) })).toBe(
        0,
      );
    });
  });

  describe('custom albums', () => {
    it('adds the couple’s own albums after the automatic ones, in the order made', async () => {
      const owner = await ownerWithWedding();
      const manager = await addManager(owner.weddingId);
      await eventIn(owner.cookie, owner.weddingId, { title: 'Haldi' });

      const first = await create(owner.cookie, owner.weddingId, {
        title: '  Pre-Wedding   Shoot ',
      });
      expect(first.status, JSON.stringify(first.body)).toBe(201);
      expect((first.body as { data: AlbumBody }).data).toMatchObject({
        kind: 'custom',
        title: 'Pre-Wedding Shoot',
        isUploadEnabled: true,
      });
      const second = await create(manager.cookie, owner.weddingId, { title: 'Family Portraits' });
      expect(second.status).toBe(201);

      const found = await listed(owner.cookie, owner.weddingId);
      expect(found.map((album) => album.title)).toEqual([
        'Haldi',
        'General Collection',
        'Pre-Wedding Shoot',
        'Family Portraits',
      ]);
    });

    it('requires a name and refuses unknown fields', async () => {
      const owner = await ownerWithWedding();
      const empty = await create(owner.cookie, owner.weddingId, { title: '   ' });
      expect(empty.status).toBe(400);
      expect(errorOf(empty).details?.map((d) => d.field)).toEqual(['title']);
      const extra = await create(owner.cookie, owner.weddingId, { title: 'VIP', kind: 'event' });
      expect(extra.status).toBe(400);
    });

    it('stops at the album limit', async () => {
      const owner = await ownerWithWedding();
      const weddingId = new Types.ObjectId(owner.weddingId);
      await albums.insertMany(
        Array.from({ length: 50 }, (_, index) => ({
          weddingId,
          title: `Album ${index}`,
          kind: 'custom',
          isUploadEnabled: true,
          sortOrder: index,
        })),
      );
      const res = await create(owner.cookie, owner.weddingId, { title: 'One more' });
      expect(res.status).toBe(409);
      expect(errorOf(res).code).toBe('ALBUM_LIMIT');
    });
  });

  describe('changing an album', () => {
    it('renames custom and general albums and pauses any album’s uploads', async () => {
      const owner = await ownerWithWedding();
      await eventIn(owner.cookie, owner.weddingId, { title: 'Haldi' });
      const [haldi, general] = await listed(owner.cookie, owner.weddingId);
      if (!haldi || !general) throw new Error('albums missing');

      const renamed = await patch(owner.cookie, owner.weddingId, general.id, {
        title: 'Behind the Scenes',
      });
      expect(renamed.status).toBe(200);
      expect((renamed.body as { data: AlbumBody }).data.title).toBe('Behind the Scenes');

      const paused = await patch(owner.cookie, owner.weddingId, haldi.id, {
        isUploadEnabled: false,
      });
      expect(paused.status).toBe(200);
      expect((paused.body as { data: AlbumBody }).data).toMatchObject({
        title: 'Haldi',
        isUploadEnabled: false,
      });
    });

    it('keeps an event album named after its ceremony', async () => {
      const owner = await ownerWithWedding();
      await eventIn(owner.cookie, owner.weddingId, { title: 'Haldi' });
      const [haldi] = await listed(owner.cookie, owner.weddingId);
      if (!haldi) throw new Error('album missing');
      const res = await patch(owner.cookie, owner.weddingId, haldi.id, { title: 'Turmeric' });
      expect(res.status).toBe(400);
      expect(errorOf(res).details?.map((d) => d.field)).toEqual(['title']);
    });

    it('answers not found for an unknown, malformed or deleted ceremony’s album', async () => {
      const owner = await ownerWithWedding();
      const sangeet = await eventIn(owner.cookie, owner.weddingId, { title: 'Sangeet' });
      const [album] = await listed(owner.cookie, owner.weddingId);
      if (!album) throw new Error('album missing');
      await request(server())
        .delete(`/api/v1/weddings/${owner.weddingId}/events/${sangeet}`)
        .set('Cookie', owner.cookie)
        .expect(204);

      for (const id of [album.id, new Types.ObjectId().toHexString(), 'not-an-id']) {
        const res = await patch(owner.cookie, owner.weddingId, id, { isUploadEnabled: false });
        expect(res.status).toBe(404);
        expect(errorOf(res).code).toBe('ALBUM_NOT_FOUND');
      }
    });
  });

  describe('access', () => {
    it('refuses visitors and outsiders, and never touches another wedding’s album', async () => {
      const ours = await ownerWithWedding();
      const theirs = await ownerWithWedding('Kavita Singhal');
      const [theirAlbum] = await listed(theirs.cookie, theirs.weddingId);
      if (!theirAlbum) throw new Error('album missing');

      expect((await list(undefined, ours.weddingId)).status).toBe(401);
      const outsider = await list(theirs.cookie, ours.weddingId);
      expect(outsider.status).toBe(404);
      expect(errorOf(outsider).code).toBe('WEDDING_NOT_FOUND');

      const crossed = await patch(ours.cookie, ours.weddingId, theirAlbum.id, {
        title: 'Mine now',
      });
      expect(crossed.status).toBe(404);
      expect(errorOf(crossed).code).toBe('ALBUM_NOT_FOUND');
      const stored = await albums.findById(theirAlbum.id).lean();
      expect(stored?.title).toBe('General Collection');
    });

    it('refuses every change to an archived wedding, writing nothing', async () => {
      const owner = await ownerWithWedding();
      const [general] = await listed(owner.cookie, owner.weddingId);
      if (!general) throw new Error('album missing');
      await weddings.updateOne({ _id: owner.weddingId }, { $set: { status: 'archived' } });

      const created = await create(owner.cookie, owner.weddingId, { title: 'Late' });
      expect(created.status).toBe(409);
      expect(errorOf(created).code).toBe('WEDDING_ARCHIVED');
      const changed = await patch(owner.cookie, owner.weddingId, general.id, { title: 'Late' });
      expect(changed.status).toBe(409);
      expect(await listed(owner.cookie, owner.weddingId)).toHaveLength(1);
    });
  });

  describe('storage', () => {
    it('reports the wedding’s 5 GB photo storage to its members only', async () => {
      const owner = await ownerWithWedding();
      const other = await ownerWithWedding('Kavita Singhal');
      const res = await request(server())
        .get(`/api/v1/weddings/${owner.weddingId}/quota`)
        .set('Cookie', owner.cookie);
      expect(res.status).toBe(200);
      expect((res.body as { data: unknown }).data).toEqual({
        limitBytes: 5_000_000_000,
        usedBytes: 0,
        reservedBytes: 0,
      });
      const outsider = await request(server())
        .get(`/api/v1/weddings/${owner.weddingId}/quota`)
        .set('Cookie', other.cookie);
      expect(outsider.status).toBe(404);
    });
  });
});
