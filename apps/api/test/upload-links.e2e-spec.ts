import { getModelToken } from '@nestjs/mongoose';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Types, type Model } from 'mongoose';
import sharp from 'sharp';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { EventInvitation } from '../src/modules/guests/schemas/event-invitation.schema.js';
import { PhotoInviteComposer } from '../src/modules/media/photo-invite.composer.js';
import { PhotoProcessor } from '../src/modules/media/photo-processor.js';
import { Photo } from '../src/modules/media/schemas/photo.schema.js';
import { UploadLinkEmail } from '../src/modules/media/schemas/upload-link-email.schema.js';
import { PHOTO_UPLOADED } from '../src/modules/media/uploads.service.js';
import { Wedding } from '../src/modules/weddings/schemas/wedding.schema.js';
import { WeddingMembership } from '../src/modules/weddings/schemas/wedding-membership.schema.js';
import { createTestApp } from './support/app.js';
import { resetRateLimits, signupVerified } from './support/auth.js';

interface LinkBody {
  id: string;
  scope: 'album' | 'wedding';
  albumId?: string;
  url: string;
}

interface GuestUploadBody {
  coupleName: string;
  scope: string;
  album?: { id: string; title: string };
  albums: { id: string; title: string }[];
  open: boolean;
  closedReason?: string;
}

interface PhotoBody {
  id: string;
  moderation: string;
  source: string;
  uploaderName?: string;
}

function errorOf(res: request.Response) {
  return (res.body as { error: { code: string } }).error;
}

function dataOf<T>(res: request.Response): T {
  return (res.body as { data: T }).data;
}

const tokenOf = (url: string) => url.split('#t=')[1] ?? '';

