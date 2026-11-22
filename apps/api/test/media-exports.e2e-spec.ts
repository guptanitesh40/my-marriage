import { getModelToken } from '@nestjs/mongoose';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Types, type Model } from 'mongoose';
import sharp from 'sharp';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  EXPORT_REQUESTED,
  MediaExportsService,
} from '../src/modules/media/media-exports.service.js';
import { PhotoProcessor } from '../src/modules/media/photo-processor.js';
import { MediaExport } from '../src/modules/media/schemas/media-export.schema.js';
import { Photo } from '../src/modules/media/schemas/photo.schema.js';
import { PHOTO_UPLOADED } from '../src/modules/media/uploads.service.js';
import { createTestApp } from './support/app.js';
import { resetRateLimits, signupVerified } from './support/auth.js';

interface ExportBody {
  id: string;
  state: string;
  photoCount?: number;
  downloadUrl?: string;
}

const dataOf = <T>(res: request.Response): T => (res.body as { data: T }).data;

/** A ZIP's entry names, read from its central directory (stored, not compressed). */
function entries(zip: Buffer): string[] {
  const names: string[] = [];
  for (let at = zip.indexOf('PK\x01\x02'); at !== -1; at = zip.indexOf('PK\x01\x02', at + 4)) {
    const length = zip.readUInt16LE(at + 28);
    names.push(zip.subarray(at + 46, at + 46 + length).toString('utf8'));
  }
  return names;
}

