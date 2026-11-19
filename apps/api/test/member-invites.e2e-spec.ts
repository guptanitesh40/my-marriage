import { Logger } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Types, type Model } from 'mongoose';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthEmailComposer } from '../src/modules/auth/auth-email.composer.js';
import { AuthModule } from '../src/modules/auth/auth.module.js';
import { User } from '../src/modules/auth/schemas/user.schema.js';
import { PermanentMailError } from '../src/modules/notifications/mail/mail-transport.js';
import { Notification } from '../src/modules/notifications/notification.schema.js';
import { InviteEmailComposer } from '../src/modules/weddings/invite-email.composer.js';
import { MembershipInvite } from '../src/modules/weddings/schemas/membership-invite.schema.js';
import { WeddingMembership } from '../src/modules/weddings/schemas/wedding-membership.schema.js';
import { Wedding } from '../src/modules/weddings/schemas/wedding.schema.js';
import { WeddingsModule } from '../src/modules/weddings/weddings.module.js';
import { WEDDING_RATE_LIMITS } from '../src/modules/weddings/wedding-policy.js';
import { sha256 } from '../src/platform/crypto.js';
import { RateLimiter } from '../src/platform/rate-limit.js';
import { createTestApp } from './support/app.js';
import {
  resetRateLimits,
  signup,
  signupVerified,
  tokenFromEmail,
  uniqueEmail,
} from './support/auth.js';
import { createTestWorker, waitFor, type TestWorker } from './support/worker.js';

function tag(): string {
  return Array.from({ length: 8 }, () =>
    String.fromCharCode(97 + Math.floor(Math.random() * 26)),
  ).join('');
}