describe('Upload links, guest uploads and review (integration)', () => {
  let app: NestExpressApplication;
  let weddings: Model<Wedding>;
  let memberships: Model<WeddingMembership>;
  let invitations: Model<EventInvitation>;
  let photos: Model<Photo>;
  let linkEmails: Model<UploadLinkEmail>;
  let jpeg: Buffer;

  beforeAll(async () => {
    app = await createTestApp();
    weddings = app.get<Model<Wedding>>(getModelToken(Wedding.name));
    memberships = app.get<Model<WeddingMembership>>(getModelToken(WeddingMembership.name));
    invitations = app.get<Model<EventInvitation>>(getModelToken(EventInvitation.name));
    photos = app.get<Model<Photo>>(getModelToken(Photo.name));
    linkEmails = app.get<Model<UploadLinkEmail>>(getModelToken(UploadLinkEmail.name));
    jpeg = await sharp({ create: { width: 320, height: 240, channels: 3, background: '#7a9' } })
      .jpeg()
      .toBuffer();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => resetRateLimits(app));

  const server = () => app.getHttpServer();
  const api = (path: string) => `/api/v1${path}`;

  async function ownerWithAlbums(name = 'Ananya Sharma') {
    const owner = await signupVerified(app, { displayName: name });
    const tag = Math.random().toString(36).slice(2, 10).replace(/\d/g, 'x');
    const res = await request(server())
      .post(api('/weddings'))
      .set('Cookie', owner.cookie)
      .send({ brideName: `Ananya ${tag}`, groomName: 'Arjun', city: 'Jaipur', state: 'Rajasthan' });
    const weddingId = dataOf<{ id: string }>(res).id;
    for (const title of ['Mehendi', 'Sangeet']) {
      await request(server())
        .post(api(`/weddings/${weddingId}/events`))
        .set('Cookie', owner.cookie)
        .send({ title })
        .expect(201);
    }
    const albums = dataOf<{ albums: { id: string; title: string; kind: string }[] }>(
      await request(server())
        .get(api(`/weddings/${weddingId}/albums`))
        .set('Cookie', owner.cookie),
    ).albums;
    const byTitle = (title: string) => albums.find((album) => album.title === title)?.id ?? '';
    return {
      ...owner,
      weddingId,
      mehendi: byTitle('Mehendi'),
      sangeet: byTitle('Sangeet'),
      general: albums.find((album) => album.kind === 'general')?.id ?? '',
    };
  }

  function post(cookie: string | undefined, path: string, body: object = {}) {
    const req = request(server()).post(api(path));
    return (cookie ? req.set('Cookie', cookie) : req).send(body);
  }

  /** What the guest page does with a link: exchange it, keep the cookie. */
  async function openLink(url: string) {
    const res = await post(undefined, '/upload-access/exchange', { token: tokenOf(url) });
    const setCookie = res.headers['set-cookie'] as unknown as string[] | undefined;
    const cookie = setCookie?.[0]?.split(';')[0];
    return { res, cookie, view: res.status === 200 ? dataOf<GuestUploadBody>(res) : undefined };
  }

  async function guestUpload(cookie: string, albumId: string, uploaderName?: string) {
    const started = await post(cookie, '/upload-access/uploads', {
      albumId,
      fileName: 'candid.jpg',
      contentType: 'image/jpeg',
      declaredBytes: jpeg.length,
      ...(uploaderName ? { uploaderName } : {}),
    });
    if (started.status !== 201) return { started };
    const upload = dataOf<{ id: string; upload: { url: string; fields: Record<string, string> } }>(
      started,
    );
    let form = request(server()).post(upload.upload.url);
    for (const [key, value] of Object.entries(upload.upload.fields)) form = form.field(key, value);
    await form
      .attach('file', jpeg, { filename: 'candid.jpg', contentType: 'image/jpeg' })
      .expect(204);
    const done = await post(cookie, `/upload-access/uploads/${upload.id}/complete`);
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    await app.get(PhotoProcessor).handle({
      id: new Types.ObjectId().toHexString(),
      eventType: PHOTO_UPLOADED,
      aggregateId: upload.id,
      payloadRef: {},
    });
    const photo = await photos.findOne({ uploadIntentId: new Types.ObjectId(upload.id) }).lean();
    return { started, photoId: photo?._id.toHexString() ?? '' };
  }

  describe('links', () => {
    it('keeps one link per album and one general link, shown again the same until rotated', async () => {
      const owner = await ownerWithAlbums();
      const first = dataOf<LinkBody>(
        await post(
          owner.cookie,
          `/weddings/${owner.weddingId}/albums/${owner.mehendi}/upload-links`,
        ),
      );
      expect(first).toMatchObject({ scope: 'album', albumId: owner.mehendi });
      expect(first.url).toMatch(/\/u#t=[A-Za-z0-9_-]{43}$/);
      const again = dataOf<LinkBody>(
        await post(
          owner.cookie,
          `/weddings/${owner.weddingId}/albums/${owner.mehendi}/upload-links`,
        ),
      );
      expect(again).toEqual(first);

      const general = dataOf<LinkBody>(
        await post(owner.cookie, `/weddings/${owner.weddingId}/upload-links`),
      );
      expect(general.scope).toBe('wedding');
      const listed = dataOf<{ general?: LinkBody; albums: LinkBody[] }>(
        await request(server())
          .get(api(`/weddings/${owner.weddingId}/upload-links`))
          .set('Cookie', owner.cookie),
      );
      expect(listed.general?.url).toBe(general.url);
      expect(listed.albums.map((link) => link.url)).toEqual([first.url]);

      const rotated = dataOf<LinkBody>(
        await post(
          owner.cookie,
          `/weddings/${owner.weddingId}/albums/${owner.mehendi}/upload-links`,
          {
            replace: true,
          },
        ),
      );
      expect(rotated.url).not.toBe(first.url);
      expect((await openLink(first.url)).res.status).toBe(410);
      expect((await openLink(rotated.url)).res.status).toBe(200);
    });

    it('never lets another wedding’s member see or change its links', async () => {
      const owner = await ownerWithAlbums();
      const other = await ownerWithAlbums('Kavita Singhal');
      const link = dataOf<LinkBody>(
        await post(owner.cookie, `/weddings/${owner.weddingId}/upload-links`),
      );
      expect((await post(other.cookie, `/weddings/${owner.weddingId}/upload-links`)).status).toBe(
        404,
      );
      expect(
        (
          await post(
            other.cookie,
            `/weddings/${other.weddingId}/albums/${owner.mehendi}/upload-links`,
          )
        ).status,
      ).toBe(404);
      expect(
        (await post(other.cookie, `/weddings/${other.weddingId}/upload-links/${link.id}/revoke`))
          .status,
      ).toBe(404);
      expect((await openLink(link.url)).res.status).toBe(200);
    });
  });

  describe('guests uploading', () => {
    it('lets a guest with an album link upload there only, with no account, as Pending', async () => {
      const owner = await ownerWithAlbums();
      const link = dataOf<LinkBody>(
        await post(
          owner.cookie,
          `/weddings/${owner.weddingId}/albums/${owner.mehendi}/upload-links`,
        ),
      );
      const { cookie, view } = await openLink(link.url);
      expect(cookie).toMatch(/^mm_upload_session=/);
      expect(view).toMatchObject({
        scope: 'album',
        album: { id: owner.mehendi, title: 'Mehendi' },
        albums: [{ id: owner.mehendi, title: 'Mehendi' }],
        open: true,
      });
      expect(view?.coupleName).toMatch(/^Ananya .* & Arjun$/);

      const { photoId } = await guestUpload(cookie ?? '', owner.mehendi, 'Priya D.');
      const stored = await photos.findById(photoId).lean();
      expect(stored).toMatchObject({
        moderation: 'pending',
        source: 'link',
        uploaderName: 'Priya D.',
      });

      const elsewhere = await guestUpload(cookie ?? '', owner.sangeet);
      expect(elsewhere.started.status).toBe(409);
      expect(errorOf(elsewhere.started).code).toBe('ALBUM_CLOSED');
      // The guest session is not an organizer session.
      expect(
        (
          await request(server())
            .get(api(`/weddings/${owner.weddingId}/albums`))
            .set('Cookie', cookie ?? '')
        ).status,
      ).toBe(401);
    });

    it('lets a general link choose among open albums, and stops at once when revoked', async () => {
      const owner = await ownerWithAlbums();
      await request(server())
        .patch(api(`/weddings/${owner.weddingId}/albums/${owner.sangeet}`))
        .set('Cookie', owner.cookie)
        .send({ isUploadEnabled: false })
        .expect(200);
      const link = dataOf<LinkBody>(
        await post(owner.cookie, `/weddings/${owner.weddingId}/upload-links`),
      );
      const { cookie, view } = await openLink(link.url);
      expect(view?.scope).toBe('wedding');
      expect(view?.albums.map((album) => album.title)).toEqual(['Mehendi', 'General Collection']);

      expect((await guestUpload(cookie ?? '', owner.general)).photoId).not.toBe('');
      expect(errorOf((await guestUpload(cookie ?? '', owner.sangeet)).started).code).toBe(
        'ALBUM_CLOSED',
      );
      const other = await ownerWithAlbums('Kavita Singhal');
      expect(errorOf((await guestUpload(cookie ?? '', other.mehendi)).started).code).toBe(
        'ALBUM_CLOSED',
      );

      await post(
        owner.cookie,
        `/weddings/${owner.weddingId}/upload-links/${link.id}/revoke`,
      ).expect(204);
      const after = await request(server())
        .get(api('/upload-access/current'))
        .set('Cookie', cookie ?? '');
      expect(after.status).toBe(410);
      expect(errorOf(after).code).toBe('UPLOAD_LINK_UNAVAILABLE');
      expect((await guestUpload(cookie ?? '', owner.mehendi)).started.status).toBe(410);
    });

    it('says why nothing can be uploaded, and refuses a forged or missing session', async () => {
      const owner = await ownerWithAlbums();
      const link = dataOf<LinkBody>(
        await post(owner.cookie, `/weddings/${owner.weddingId}/upload-links`),
      );
      await weddings.updateOne(
        { _id: owner.weddingId },
        { $set: { 'quota.usedBytes': 5_000_000_000 } },
      );
      expect((await openLink(link.url)).view).toMatchObject({
        open: false,
        closedReason: 'storage_full',
        albums: [],
      });
      await weddings.updateOne({ _id: owner.weddingId }, { $set: { status: 'archived' } });
      expect((await openLink(link.url)).view?.closedReason).toBe('archived');

      expect((await request(server()).get(api('/upload-access/current'))).status).toBe(401);
      const forged = `mm_upload_session=${new Types.ObjectId().toHexString()}.AAAAAAAAAAAAAAAA.9999999999999.${'A'.repeat(43)}`;
      expect(
        (await request(server()).get(api('/upload-access/current')).set('Cookie', forged)).status,
      ).toBe(401);
      expect(
        (await post(undefined, '/upload-access/exchange', { token: 'x'.repeat(43) })).status,
      ).toBe(410);
    });
  });

  describe('review', () => {
    it('approves, hides, restores, rejects and deletes, freeing space for rejected photos', async () => {
      const owner = await ownerWithAlbums();
      const link = dataOf<LinkBody>(
        await post(owner.cookie, `/weddings/${owner.weddingId}/upload-links`),
      );
      const { cookie } = await openLink(link.url);
      const ids = [];
      for (let i = 0; i < 3; i += 1)
        ids.push((await guestUpload(cookie ?? '', owner.mehendi)).photoId);

      const queue = dataOf<{ photos: PhotoBody[]; total: number }>(
        await request(server())
          .get(api(`/weddings/${owner.weddingId}/photos/review`))
          .set('Cookie', owner.cookie),
      );
      expect(queue.total).toBe(3);
      expect(queue.photos.map((photo) => photo.id)).toEqual(ids);

      const w = `/weddings/${owner.weddingId}/photos`;
      expect(dataOf<PhotoBody>(await post(owner.cookie, `${w}/${ids[0]}/approve`)).moderation).toBe(
        'approved',
      );
      expect(dataOf<PhotoBody>(await post(owner.cookie, `${w}/${ids[0]}/hide`)).moderation).toBe(
        'hidden',
      );
      expect(dataOf<PhotoBody>(await post(owner.cookie, `${w}/${ids[0]}/restore`)).moderation).toBe(
        'approved',
      );
      // Rejecting an approved photo is not a review: hide or delete it instead.
      expect((await post(owner.cookie, `${w}/${ids[0]}/reject`)).status).toBe(404);

      const used = (await weddings.findById(owner.weddingId).lean())?.quota.usedBytes ?? 0;
      const bulk = await post(owner.cookie, `${w}/moderation`, {
        action: 'reject',
        photoIds: [ids[1], ids[2], ids[0]],
      });
      expect(dataOf<{ changed: number }>(bulk).changed).toBe(2);
      const after = (await weddings.findById(owner.weddingId).lean())?.quota.usedBytes ?? 0;
      expect(after).toBeLessThan(used);
      const rejectedImage = await request(server())
        .get(api(`${w}/${ids[1]}/image/thumb`))
        .set('Cookie', owner.cookie);
      expect(rejectedImage.status).toBe(404);

      await request(server())
        .delete(api(`${w}/${ids[0]}`))
        .set('Cookie', owner.cookie)
        .expect(204);
      expect((await photos.findById(ids[0]).lean())?.moderation).toBe('deleted');
      expect((await weddings.findById(owner.weddingId).lean())?.quota.usedBytes).toBe(0);
    });

    it('deletes several photos at once, whatever their state, and frees their space', async () => {
      const owner = await ownerWithAlbums();
      const link = dataOf<LinkBody>(
        await post(owner.cookie, `/weddings/${owner.weddingId}/upload-links`),
      );
      const { cookie } = await openLink(link.url);
      const ids = [];
      for (let i = 0; i < 3; i += 1)
        ids.push((await guestUpload(cookie ?? '', owner.mehendi)).photoId);
      const w = `/weddings/${owner.weddingId}/photos`;
      await post(owner.cookie, `${w}/${ids[0]}/approve`).expect(200);
      await post(owner.cookie, `${w}/${ids[0]}/hide`).expect(200);
      await post(owner.cookie, `${w}/${ids[1]}/approve`).expect(200);

      const bulk = await post(owner.cookie, `${w}/moderation`, { action: 'remove', photoIds: ids });
      expect(dataOf<{ changed: number }>(bulk).changed).toBe(3);
      const left = await photos.find({ _id: { $in: ids } }).lean();
      expect(left.map((photo) => photo.moderation)).toEqual(['deleted', 'deleted', 'deleted']);
      expect((await weddings.findById(owner.weddingId).lean())?.quota.usedBytes).toBe(0);
      // Deleting again changes nothing.
      const again = await post(owner.cookie, `${w}/moderation`, {
        action: 'remove',
        photoIds: ids,
      });
      expect(dataOf<{ changed: number }>(again).changed).toBe(0);
    });

    it('lets only owners take photos down once archived, and nothing else', async () => {
      const owner = await ownerWithAlbums();
      const link = dataOf<LinkBody>(
        await post(owner.cookie, `/weddings/${owner.weddingId}/upload-links`),
      );
      const { cookie } = await openLink(link.url);
      const { photoId } = await guestUpload(cookie ?? '', owner.mehendi);
      const w = `/weddings/${owner.weddingId}/photos`;
      await post(owner.cookie, `${w}/${photoId}/approve`).expect(200);

      const manager = await signupVerified(app, { displayName: 'Rajesh Mehta' });
      await memberships.create({
        weddingId: new Types.ObjectId(owner.weddingId),
        userId: new Types.ObjectId(manager.userId),
        role: 'manager',
        status: 'active',
        activeOwned: false,
        joinedAt: new Date(),
      });
      await weddings.updateOne({ _id: owner.weddingId }, { $set: { status: 'archived' } });

      expect(errorOf(await post(owner.cookie, `${w}/${photoId}/restore`)).code).toBe(
        'WEDDING_ARCHIVED',
      );
      expect(errorOf(await post(manager.cookie, `${w}/${photoId}/hide`)).code).toBe(
        'OWNER_REQUIRED',
      );
      expect(dataOf<PhotoBody>(await post(owner.cookie, `${w}/${photoId}/hide`)).moderation).toBe(
        'hidden',
      );
    });
  });

  describe('emailing guests', () => {
    it('emails the general link to all guests with an address, or only those attending', async () => {
      const owner = await ownerWithAlbums();
      const events = dataOf<{ events: { id: string }[] }>(
        await request(server())
          .get(api(`/weddings/${owner.weddingId}/events`))
          .set('Cookie', owner.cookie),
      ).events;
      const guestIds: string[] = [];
      for (const [name, email] of [
        ['Priya Desai', 'priya@example.com'],
        ['Rohan Malhotra', 'rohan@example.com'],
        ['Nani', undefined],
      ] as const) {
        const res = await post(owner.cookie, `/weddings/${owner.weddingId}/guests`, {
          name,
          partySize: 2,
          ...(email ? { email } : {}),
          eventIds: events.map((event) => event.id),
        });
        expect(res.status, JSON.stringify(res.body)).toBe(201);
        guestIds.push(dataOf<{ guest: { id: string } }>(res).guest.id);
      }
      await invitations.updateOne(
        { guestId: new Types.ObjectId(guestIds[0]), eventId: new Types.ObjectId(events[0]?.id) },
        { $set: { 'rsvp.status': 'attending' } },
      );

      const counts = dataOf<{ all: number; attending: number }>(
        await request(server())
          .get(api(`/weddings/${owner.weddingId}/upload-links/email-audiences`))
          .set('Cookie', owner.cookie),
      );
      expect(counts).toEqual({ all: 2, attending: 1 });

      const sent = await post(owner.cookie, `/weddings/${owner.weddingId}/upload-links/email`, {
        audience: 'attending',
      });
      expect(dataOf<{ queued: number }>(sent).queued).toBe(1);
      const [record] = await linkEmails
        .find({ weddingId: new Types.ObjectId(owner.weddingId) })
        .lean();
      expect(record).toMatchObject({
        guestName: 'Priya Desai',
        emailNormalized: 'priya@example.com',
      });

      const composer = app.get(PhotoInviteComposer);
      const email = {
        notificationId: record?.notificationId.toHexString() ?? '',
        kind: 'photo_upload_invite' as const,
        recipientEmailNormalized: 'priya@example.com',
        requestedAt: new Date(),
      };
      const composed = await composer.compose(email);
      const general = dataOf<LinkBody>(
        await post(owner.cookie, `/weddings/${owner.weddingId}/upload-links`),
      );
      expect(composed?.subject).toMatch(/^Share your photos from Ananya .* & Arjun’s wedding$/);
      expect(composed?.text).toContain(general.url);
      expect(composed?.text).toContain('Dear Priya Desai');

      // Revoked before sending: the email is not sent.
      await post(
        owner.cookie,
        `/weddings/${owner.weddingId}/upload-links/${general.id}/revoke`,
      ).expect(204);
      expect(await composer.compose(email)).toBeNull();
    });
  });
});