describe('Photo downloads and exports (integration)', () => {
  let app: NestExpressApplication;
  let photos: Model<Photo>;
  let exportsModel: Model<MediaExport>;

  beforeAll(async () => {
    app = await createTestApp();
    photos = app.get<Model<Photo>>(getModelToken(Photo.name));
    exportsModel = app.get<Model<MediaExport>>(getModelToken(MediaExport.name));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => resetRateLimits(app));

  const server = () => app.getHttpServer();

  async function weddingWithPhotos() {
    const owner = await signupVerified(app, { displayName: 'Ananya Sharma' });
    const tag = Math.random().toString(36).slice(2, 10).replace(/\d/g, 'x');
    const made = await request(server())
      .post('/api/v1/weddings')
      .set('Cookie', owner.cookie)
      .send({ brideName: `Ananya ${tag}`, groomName: 'Arjun', city: 'Jaipur', state: 'Rajasthan' });
    const weddingId = dataOf<{ id: string }>(made).id;
    await request(server())
      .post(`/api/v1/weddings/${weddingId}/events`)
      .set('Cookie', owner.cookie)
      .send({ title: 'Mehendi' })
      .expect(201);
    const albums = dataOf<{ albums: { id: string }[] }>(
      await request(server())
        .get(`/api/v1/weddings/${weddingId}/albums`)
        .set('Cookie', owner.cookie),
    ).albums;
    const albumId = albums[0]?.id ?? '';
    const ids: string[] = [];
    for (const name of ['henna.jpg', 'henna.jpg']) {
      const file = await sharp({
        create: { width: 200, height: 150, channels: 3, background: '#a63' },
      })
        .jpeg()
        .toBuffer();
      const started = dataOf<{
        id: string;
        upload: { url: string; fields: Record<string, string> };
      }>(
        await request(server())
          .post('/api/v1/media/uploads/initiate')
          .set('Cookie', owner.cookie)
          .send({ albumId, fileName: name, contentType: 'image/jpeg', declaredBytes: file.length }),
      );
      let form = request(server()).post(started.upload.url);
      for (const [key, value] of Object.entries(started.upload.fields))
        form = form.field(key, value);
      await form.attach('file', file, { filename: name, contentType: 'image/jpeg' }).expect(204);
      await request(server())
        .post(`/api/v1/media/uploads/${started.id}/complete`)
        .set('Cookie', owner.cookie)
        .expect(200);
      await app.get(PhotoProcessor).handle({
        id: new Types.ObjectId().toHexString(),
        eventType: PHOTO_UPLOADED,
        aggregateId: started.id,
        payloadRef: {},
      });
      const photo = await photos.findOne({ uploadIntentId: new Types.ObjectId(started.id) }).lean();
      ids.push(photo?._id.toHexString() ?? '');
    }
    // Both are approved as the owner added them; the second stands in for a
    // guest's photo still waiting for review.
    await photos.updateOne(
      { _id: new Types.ObjectId(ids[1]) },
      { $set: { moderation: 'pending' }, $unset: { approvedBy: 1, approvedAt: 1 } },
    );
    return { ...owner, weddingId, albumId, ids };
  }

  async function exported(cookie: string, weddingId: string, body: object) {
    const started = await request(server())
      .post(`/api/v1/weddings/${weddingId}/media-exports`)
      .set('Cookie', cookie)
      .send(body);
    expect(started.status, JSON.stringify(started.body)).toBe(202);
    const job = dataOf<ExportBody>(started);
    expect(job.state).toBe('queued');
    await app.get(MediaExportsService).handle({
      id: new Types.ObjectId().toHexString(),
      eventType: EXPORT_REQUESTED,
      aggregateId: job.id,
      payloadRef: {},
    });
    return dataOf<ExportBody>(
      await request(server())
        .get(`/api/v1/weddings/${weddingId}/media-exports/${job.id}`)
        .set('Cookie', cookie),
    );
  }

  it('zips approved photos, or all of them, in a folder per album', async () => {
    const w = await weddingWithPhotos();
    const approved = await exported(w.cookie, w.weddingId, { scope: 'approved' });
    expect(approved).toMatchObject({ state: 'ready', photoCount: 1 });
    const zip = await request(server())
      .get(approved.downloadUrl ?? '')
      .set('Cookie', w.cookie)
      .buffer(true)
      .parse((res, done) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => done(null, Buffer.concat(chunks)));
      });
    expect(zip.status).toBe(200);
    expect(zip.headers['content-type']).toBe('application/zip');
    expect(zip.headers['content-disposition']).toMatch(/^attachment; filename="wedding-photos-/);
    expect(entries(zip.body as Buffer)).toEqual(['Mehendi/0001-henna.jpg']);

    const all = await exported(w.cookie, w.weddingId, { scope: 'all', albumId: w.albumId });
    expect(all.photoCount).toBe(2);
  });

  it('downloads one original, byte for byte, to the wedding’s members only', async () => {
    const w = await weddingWithPhotos();
    const stored = await photos.findById(w.ids[0]).lean();
    const res = await request(server())
      .get(`/api/v1/weddings/${w.weddingId}/photos/${w.ids[0]}/original`)
      .set('Cookie', w.cookie)
      .buffer(true);
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toContain('henna.jpg');
    expect((res.body as Buffer).length).toBe(stored?.byteCounts.original);

    const other = await signupVerified(app, { displayName: 'Kavita Singhal' });
    expect(
      (
        await request(server())
          .get(`/api/v1/weddings/${w.weddingId}/photos/${w.ids[0]}/original`)
          .set('Cookie', other.cookie)
      ).status,
    ).toBe(404);
    expect(
      (
        await request(server())
          .post(`/api/v1/weddings/${w.weddingId}/media-exports`)
          .set('Cookie', other.cookie)
          .send({ scope: 'all' })
      ).status,
    ).toBe(404);
  });

  it('removes a ZIP once its time is up', async () => {
    const w = await weddingWithPhotos();
    const job = await exported(w.cookie, w.weddingId, { scope: 'approved' });
    await exportsModel.updateOne(
      { _id: job.id },
      { $set: { expiresAt: new Date(Date.now() - 1) } },
    );
    await app.get(MediaExportsService).expireOld();
    const after = dataOf<ExportBody>(
      await request(server())
        .get(`/api/v1/weddings/${w.weddingId}/media-exports/${job.id}`)
        .set('Cookie', w.cookie),
    );
    expect(after.state).toBe('expired');
    expect(after.downloadUrl).toBeUndefined();
    expect(
      (
        await request(server())
          .get(job.downloadUrl ?? '')
          .set('Cookie', w.cookie)
      ).status,
    ).toBe(404);
  });
});
