import { getModelToken } from '@nestjs/mongoose';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Types, type Model } from 'mongoose';
import sharp from 'sharp';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PhotoProcessor } from '../src/modules/media/photo-processor.js';
import { Photo } from '../src/modules/media/schemas/photo.schema.js';
import { PHOTO_UPLOADED } from '../src/modules/media/uploads.service.js';
import { createTestApp } from './support/app.js';
import { resetRateLimits, signupVerified } from './support/auth.js';

const dataOf = <T>(res: request.Response): T => (res.body as { data: T }).data;

interface PublicAlbum {
  id: string;
  title: string;
  photoCount: number;
  coverUrl: string;
}

describe('Public gallery (integration)', () => {
  let app: NestExpressApplication;
  let photos: Model<Photo>;

  beforeAll(async () => {
    app = await createTestApp();
    photos = app.get<Model<Photo>>(getModelToken(Photo.name));
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

  async function publishedWedding() {
    const owner = await signupVerified(app, { displayName: 'Ananya Sharma' });
    const api = as(owner.cookie);
    const tag = Math.random().toString(36).slice(2, 10).replace(/\d/g, 'x');
    const wedding = dataOf<{ id: string; slug: string }>(
      await api.post('/weddings', {
        brideName: `Ananya ${tag}`,
        groomName: 'Arjun',
        city: 'Jaipur',
        state: 'Rajasthan',
      }),
    );
    await api
      .post(`/weddings/${wedding.id}/events`, {
        title: 'Mehendi',
        startDate: '2031-02-12',
        startTime: '16:00',
        venue: { name: 'Royal Courtyard' },
      })
      .expect(201);
    await api
      .patch(`/weddings/${wedding.id}/website`, {
        content: { headline: 'Welcome', faq: [] },
        contentVersion: 0,
      })
      .expect(200);
    const published = await api.post(`/weddings/${wedding.id}/website/publish`, {
      contentVersion: 1,
    });
    expect(published.status, JSON.stringify(published.body)).toBe(200);
    const albums = dataOf<{ albums: { id: string; title: string }[] }>(
      await api.get(`/weddings/${wedding.id}/albums`),
    ).albums;
    const albumId = albums.find((album) => album.title === 'Mehendi')?.id ?? '';
    return { ...owner, api, weddingId: wedding.id, slug: wedding.slug, albumId };
  }

  async function addPhoto(w: Awaited<ReturnType<typeof publishedWedding>>) {
    const file = await sharp({
      create: { width: 300, height: 200, channels: 3, background: '#486' },
    })
      .jpeg()
      .toBuffer();
    const started = dataOf<{ id: string; upload: { url: string; fields: Record<string, string> } }>(
      await w.api.post('/media/uploads/initiate', {
        albumId: w.albumId,
        fileName: 'secret-name.jpg',
        contentType: 'image/jpeg',
        declaredBytes: file.length,
      }),
    );
    let form = request(server()).post(started.upload.url);
    for (const [key, value] of Object.entries(started.upload.fields)) form = form.field(key, value);
    await form.attach('file', file, { filename: 'x.jpg', contentType: 'image/jpeg' }).expect(204);
    await w.api.post(`/media/uploads/${started.id}/complete`).expect(200);
    await app.get(PhotoProcessor).handle({
      id: new Types.ObjectId().toHexString(),
      eventType: PHOTO_UPLOADED,
      aggregateId: started.id,
      payloadRef: {},
    });
    const photo = await photos.findOne({ uploadIntentId: new Types.ObjectId(started.id) }).lean();
    return photo?._id.toHexString() ?? '';
  }

  it('shows approved photos only, without names, and nothing once hidden or unpublished', async () => {
    const w = await publishedWedding();
    // The couple's own photos are approved at once; the second stands in
    // for a guest's photo that has not been reviewed yet.
    const approved = await addPhoto(w);
    const pending = await addPhoto(w);
    await photos.updateOne(
      { _id: new Types.ObjectId(pending) },
      { $set: { moderation: 'pending' }, $unset: { approvedBy: 1, approvedAt: 1 } },
    );

    const gallery = dataOf<{ albums: PublicAlbum[] }>(
      await anyone(`/public/weddings/${w.slug}/albums`),
    );
    expect(gallery.albums).toEqual([
      expect.objectContaining({ id: w.albumId, title: 'Mehendi', photoCount: 1 }),
    ]);
    const listed = await anyone(`/public/weddings/${w.slug}/albums/${w.albumId}/photos`);
    const shown = dataOf<{ photos: { id: string; displayUrl: string }[] }>(listed).photos;
    expect(shown.map((photo) => photo.id)).toEqual([approved]);
    expect(JSON.stringify(listed.body)).not.toMatch(
      /secret-name|uploader|original|\/api\/v1\/weddings\/|"weddings\//,
    );

    const image = await anyone(shown[0]?.displayUrl.replace('/api/v1', '') ?? '');
    expect(image.status).toBe(200);
    expect(image.headers['cache-control']).toBe('public, max-age=300');
    expect((await anyone(`/public/weddings/${w.slug}/photos/${pending}/display`)).status).toBe(404);

    await w.api.post(`/weddings/${w.weddingId}/photos/${approved}/hide`).expect(200);
    expect((await anyone(`/public/weddings/${w.slug}/photos/${approved}/display`)).status).toBe(
      404,
    );
    await w.api.post(`/weddings/${w.weddingId}/photos/${approved}/restore`).expect(200);
    expect((await anyone(`/public/weddings/${w.slug}/photos/${approved}/display`)).status).toBe(
      200,
    );

    await w.api.post(`/weddings/${w.weddingId}/website/unpublish`).expect(200);
    expect(
      dataOf<{ albums: unknown[] }>(await anyone(`/public/weddings/${w.slug}/albums`)).albums,
    ).toEqual([]);
    expect((await anyone(`/public/weddings/${w.slug}/photos/${approved}/display`)).status).toBe(
      404,
    );
    expect((await anyone(`/public/weddings/${w.slug}/albums/${w.albumId}/photos`)).status).toBe(
      404,
    );
  });
});
