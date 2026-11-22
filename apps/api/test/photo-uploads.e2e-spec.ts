import { getModelToken } from '@nestjs/mongoose';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Types, type Model } from 'mongoose';
import sharp from 'sharp';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PhotoProcessor } from '../src/modules/media/photo-processor.js';
import { Photo } from '../src/modules/media/schemas/photo.schema.js';
import { UploadIntent } from '../src/modules/media/schemas/upload-intent.schema.js';
import { PHOTO_UPLOADED, UploadsService } from '../src/modules/media/uploads.service.js';
import { Wedding } from '../src/modules/weddings/schemas/wedding.schema.js';
import { OutboxEvent } from '../src/platform/outbox/outbox-event.schema.js';
import { createTestApp } from './support/app.js';
import { resetRateLimits, signupVerified } from './support/auth.js';

interface UploadBody {
  id: string;
  albumId: string;
  state: string;
  upload?: { url: string; fields: Record<string, string> };
}

interface PhotoBody {
  id: string;
  moderation: string;
  source: string;
  uploadedByName?: string;
  originalName: string;
  width: number;
  height: number;
  bytes: number;
  thumbUrl: string;
  displayUrl: string;
}

function errorOf(res: request.Response) {
  return (res.body as { error: { code: string } }).error;
}

/** A real JPEG, wider than tall, carrying a camera's "rotate 90°" tag and a location. */
async function cameraJpeg(width = 1600, height = 1000): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: '#c8843c' } })
    .jpeg({ quality: 90 })
    .withMetadata({ orientation: 6 })
    .withExifMerge({ IFD0: { Make: 'TestCam' }, IFD3: { GPSLatitudeRef: 'N' } })
    .toBuffer();
}