describe('Partner invitations (integration)', () => {
  let app: NestExpressApplication;
  let worker: TestWorker;
  let weddings: Model<Wedding>;
  let memberships: Model<WeddingMembership>;
  let invites: Model<MembershipInvite>;
  let notifications: Model<Notification>;

  beforeAll(async () => {
    app = await createTestApp();
    worker = await createTestWorker({
      imports: [AuthModule, WeddingsModule],
      composers: [AuthEmailComposer, InviteEmailComposer],
    });
    weddings = app.get<Model<Wedding>>(getModelToken(Wedding.name));
    memberships = app.get<Model<WeddingMembership>>(getModelToken(WeddingMembership.name));
    invites = app.get<Model<MembershipInvite>>(getModelToken(MembershipInvite.name));
    notifications = app.get<Model<Notification>>(getModelToken(Notification.name));
  });

  afterAll(async () => {
    await worker.context.close();
    await app.close();
  });

  beforeEach(() => resetRateLimits(app));
  afterEach(() => vi.restoreAllMocks());

  const http = () => request(app.getHttpServer());

  /** A verified owner with a new wedding. */
  async function ownerWithWedding() {
    const owner = await signupVerified(app);
    const res = await http()
      .post('/api/v1/weddings')
      .set('Cookie', owner.cookie)
      .send({
        brideName: `Ananya ${tag()}`,
        groomName: 'Arjun',
        city: 'Jaipur',
        state: 'Rajasthan',
      });
    expect(res.status).toBe(201);
    const wedding = (res.body as { data: { id: string; brideName: string } }).data;
    return { ...owner, weddingId: wedding.id, brideName: wedding.brideName };
  }

  function invite(cookie: string, weddingId: string, email: string, role = 'owner') {
    return http()
      .post(`/api/v1/weddings/${weddingId}/member-invites`)
      .set('Cookie', cookie)
      .send({ email, role });
  }

  function accept(cookie: string | undefined, token: string) {
    const req = http().post('/api/v1/member-invites/accept');
    return (cookie ? req.set('Cookie', cookie) : req).send({ token });
  }

  function preview(token: string) {
    return http().post('/api/v1/member-invites/preview').send({ token });
  }

  /** The newest invitation email to `address`, once there are `count`. */
  async function invitationEmail(address: string, count = 1) {
    const found = await waitFor(
      () => {
        const sent = worker.mail.sent.filter(
          (email) => email.to === address && email.subject.includes('invited you'),
        );
        return sent.length >= count ? sent : undefined;
      },
      { what: `${count} invitation email(s) to ${address}` },
    );
    return found[found.length - 1];
  }

  function codeOf(res: request.Response): string {
    return (res.body as { error: { code: string } }).error.code;
  }

  it('invites the partner by email, with a link stored only as a hash', async () => {
    const owner = await ownerWithWedding();
    const email = uniqueEmail('partner');
    const res = await invite(owner.cookie, owner.weddingId, email.toUpperCase());

    expect(res.status).toBe(201);
    const data = (res.body as { data: Record<string, unknown> }).data;
    expect(data).toMatchObject({ email, role: 'owner', status: 'pending', emailStatus: 'sending' });
    const expiresAt = new Date(data.expiresAt as string).getTime();
    expect(expiresAt - Date.now()).toBeGreaterThan(6.9 * 24 * 3600 * 1000);

    const message = await invitationEmail(email);
    expect(message?.subject).toBe(
      `Priya Sharma invited you to plan ${owner.brideName} & Arjun’s wedding`,
    );
    expect(message?.text).toMatch(/\/invitations\/accept#token=[A-Za-z0-9_-]{43}/);
    const token = tokenFromEmail(message);

    const stored = await invites.findById(data.id).lean();
    expect(stored?.tokenHashes).toEqual([sha256(token)]);
    expect(JSON.stringify(stored)).not.toContain(token);
    const notification = await notifications.findById(stored?.notificationId).lean();
    expect(notification).toMatchObject({ kind: 'member_invite', recipientEmailNormalized: email });
    expect(notification?.weddingId?.toHexString()).toBe(owner.weddingId);

    // The owners see that the email went out.
    const listed = await waitFor(async () => {
      const list = await http()
        .get(`/api/v1/weddings/${owner.weddingId}/member-invites`)
        .set('Cookie', owner.cookie);
      const first = (list.body as { data: { emailStatus: string }[] }).data[0];
      return first?.emailStatus === 'sent' ? first : undefined;
    });
    expect(listed).toMatchObject({ email, status: 'pending' });
  });

  it('is for owners of the wedding only, never yourself, and only the partner role', async () => {
    const owner = await ownerWithWedding();
    const stranger = await signupVerified(app);
    const manager = await signupVerified(app);
    await memberships.create({
      weddingId: new Types.ObjectId(owner.weddingId),
      userId: new Types.ObjectId(manager.userId),
      role: 'manager',
      status: 'active',
      activeOwned: false,
      joinedAt: new Date(),
    });
    const email = uniqueEmail('partner');

    expect(codeOf(await invite(manager.cookie, owner.weddingId, email))).toBe('OWNER_REQUIRED');
    expect(codeOf(await invite(stranger.cookie, owner.weddingId, email))).toBe('WEDDING_NOT_FOUND');
    expect((await invite(owner.cookie, 'not-an-id', email)).status).toBe(404);
    expect((await invite(owner.cookie, new Types.ObjectId().toHexString(), email)).status).toBe(
      404,
    );
    expect((await invite(owner.cookie, owner.weddingId, email, 'manager')).status).toBe(400);
    const self = await http()
      .get('/api/v1/auth/me')
      .set('Cookie', owner.cookie)
      .then((res) => (res.body as { data: { email: string } }).data.email);
    const mine = await invite(owner.cookie, owner.weddingId, self);
    expect(mine.status).toBe(400);
    expect(JSON.stringify(mine.body)).toContain('your own address');

    const unverified = await signup(app);
    expect((await invite(unverified.cookie ?? '', owner.weddingId, email)).status).toBe(403);
    expect(await invites.countDocuments({ weddingId: new Types.ObjectId(owner.weddingId) })).toBe(
      0,
    );
  });

  it('replaces a pending invitation, and resending replaces the link', async () => {
    const owner = await ownerWithWedding();
    const first = uniqueEmail('first');
    const second = uniqueEmail('second');
    const a = (await invite(owner.cookie, owner.weddingId, first)).body as { data: { id: string } };
    const b = (await invite(owner.cookie, owner.weddingId, second)).body as {
      data: { id: string };
    };
    expect((await invites.findById(a.data.id).lean())?.status).toBe('revoked');

    const oldToken = tokenFromEmail(await invitationEmail(second));
    const resent = await http()
      .post(`/api/v1/weddings/${owner.weddingId}/member-invites/${b.data.id}/resend`)
      .set('Cookie', owner.cookie);
    expect(resent.status).toBe(200);
    const newToken = tokenFromEmail(await invitationEmail(second, 2));
    expect(newToken).not.toBe(oldToken);

    expect(codeOf(await preview(oldToken))).toBe('INVITE_INVALID');
    expect((await preview(newToken)).status).toBe(200);

    // At most one resend a minute.
    const again = await http()
      .post(`/api/v1/weddings/${owner.weddingId}/member-invites/${b.data.id}/resend`)
      .set('Cookie', owner.cookie);
    expect(again.status).toBe(429);
  });

  it('the partner accepts and becomes an equal owner', async () => {
    const owner = await ownerWithWedding();
    const email = uniqueEmail('partner');
    await invite(owner.cookie, owner.weddingId, email);
    const token = tokenFromEmail(await invitationEmail(email));

    // Anyone holding the link sees what it is for, signed in or not.
    const seen = await preview(token);
    expect(seen.status).toBe(200);
    expect((seen.body as { data: unknown }).data).toMatchObject({
      brideName: owner.brideName,
      groomName: 'Arjun',
      invitedByName: 'Priya Sharma',
      email,
      role: 'owner',
      status: 'pending',
    });

    const partner = await signupVerified(app, { email, displayName: 'Arjun Mehta' });
    const fenceBefore = (await weddings.findById(owner.weddingId).lean())?.writeFenceVersion ?? -1;
    const res = await accept(partner.cookie, token);
    expect(res.status).toBe(200);
    expect((res.body as { data: unknown }).data).toMatchObject({
      id: owner.weddingId,
      role: 'owner',
    });

    const membership = await memberships
      .findOne({
        weddingId: new Types.ObjectId(owner.weddingId),
        userId: new Types.ObjectId(partner.userId),
      })
      .lean();
    expect(membership).toMatchObject({ role: 'owner', status: 'active', activeOwned: true });
    const stored = await invites.findOne({ tokenHashes: sha256(token) }).lean();
    expect(stored).toMatchObject({ status: 'accepted' });
    expect(stored?.acceptedBy?.toHexString()).toBe(partner.userId);
    expect((await weddings.findById(owner.weddingId).lean())?.writeFenceVersion).toBe(
      fenceBefore + 1,
    );

    const theirs = await http().get('/api/v1/weddings').set('Cookie', partner.cookie);
    expect((theirs.body as { data: { id: string; role: string }[] }).data).toEqual([
      expect.objectContaining({ id: owner.weddingId, role: 'owner' }),
    ]);

    // Opening the link again is harmless.
    expect((await accept(partner.cookie, token)).status).toBe(200);
    expect(((await preview(token)).body as { data: { status: string } }).data.status).toBe(
      'accepted',
    );
    // And the wedding is full.
    expect(codeOf(await invite(owner.cookie, owner.weddingId, uniqueEmail('third')))).toBe(
      'OWNER_LIMIT',
    );
  });

  it('only the invited, verified account can accept, while the link is valid', async () => {
    const owner = await ownerWithWedding();
    const email = uniqueEmail('partner');
    const created = (await invite(owner.cookie, owner.weddingId, email)).body as {
      data: { id: string };
    };
    const token = tokenFromEmail(await invitationEmail(email));

    expect((await accept(undefined, token)).status).toBe(401);
    const someoneElse = await signupVerified(app);
    expect(codeOf(await accept(someoneElse.cookie, token))).toBe('INVITE_EMAIL_MISMATCH');
    const unverified = await signup(app, { email });
    expect(codeOf(await accept(unverified.cookie, token))).toBe('EMAIL_NOT_VERIFIED');
    expect(codeOf(await accept(someoneElse.cookie, 'A'.repeat(43)))).toBe('INVITE_INVALID');

    await invites.updateOne(
      { _id: created.data.id },
      { $set: { expiresAt: new Date(Date.now() - 1000) } },
    );
    // Verified now, but the link has expired.
    const users = app.get<Model<User>>(getModelToken(User.name));
    const unverifiedId = (unverified.res.body as { data: { id: string } }).data.id;
    await users.updateOne({ _id: unverifiedId }, { $set: { verifiedAt: new Date() } });
    expect(codeOf(await accept(unverified.cookie, token))).toBe('INVITE_INVALID');
    expect(codeOf(await preview(token))).toBe('INVITE_INVALID');
    expect(
      await memberships.countDocuments({ weddingId: new Types.ObjectId(owner.weddingId) }),
    ).toBe(1);
  });

  it('refuses an invitee who owns another active wedding, and promotes a manager', async () => {
    const owner = await ownerWithWedding();
    const busy = await ownerWithWedding();
    const busyEmail = (
      (await http().get('/api/v1/auth/me').set('Cookie', busy.cookie)).body as {
        data: { email: string };
      }
    ).data.email;
    await invite(owner.cookie, owner.weddingId, busyEmail);
    const token = tokenFromEmail(await invitationEmail(busyEmail));
    const refused = await accept(busy.cookie, token);
    expect(refused.status).toBe(409);
    expect(codeOf(refused)).toBe('OWNER_ACTIVE_LIMIT');
    expect(await memberships.countDocuments({ userId: new Types.ObjectId(busy.userId) })).toBe(1);

    // Even when the check before the transaction is passed, the index decides.
    vi.spyOn(memberships, 'exists').mockResolvedValueOnce(null);
    expect(codeOf(await accept(busy.cookie, token))).toBe('OWNER_ACTIVE_LIMIT');
    expect((await invites.findOne({ tokenHashes: sha256(token) }).lean())?.status).toBe('pending');

    // A manager of the wedding becomes its second owner.
    const other = await ownerWithWedding();
    const managerEmail = uniqueEmail('manager');
    const manager = await signupVerified(app, { email: managerEmail });
    await memberships.create({
      weddingId: new Types.ObjectId(other.weddingId),
      userId: new Types.ObjectId(manager.userId),
      role: 'manager',
      status: 'active',
      activeOwned: false,
      joinedAt: new Date(),
    });
    await invite(other.cookie, other.weddingId, managerEmail);
    const managerToken = tokenFromEmail(await invitationEmail(managerEmail));
    expect((await accept(manager.cookie, managerToken)).status).toBe(200);
    const promoted = await memberships.find({ userId: new Types.ObjectId(manager.userId) }).lean();
    expect(promoted).toEqual([expect.objectContaining({ role: 'owner', activeOwned: true })]);
  });

  it('never gives a wedding a third owner, even if one joined meanwhile', async () => {
    const owner = await ownerWithWedding();
    const email = uniqueEmail('partner');
    await invite(owner.cookie, owner.weddingId, email);
    const token = tokenFromEmail(await invitationEmail(email));
    const partner = await signupVerified(app, { email });
    // Someone else became the second owner after this invitation was sent.
    await memberships.create({
      weddingId: new Types.ObjectId(owner.weddingId),
      userId: new Types.ObjectId(),
      role: 'owner',
      status: 'active',
      activeOwned: true,
      joinedAt: new Date(),
    });
    const res = await accept(partner.cookie, token);
    expect(codeOf(res)).toBe('OWNER_LIMIT');
    expect(
      await memberships.countDocuments({
        weddingId: new Types.ObjectId(owner.weddingId),
        role: 'owner',
      }),
    ).toBe(2);
  });

  it('accepting the same link several times at once adds one owner', async () => {
    const owner = await ownerWithWedding();
    const email = uniqueEmail('partner');
    await invite(owner.cookie, owner.weddingId, email);
    const token = tokenFromEmail(await invitationEmail(email));
    const partner = await signupVerified(app, { email });

    const results = await Promise.all(
      Array.from({ length: 4 }, () => accept(partner.cookie, token)),
    );
    for (const res of results) expect([200, 410]).toContain(res.status);
    expect(results.some((res) => res.status === 200)).toBe(true);
    expect(
      await memberships.countDocuments({
        weddingId: new Types.ObjectId(owner.weddingId),
        role: 'owner',
      }),
    ).toBe(2);
  });

  it('a failed email leaves the wedding and the invitation in place, ready to resend', async () => {
    const owner = await ownerWithWedding();
    const email = uniqueEmail('bounce');
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    worker.mail.failNext(new PermanentMailError('INVALID_RECIPIENT'));
    const created = (await invite(owner.cookie, owner.weddingId, email)).body as {
      data: { id: string };
    };

    const failed = await waitFor(async () => {
      const list = await http()
        .get(`/api/v1/weddings/${owner.weddingId}/member-invites`)
        .set('Cookie', owner.cookie);
      const first = (list.body as { data: { emailStatus: string; status: string }[] }).data[0];
      return first?.emailStatus === 'failed' ? first : undefined;
    });
    expect(failed.status).toBe('pending');
    expect(await weddings.exists({ _id: owner.weddingId, status: 'active' })).toBeTruthy();

    const resent = await http()
      .post(`/api/v1/weddings/${owner.weddingId}/member-invites/${created.data.id}/resend`)
      .set('Cookie', owner.cookie);
    expect(resent.status).toBe(200);
    expect(tokenFromEmail(await invitationEmail(email))).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('an archived wedding cannot invite', async () => {
    const owner = await ownerWithWedding();
    await weddings.updateOne({ _id: owner.weddingId }, { $set: { status: 'archived' } });
    expect(codeOf(await invite(owner.cookie, owner.weddingId, uniqueEmail('late')))).toBe(
      'WEDDING_ARCHIVED',
    );
  });

  it('an archive that lands mid-request stops the invitation and its email', async () => {
    const owner = await ownerWithWedding();
    const email = uniqueEmail('late');
    // Archive after the request's own status check, before its transaction.
    const original = memberships.countDocuments.bind(memberships);
    vi.spyOn(memberships, 'countDocuments').mockImplementationOnce(((
      ...args: Parameters<typeof original>
    ) => {
      return weddings
        .updateOne({ _id: owner.weddingId }, { $set: { status: 'archived' } })
        .then(() => original(...args));
    }) as typeof original);

    expect(codeOf(await invite(owner.cookie, owner.weddingId, email))).toBe('WEDDING_ARCHIVED');
    expect(await invites.countDocuments({ emailNormalized: email })).toBe(0);
    expect(await notifications.countDocuments({ recipientEmailNormalized: email })).toBe(0);
  });

  it('a link replaced or expired while accepting is refused', async () => {
    for (const change of [
      { $set: { tokenHashes: [] } }, // a resend, between lookup and write
      { $set: { expiresAt: new Date(Date.now() - 1000) } },
    ]) {
      const owner = await ownerWithWedding();
      const email = uniqueEmail('partner');
      const created = (await invite(owner.cookie, owner.weddingId, email)).body as {
        data: { id: string };
      };
      const token = tokenFromEmail(await invitationEmail(email));
      const partner = await signupVerified(app, { email });

      // `exists` runs after the link is looked up and before the transaction.
      const original = memberships.exists.bind(memberships);
      vi.spyOn(memberships, 'exists').mockImplementationOnce(((
        ...args: Parameters<typeof original>
      ) => {
        return invites.updateOne({ _id: created.data.id }, change).then(() => original(...args));
      }) as typeof original);

      expect(codeOf(await accept(partner.cookie, token))).toBe('INVITE_INVALID');
      expect(
        await memberships.countDocuments({ weddingId: new Types.ObjectId(owner.weddingId) }),
      ).toBe(1);
      vi.restoreAllMocks();
    }
  });

  it('a spent link answers only while its partner still belongs to the active wedding', async () => {
    const owner = await ownerWithWedding();
    const email = uniqueEmail('partner');
    await invite(owner.cookie, owner.weddingId, email);
    const token = tokenFromEmail(await invitationEmail(email));
    const partner = await signupVerified(app, { email });
    expect((await accept(partner.cookie, token)).status).toBe(200);

    const membership = {
      weddingId: new Types.ObjectId(owner.weddingId),
      userId: new Types.ObjectId(partner.userId),
    };
    await memberships.updateOne(membership, { $set: { status: 'removed', activeOwned: false } });
    expect(codeOf(await accept(partner.cookie, token))).toBe('INVITE_INVALID');

    await memberships.updateOne(membership, { $set: { status: 'active', activeOwned: true } });
    await weddings.updateOne({ _id: owner.weddingId }, { $set: { status: 'archived' } });
    expect(codeOf(await accept(partner.cookie, token))).toBe('INVITE_INVALID');
  });

  it('only emails actually queued count against the invitation limits', async () => {
    const owner = await ownerWithWedding();
    const email = uniqueEmail('partner');
    const created = (await invite(owner.cookie, owner.weddingId, email)).body as {
      data: { id: string };
    };
    const resend = (id: string) =>
      http()
        .post(`/api/v1/weddings/${owner.weddingId}/member-invites/${id}/resend`)
        .set('Cookie', owner.cookie);

    // Resending an invitation that does not exist sends nothing, so costs nothing.
    const missing = new Types.ObjectId().toHexString();
    for (let i = 0; i < 12; i += 1) expect((await resend(missing)).status).toBe(404);
    expect((await invite(owner.cookie, owner.weddingId, email)).status).toBe(201);
    const current = (
      await invites.findOne({ emailNormalized: email, status: 'pending' }).lean()
    )?._id.toHexString();
    expect(current).toBeDefined();
    expect(current).not.toBe(created.data.id);

    // A resend refused by the wedding's daily limit does not use up the
    // invitation's one-a-minute resend.
    const limiter = app.get(RateLimiter);
    const daily = WEDDING_RATE_LIMITS.inviteEmailsPerWedding;
    for (let i = 0; i < daily.limit; i += 1) await limiter.hit(daily, owner.weddingId);
    expect(codeOf(await resend(current ?? ''))).toBe('RATE_LIMITED');
    await limiter.reset(daily, owner.weddingId);
    expect((await resend(current ?? '')).status).toBe(200);
  });
});
