import { getModelToken } from '@nestjs/mongoose';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Types, type Model } from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { WeddingMembership } from '../src/modules/weddings/schemas/wedding-membership.schema.js';
import { Wedding } from '../src/modules/weddings/schemas/wedding.schema.js';
import { createTestApp } from './support/app.js';
import { resetRateLimits, signupVerified } from './support/auth.js';

interface WebsiteBody {
  templateId: string;
  content: { headline?: string; story?: string; faq: { question: string; answer: string }[] };
  contentVersion: number;
  status: 'draft' | 'published';
  publishedTemplateId?: string;
  hasUnpublishedChanges: boolean;
  slug: string;
  readiness: { ready: boolean; checks: { key: string; ok: boolean; message: string }[] };
  writable: boolean;
  canUnpublish: boolean;
}

interface PublicBody {
  slug: string;
  templateId: string;
  coupleName: string;
  headline?: string;
  story?: string;
  faq: { question: string; answer: string }[];
  dateRange?: { start: string; end: string };
  events: Record<string, unknown>[];
  preview: boolean;
}

describe('Wedding website (integration)', () => {
  let app: NestExpressApplication;
  let weddings: Model<Wedding>;
  let memberships: Model<WeddingMembership>;

  beforeAll(async () => {
    app = await createTestApp();
    weddings = app.get<Model<Wedding>>(getModelToken(Wedding.name));
    memberships = app.get<Model<WeddingMembership>>(getModelToken(WeddingMembership.name));
  });

  afterAll(() => app.close());
  beforeEach(() => resetRateLimits(app));

  const server = () => app.getHttpServer();

  function send(
    method: 'get' | 'post' | 'patch' | 'delete',
    cookie: string | undefined,
    path: string,
    body?: object,
  ) {
    const req = request(server())[method](`/api/v1${path}`);
    const withCookie = cookie ? req.set('Cookie', cookie) : req;
    return body === undefined ? withCookie : withCookie.send(body);
  }

  async function ok<T>(res: request.Test, status = 200): Promise<T> {
    const done = await res;
    expect(done.status, JSON.stringify(done.body)).toBe(status);
    return (done.body as { data: T }).data;
  }

  const codeOf = async (res: request.Test) => {
    const done = await res;
    return [done.status, (done.body as { error?: { code: string } }).error?.code];
  };

  async function ownerWithWedding() {
    const owner = await signupVerified(app, { displayName: 'Ananya Sharma' });
    const tag = Math.random().toString(36).slice(2, 10).replace(/\d/g, 'x');
    const wedding = await ok<{ id: string; slug: string }>(
      send('post', owner.cookie, '/weddings', {
        brideName: `Ananya ${tag}`,
        groomName: 'Arjun',
        city: 'Jaipur',
        state: 'Rajasthan',
      }),
      201,
    );
    const site = `/weddings/${wedding.id}/website`;
    return { ...owner, weddingId: wedding.id, slug: wedding.slug, site };
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

  const event = (cookie: string, weddingId: string, body: object) =>
    ok<{ id: string }>(send('post', cookie, `/weddings/${weddingId}/events`, body), 201);

  it('starts as an empty draft, keeps every word through theme changes, and refuses stale saves', async () => {
    const w = await ownerWithWedding();
    const fresh = await ok<WebsiteBody>(send('get', w.cookie, w.site));
    expect(fresh).toMatchObject({
      templateId: 'traditional',
      content: { faq: [] },
      contentVersion: 0,
      status: 'draft',
      hasUnpublishedChanges: false,
      slug: w.slug,
      writable: true,
      canUnpublish: false,
    });
    expect(fresh.readiness.ready).toBe(false);
    expect(fresh.readiness.checks.find((c) => c.key === 'ceremonies')).toMatchObject({
      ok: false,
      message: 'Add at least one ceremony on the Events page.',
    });

    const content = {
      headline: '  We’re getting   married in Jaipur ',
      story: 'We met in Mumbai.\r\n\r\nNow, Jaipur.',
      faq: [
        { question: 'What should I wear?', answer: 'Festive Indian wear.' },
        { question: 'Is there parking?', answer: 'Valet at every venue.' },
      ],
    };
    let saved = await ok<WebsiteBody>(
      send('patch', w.cookie, w.site, { content, contentVersion: 0 }),
    );
    expect(saved.content).toEqual({
      headline: 'We’re getting married in Jaipur',
      story: 'We met in Mumbai.\n\nNow, Jaipur.',
      faq: content.faq,
    });
    for (const templateId of ['modern', 'royal', 'traditional']) {
      saved = await ok<WebsiteBody>(
        send('patch', w.cookie, w.site, { templateId, contentVersion: saved.contentVersion }),
      );
      expect(saved.templateId).toBe(templateId);
      expect(saved.content).toEqual({
        headline: 'We’re getting married in Jaipur',
        story: 'We met in Mumbai.\n\nNow, Jaipur.',
        faq: content.faq,
      });
    }
    expect(saved.contentVersion).toBe(4);

    // Stale, invalid and oversized edits.
    expect(
      await codeOf(send('patch', w.cookie, w.site, { templateId: 'modern', contentVersion: 1 })),
    ).toEqual([409, 'WEBSITE_VERSION_CONFLICT']);
    expect(
      await codeOf(send('patch', w.cookie, w.site, { templateId: 'minimal', contentVersion: 4 })),
    ).toEqual([400, 'VALIDATION_ERROR']);
    expect(
      await codeOf(
        send('patch', w.cookie, w.site, {
          content: { faq: Array.from({ length: 21 }, () => ({ question: 'Q', answer: 'A' })) },
          contentVersion: 4,
        }),
      ),
    ).toEqual([400, 'VALIDATION_ERROR']);
    expect(
      await codeOf(
        send('patch', w.cookie, w.site, {
          content: { faq: [{ question: '', answer: 'A' }] },
          contentVersion: 4,
        }),
      ),
    ).toEqual([400, 'VALIDATION_ERROR']);

    // Clearing: null and empty remove a text; the FAQ list is replaced whole.
    saved = await ok<WebsiteBody>(
      send('patch', w.cookie, w.site, {
        content: { headline: null, story: '', faq: [] },
        contentVersion: 4,
      }),
    );
    expect(saved.content).toEqual({ faq: [] });
  });

  it('publishes only when ready, keeps drafts off the public site, and unpublishes at once', async () => {
    const w = await ownerWithWedding();
    let site = await ok<WebsiteBody>(
      send('patch', w.cookie, w.site, {
        content: { headline: 'Welcome', faq: [{ question: 'When?', answer: 'February.' }] },
        contentVersion: 0,
      }),
    );
    expect(site.contentVersion).toBe(1);
    expect(
      await codeOf(send('post', w.cookie, `${w.site}/publish`, { contentVersion: 1 })),
    ).toEqual([422, 'WEBSITE_NOT_READY']);

    // A cancelled ceremony is not enough; a scheduled one is.
    const cancelled = await event(w.cookie, w.weddingId, { title: 'Mehendi' });
    await ok(
      send('patch', w.cookie, `/weddings/${w.weddingId}/events/${cancelled.id}`, {
        state: 'cancelled',
      }),
    );
    expect(
      await codeOf(send('post', w.cookie, `${w.site}/publish`, { contentVersion: 1 })),
    ).toEqual([422, 'WEBSITE_NOT_READY']);
    await event(w.cookie, w.weddingId, {
      title: 'Haldi',
      startDate: '2031-02-12',
      startTime: '10:30',
      venue: {
        name: 'Rajvilas Poolside Gardens',
        mapsUrl: 'https://maps.app.goo.gl/AbCdEf123',
      },
      dressCode: 'Yellow hues',
      livestreamUrl: 'https://youtu.be/dQw4w9WgXcQ',
    });
    const deleted = await event(w.cookie, w.weddingId, { title: 'Old plan' });
    await ok(send('delete', w.cookie, `/weddings/${w.weddingId}/events/${deleted.id}`), 204);

    // Anonymous visitors see nothing yet, exactly as for a missing address.
    const unpublished = await send('get', undefined, `/public/weddings/${w.slug}`);
    const missing = await send('get', undefined, '/public/weddings/no-such-wedding-here');
    expect([unpublished.status, missing.status]).toEqual([404, 404]);
    expect((unpublished.body as { error: unknown }).error).toEqual(
      (missing.body as { error: unknown }).error,
    );

    site = await ok<WebsiteBody>(
      send('post', w.cookie, `${w.site}/publish`, { contentVersion: 1 }),
    );
    expect(site).toMatchObject({
      status: 'published',
      publishedTemplateId: 'traditional',
      hasUnpublishedChanges: false,
      canUnpublish: true,
    });
    const visitor = await send('get', undefined, `/public/weddings/${w.slug}`);
    expect(visitor.headers['cache-control']).toBe('no-store');
    const live = (visitor.body as { data: PublicBody }).data;
    expect(live).toMatchObject({
      slug: w.slug,
      templateId: 'traditional',
      headline: 'Welcome',
      faq: [{ question: 'When?', answer: 'February.' }],
      dateRange: { start: '2031-02-12', end: '2031-02-12' },
      preview: false,
    });
    expect(live.events).toEqual([
      {
        title: 'Haldi',
        startDate: '2031-02-12',
        startTime: '10:30',
        timeZone: 'Asia/Kolkata',
        venueName: 'Rajvilas Poolside Gardens',
        mapsUrl: 'https://maps.app.goo.gl/AbCdEf123',
        dressCode: 'Yellow hues',
        livestreamVideoId: 'dQw4w9WgXcQ',
        cancelled: false,
      },
      { title: 'Mehendi', timeZone: 'Asia/Kolkata', cancelled: true },
    ]);
    expect(
      (await ok<{ events: unknown[] }>(send('get', undefined, `/public/weddings/${w.slug}/events`)))
        .events,
    ).toEqual(live.events);

    // A saved draft changes nothing public until it is published.
    site = await ok<WebsiteBody>(
      send('patch', w.cookie, w.site, {
        templateId: 'royal',
        content: { headline: 'New words' },
        contentVersion: 1,
      }),
    );
    expect(site).toMatchObject({ hasUnpublishedChanges: true, publishedTemplateId: 'traditional' });
    expect(
      (await ok<PublicBody>(send('get', undefined, `/public/weddings/${w.slug}`))).headline,
    ).toBe('Welcome');
    const preview = await send('get', w.cookie, `${w.site}/preview`);
    expect(preview.headers['cache-control']).toBe('no-store');
    expect((preview.body as { data: PublicBody }).data).toMatchObject({
      templateId: 'royal',
      headline: 'New words',
      preview: true,
    });
    site = await ok<WebsiteBody>(
      send('post', w.cookie, `${w.site}/publish`, { contentVersion: 2 }),
    );
    expect(site.hasUnpublishedChanges).toBe(false);
    expect(
      await ok<PublicBody>(send('get', undefined, `/public/weddings/${w.slug}`)),
    ).toMatchObject({ templateId: 'royal', headline: 'New words' });

    // Unpublished: gone at once, the draft kept.
    site = await ok<WebsiteBody>(send('post', w.cookie, `${w.site}/unpublish`));
    expect(site).toMatchObject({ status: 'draft', templateId: 'royal' });
    expect(site.content.headline).toBe('New words');
    expect((await send('get', undefined, `/public/weddings/${w.slug}`)).status).toBe(404);
  });

  it('shows the public nothing private, in any field', async () => {
    const w = await ownerWithWedding();
    const haldi = await event(w.cookie, w.weddingId, { title: 'Haldi', startDate: '2031-02-12' });
    await ok(
      send('post', w.cookie, `/weddings/${w.weddingId}/guests`, {
        name: 'Secret Guest Name',
        partySize: 7,
        email: 'secret.guest@example.com',
        phone: '+91 98200 11223',
        organizerNotes: 'Private organizer note',
        eventIds: [haldi.id],
      }),
      201,
    );
    await ok(
      send('post', w.cookie, `/weddings/${w.weddingId}/vendors`, {
        name: 'Secret Vendor Co',
        category: 'Catering',
      }),
      201,
    );
    await ok(send('post', w.cookie, `${w.site}/publish`, { contentVersion: 0 }));
    const res = await send('get', undefined, `/public/weddings/${w.slug}`);
    const raw = JSON.stringify(res.body);
    for (const secret of [
      'Secret Guest Name',
      'secret.guest@example.com',
      '98200',
      'Private organizer note',
      'Secret Vendor Co',
      haldi.id,
      w.weddingId,
      w.userId,
      'partySize',
      'rsvp',
      'token',
    ]) {
      expect(raw, secret).not.toContain(secret);
    }
    // Only the allowlisted keys, at every level.
    expect(Object.keys((res.body as { data: object }).data).sort()).toEqual(
      [
        'brideName',
        'city',
        'coupleName',
        'dateRange',
        'events',
        'faq',
        'groomName',
        'preview',
        'slug',
        'state',
        'templateId',
      ].sort(),
    );
  });

  it('keeps each wedding’s website to its own members', async () => {
    const w = await ownerWithWedding();
    const other = await ownerWithWedding();
    expect((await send('get', other.cookie, w.site)).status).toBe(404);
    expect((await send('patch', other.cookie, w.site, { contentVersion: 0 })).status).toBe(404);
    expect((await send('get', other.cookie, `${w.site}/preview`)).status).toBe(404);
    expect(
      (await send('post', other.cookie, `${w.site}/publish`, { contentVersion: 0 })).status,
    ).toBe(404);
    expect((await send('post', other.cookie, `${w.site}/unpublish`)).status).toBe(404);
    expect((await send('get', undefined, w.site)).status).toBe(401);
    expect((await send('get', undefined, `${w.site}/preview`)).status).toBe(401);
  });

  it('freezes an archived wedding’s website, except that an owner can unpublish it', async () => {
    const w = await ownerWithWedding();
    const manager = await addManager(w.weddingId);
    await event(w.cookie, w.weddingId, { title: 'Wedding' });
    // Managers can publish while the wedding is active.
    await ok(send('post', manager.cookie, `${w.site}/publish`, { contentVersion: 0 }));
    await weddings.updateOne(
      { _id: new Types.ObjectId(w.weddingId) },
      { $set: { status: 'archived' } },
    );

    expect(
      await codeOf(send('patch', w.cookie, w.site, { templateId: 'modern', contentVersion: 0 })),
    ).toEqual([409, 'WEDDING_ARCHIVED']);
    expect(
      await codeOf(send('post', w.cookie, `${w.site}/publish`, { contentVersion: 0 })),
    ).toEqual([409, 'WEDDING_ARCHIVED']);
    // Still public, and still previewable by members.
    expect((await send('get', undefined, `/public/weddings/${w.slug}`)).status).toBe(200);
    const asManager = await ok<WebsiteBody>(send('get', manager.cookie, w.site));
    expect(asManager).toMatchObject({ writable: false, canUnpublish: false });
    expect(await codeOf(send('post', manager.cookie, `${w.site}/unpublish`))).toEqual([
      403,
      'OWNER_REQUIRED',
    ]);
    const asOwner = await ok<WebsiteBody>(send('post', w.cookie, `${w.site}/unpublish`));
    expect(asOwner.status).toBe('draft');
    expect((await send('get', undefined, `/public/weddings/${w.slug}`)).status).toBe(404);
  });

  it('changes the address: old links follow it, and no one else can take the old one', async () => {
    const w = await ownerWithWedding();
    const other = await ownerWithWedding();
    await event(w.cookie, w.weddingId, { title: 'Wedding' });
    await ok(send('post', w.cookie, `${w.site}/publish`, { contentVersion: 0 }));
    const old = w.slug;
    const wanted = `${old.slice(0, 40)}-jaipur`;

    expect(
      await ok(send('get', w.cookie, `${w.site}/address?slug=${encodeURIComponent('Bad Slug!')}`)),
    ).toMatchObject({ valid: false, available: false });
    expect(await ok(send('get', w.cookie, `${w.site}/address?slug=${wanted}`))).toMatchObject({
      slug: wanted,
      valid: true,
      available: true,
    });
    expect(await ok(send('get', w.cookie, `${w.site}/address?slug=${other.slug}`))).toMatchObject({
      available: false,
    });

    const moved = await ok<{ slug: string }>(
      send('patch', w.cookie, `/weddings/${w.weddingId}`, { slug: wanted }),
    );
    expect(moved.slug).toBe(wanted);
    expect((await ok<WebsiteBody>(send('get', w.cookie, w.site))).slug).toBe(wanted);
    // The old address answers with the new one, for a redirect.
    expect((await ok<PublicBody>(send('get', undefined, `/public/weddings/${old}`))).slug).toBe(
      wanted,
    );

    // Nobody else can take either address.
    for (const taken of [old, wanted]) {
      const res = await send('patch', other.cookie, `/weddings/${other.weddingId}`, {
        slug: taken,
      });
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toContain('already taken');
    }
    expect(
      (await send('patch', w.cookie, `/weddings/${w.weddingId}`, { slug: 'Not valid!' })).status,
    ).toBe(400);
    // Its own old address can be taken back.
    expect(
      (
        await ok<{ slug: string }>(
          send('patch', w.cookie, `/weddings/${w.weddingId}`, { slug: old }),
        )
      ).slug,
    ).toBe(old);
    expect((await ok<PublicBody>(send('get', undefined, `/public/weddings/${wanted}`))).slug).toBe(
      old,
    );
  });

  it('checks the ceremony links it will show guests', async () => {
    const w = await ownerWithWedding();
    const events = `/weddings/${w.weddingId}/events`;
    for (const bad of [
      { venue: { mapsUrl: 'https://evil.example/maps' } },
      { venue: { mapsUrl: 'javascript:alert(1)' } },
      { livestreamUrl: 'https://vimeo.com/1' },
    ]) {
      expect((await send('post', w.cookie, events, { title: 'Haldi', ...bad })).status).toBe(400);
    }
    const made = await ok<{
      id: string;
      venue?: { mapsUrl?: string };
      dressCode?: string;
      livestream?: { videoId: string; url: string };
    }>(
      send('post', w.cookie, events, {
        title: 'Haldi',
        venue: { mapsUrl: 'http://maps.google.co.in/?q=Jaipur' },
        dressCode: 'Yellow',
        livestreamUrl: 'https://www.youtube.com/live/dQw4w9WgXcQ?feature=share',
      }),
      201,
    );
    expect(made).toMatchObject({
      venue: { mapsUrl: 'https://maps.google.co.in/?q=Jaipur' },
      dressCode: 'Yellow',
      livestream: {
        videoId: 'dQw4w9WgXcQ',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      },
    });
    const cleared = await ok<{ dressCode?: string; livestream?: unknown }>(
      send('patch', w.cookie, `${events}/${made.id}`, { dressCode: null, livestreamUrl: '' }),
    );
    expect(cleared.dressCode).toBeUndefined();
    expect(cleared.livestream).toBeUndefined();
  });
});