describe('Photo uploads (integration)', () => {
  let app: NestExpressApplication;
  let weddings: Model<Wedding>;
  let intents: Model<UploadIntent>;
  let photos: Model<Photo>;
  let outbox: Model<OutboxEvent>;

  beforeAll(async () => {
    app = await createTestApp();
    weddings = app.get<Model<Wedding>>(getModelToken(Wedding.name));
    intents = app.get<Model<UploadIntent>>(getModelToken(UploadIntent.name));
    photos = app.get<Model<Photo>>(getModelToken(Photo.name));
    outbox = app.get<Model<OutboxEvent>>(getModelToken(OutboxEvent.name));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => resetRateLimits(app));

  const server = () => app.getHttpServer();

  async function ownerWithAlbum(name = 'Ananya Sharma') {
    const owner = await signupVerified(app, { displayName: name });
    const tag = Math.random().toString(36).slice(2, 10).replace(/\d/g, 'x');
    const res = await request(server())
      .post('/api/v1/weddings')
      .set('Cookie', owner.cookie)
      .send({ brideName: `Ananya ${tag}`, groomName: 'Arjun', city: 'Jaipur', state: 'Rajasthan' });
    expect(res.status).toBe(201);
    const weddingId = (res.body as { data: { id: string } }).data.id;
    await request(server())
      .post(`/api/v1/weddings/${weddingId}/events`)
      .set('Cookie', owner.cookie)
      .send({ title: 'Mehendi' })
      .expect(201);
    const albums = await request(server())
      .get(`/api/v1/weddings/${weddingId}/albums`)
      .set('Cookie', owner.cookie);
    const albumId = (albums.body as { data: { albums: { id: string }[] } }).data.albums[0]?.id;
    if (!albumId) throw new Error('album missing');
    return { ...owner, weddingId, albumId };
  }

  function initiate(cookie: string, body: Record<string, unknown>) {
    return request(server())
      .post('/api/v1/media/uploads/initiate')
      .set('Cookie', cookie)
      .send(body);
  }

  async function started(
    cookie: string,
    albumId: string,
    file: Buffer,
    contentType = 'image/jpeg',
  ) {
    const res = await initiate(cookie, {
      albumId,
      fileName: 'IMG_3892_mehendi.jpg',
      contentType,
      declaredBytes: file.length,
    });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    return (res.body as { data: UploadBody }).data;
  }

  /** What the browser does with the form: post the file to it. */
  async function send(upload: UploadBody, file: Buffer, contentType = 'image/jpeg') {
    if (!upload.upload) throw new Error('no form');
    let req = request(server()).post(upload.upload.url);
    for (const [key, value] of Object.entries(upload.upload.fields)) req = req.field(key, value);
    const sent = await req.attach('file', file, { filename: 'photo', contentType });
    expect(sent.status, JSON.stringify(sent.body)).toBe(204);
  }

  function complete(cookie: string, uploadId: string) {
    return request(server())
      .post(`/api/v1/media/uploads/${uploadId}/complete`)
      .set('Cookie', cookie);
  }

  /** What the worker does with the outbox event. */
  async function processUpload(uploadId: string) {
    await app.get(PhotoProcessor).handle({
      id: new Types.ObjectId().toHexString(),
      eventType: PHOTO_UPLOADED,
      aggregateId: uploadId,
      payloadRef: {},
    });
  }

  async function quotaOf(weddingId: string) {
    const wedding = await weddings.findById(weddingId).lean();
    return wedding?.quota;
  }

  async function listPhotos(cookie: string, weddingId: string, albumId: string) {
    const res = await request(server())
      .get(`/api/v1/weddings/${weddingId}/albums/${albumId}/photos`)
      .set('Cookie', cookie);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    return (res.body as { data: { photos: PhotoBody[]; processing: number } }).data;
  }

  it('sets space aside, accepts the file, and keeps an upright, metadata-free photo, approved since a member added it', async () => {
    const owner = await ownerWithAlbum();
    const file = await cameraJpeg();
    const upload = await started(owner.cookie, owner.albumId, file);
    expect(upload.state).toBe('initiated');
    expect((await quotaOf(owner.weddingId))?.reservedBytes).toBe(Math.ceil(file.length * 1.3));

    await send(upload, file);
    const done = await complete(owner.cookie, upload.id);
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((done.body as { data: UploadBody }).data).toMatchObject({ state: 'uploaded' });
    expect((done.body as { data: UploadBody }).data.upload).toBeUndefined();
    expect(
      await outbox.countDocuments({
        eventType: PHOTO_UPLOADED,
        aggregateId: new Types.ObjectId(upload.id),
      }),
    ).toBe(1);
    // Completing again answers the same, and queues nothing more.
    expect((await complete(owner.cookie, upload.id)).status).toBe(200);
    expect(
      await outbox.countDocuments({
        eventType: PHOTO_UPLOADED,
        aggregateId: new Types.ObjectId(upload.id),
      }),
    ).toBe(1);
    expect((await listPhotos(owner.cookie, owner.weddingId, owner.albumId)).processing).toBe(1);

    await processUpload(upload.id);
    await processUpload(upload.id);
    const listed = await listPhotos(owner.cookie, owner.weddingId, owner.albumId);
    expect(listed.processing).toBe(0);
    expect(listed.photos).toHaveLength(1);
    const [photo] = listed.photos;
    expect(photo).toMatchObject({
      // The couple's and managers' own photos need no review (decision 0019).
      moderation: 'approved',
      source: 'organizer',
      uploadedByName: 'Ananya Sharma',
      originalName: 'IMG_3892_mehendi.jpg',
      // Turned upright: the camera said "rotate 90°".
      width: 1000,
      height: 1600,
      bytes: file.length,
    });

    const stored = await photos.findById(photo?.id).lean();
    expect(stored?.approvedBy?.equals(stored.uploadedBy ?? '')).toBe(true);
    expect(stored?.approvedAt).toBeInstanceOf(Date);
    const quota = await quotaOf(owner.weddingId);
    expect(quota?.reservedBytes).toBe(0);
    expect(quota?.usedBytes).toBe(
      (stored?.byteCounts.original ?? 0) +
        (stored?.byteCounts.display ?? 0) +
        (stored?.byteCounts.thumb ?? 0),
    );

    const display = await request(server())
      .get(photo?.displayUrl ?? '')
      .set('Cookie', owner.cookie)
      .buffer(true);
    expect(display.status).toBe(200);
    expect(display.headers['content-type']).toBe('image/webp');
    expect(display.headers['cache-control']).toBe('private, max-age=300');
    const meta = await sharp(display.body as Buffer).metadata();
    expect([meta.width, meta.height]).toEqual([1000, 1600]);
    expect(meta.exif).toBeUndefined();

    const albums = await request(server())
      .get(`/api/v1/weddings/${owner.weddingId}/albums`)
      .set('Cookie', owner.cookie);
    expect((albums.body as { data: { albums: unknown[] } }).data.albums[0]).toMatchObject({
      counts: { pending: 0, approved: 1, total: 1 },
      coverUrl: photo?.thumbUrl,
    });
  });

  it('lets uploads at the same time take only the space that is left', async () => {
    const owner = await ownerWithAlbum();
    await weddings.updateOne(
      { _id: owner.weddingId },
      { $set: { 'quota.usedBytes': 5_000_000_000 - 20_000_000 } },
    );
    // Each sets aside 13 MB (10 MB × 1.3): only one fits in the 20 MB left.
    const results = await Promise.all(
      [0, 1, 2].map(() =>
        initiate(owner.cookie, {
          albumId: owner.albumId,
          fileName: 'big.jpg',
          contentType: 'image/jpeg',
          declaredBytes: 10_000_000,
        }),
      ),
    );
    expect(results.map((res) => res.status).sort()).toEqual([201, 409, 409]);
    expect(results.filter((res) => res.status === 409).map((res) => errorOf(res).code)).toEqual([
      'STORAGE_FULL',
      'STORAGE_FULL',
    ]);
    const quota = await quotaOf(owner.weddingId);
    expect(quota?.reservedBytes).toBe(13_000_000);
    expect((quota?.usedBytes ?? 0) + (quota?.reservedBytes ?? 0)).toBeLessThanOrEqual(
      5_000_000_000,
    );
  });

  it('refuses a file that is not the photo it claimed, and gives its space back', async () => {
    const owner = await ownerWithAlbum();
    const fake = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    const upload = await started(owner.cookie, owner.albumId, fake);
    await send(upload, fake);
    const res = await complete(owner.cookie, upload.id);
    expect(res.status).toBe(422);
    expect(errorOf(res).code).toBe('UPLOAD_NOT_IMAGE');
    expect((await quotaOf(owner.weddingId))?.reservedBytes).toBe(0);
    expect((await intents.findById(upload.id).lean())?.state).toBe('failed');
    expect(errorOf(await complete(owner.cookie, upload.id)).code).toBe('UPLOAD_EXPIRED');
  });

  it('never keeps a file that only starts like a JPEG', async () => {
    const owner = await ownerWithAlbum();
    const broken = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(2000, 7)]);
    const upload = await started(owner.cookie, owner.albumId, broken);
    await send(upload, broken);
    expect((await complete(owner.cookie, upload.id)).status).toBe(200);
    await processUpload(upload.id);
    expect((await intents.findById(upload.id).lean())?.state).toBe('failed');
    expect(await photos.countDocuments({ weddingId: owner.weddingId })).toBe(0);
    const quota = await quotaOf(owner.weddingId);
    expect([quota?.usedBytes, quota?.reservedBytes]).toEqual([0, 0]);
  });

  it('waits for the file, then gives back the space of an abandoned upload once', async () => {
    const owner = await ownerWithAlbum();
    const upload = await started(owner.cookie, owner.albumId, await cameraJpeg(400, 300));
    const early = await complete(owner.cookie, upload.id);
    expect(early.status).toBe(409);
    expect(errorOf(early).code).toBe('UPLOAD_NOT_RECEIVED');

    await intents.updateOne(
      { _id: upload.id },
      { $set: { expiresAt: new Date(Date.now() - 1000) } },
    );
    const sweeper = app.get(UploadsService);
    await Promise.all([sweeper.expireAbandoned(), sweeper.expireAbandoned()]);
    expect((await quotaOf(owner.weddingId))?.reservedBytes).toBe(0);
    expect((await intents.findById(upload.id).lean())?.state).toBe('expired');
    expect(errorOf(await complete(owner.cookie, upload.id)).code).toBe('UPLOAD_EXPIRED');
  });

  it('checks the request and keeps every wedding’s photos to itself', async () => {
    const owner = await ownerWithAlbum();
    const other = await ownerWithAlbum('Kavita Singhal');
    const file = await cameraJpeg(400, 300);

    const bad = await initiate(owner.cookie, {
      albumId: owner.albumId,
      fileName: 'clip.mov',
      contentType: 'video/quicktime',
      declaredBytes: 26_000_000,
    });
    expect(bad.status).toBe(400);

    const crossed = await initiate(other.cookie, {
      albumId: owner.albumId,
      fileName: 'x.jpg',
      contentType: 'image/jpeg',
      declaredBytes: 100,
    });
    expect(crossed.status).toBe(404);
    expect(errorOf(crossed).code).toBe('WEDDING_NOT_FOUND');

    const upload = await started(owner.cookie, owner.albumId, file);
    await send(upload, file);
    expect((await complete(other.cookie, upload.id)).status).toBe(404);
    await complete(owner.cookie, upload.id).expect(200);
    await processUpload(upload.id);
    const [photo] = (await listPhotos(owner.cookie, owner.weddingId, owner.albumId)).photos;

    expect(
      (
        await request(server())
          .get(photo?.thumbUrl ?? '')
          .set('Cookie', other.cookie)
      ).status,
    ).toBe(404);
    expect((await request(server()).get(photo?.thumbUrl ?? '')).status).toBe(401);
    expect(
      (
        await request(server())
          .get(`/api/v1/weddings/${owner.weddingId}/albums/${owner.albumId}/photos`)
          .set('Cookie', other.cookie)
      ).status,
    ).toBe(404);
    expect(
      (
        await request(server())
          .get(`/api/v1/weddings/${other.weddingId}/photos/${photo?.id ?? ''}/image/thumb`)
          .set('Cookie', other.cookie)
      ).status,
    ).toBe(404);
  });

  it('takes no uploads for an archived wedding', async () => {
    const owner = await ownerWithAlbum();
    await weddings.updateOne({ _id: owner.weddingId }, { $set: { status: 'archived' } });
    const res = await initiate(owner.cookie, {
      albumId: owner.albumId,
      fileName: 'late.jpg',
      contentType: 'image/jpeg',
      declaredBytes: 1000,
    });
    expect(res.status).toBe(409);
    expect(errorOf(res).code).toBe('WEDDING_ARCHIVED');
    expect((await quotaOf(owner.weddingId))?.reservedBytes).toBe(0);
  });
});
