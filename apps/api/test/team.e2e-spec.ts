import { getModelToken } from '@nestjs/mongoose';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Types, type Model } from 'mongoose';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthEmailComposer } from '../src/modules/auth/auth-email.composer.js';
import { AuthModule } from '../src/modules/auth/auth.module.js';
import { WeddingTask } from '../src/modules/tasks/schemas/task.schema.js';
import { InviteEmailComposer } from '../src/modules/weddings/invite-email.composer.js';
import { MembershipInvite } from '../src/modules/weddings/schemas/membership-invite.schema.js';
import { WeddingMembership } from '../src/modules/weddings/schemas/wedding-membership.schema.js';
import { Wedding } from '../src/modules/weddings/schemas/wedding.schema.js';
import { WeddingsModule } from '../src/modules/weddings/weddings.module.js';
import { AuditEvent } from '../src/platform/audit/audit-event.schema.js';
import { createTestApp } from './support/app.js';
import { resetRateLimits, signupVerified, tokenFromEmail, uniqueEmail } from './support/auth.js';
import { createTestWorker, waitFor, type TestWorker } from './support/worker.js';

function tag(): string {
  return Array.from({ length: 8 }, () =>
    String.fromCharCode(97 + Math.floor(Math.random() * 26)),
  ).join('');
}

interface TeamBody {
  members: {
    userId: string;
    displayName: string;
    email: string;
    role: string;
    label?: string;
    openTaskCount: number;
    isYou: boolean;
  }[];
  invites: { id: string; email: string; role: string; status: string; invitedByName?: string }[];
  viewerRole: string;
}

/**
 * The team (decision 0020): owners and admins invite, change and remove
 * admins and managers; managers never manage the team; the bride and groom
 * are protected; every change is audited.
 */
describe('Team (integration)', () => {
  let app: NestExpressApplication;
  let worker: TestWorker;
  let weddings: Model<Wedding>;
  let memberships: Model<WeddingMembership>;
  let invites: Model<MembershipInvite>;
  let tasks: Model<WeddingTask>;
  let audit: Model<AuditEvent>;

  beforeAll(async () => {
    app = await createTestApp();
    worker = await createTestWorker({
      imports: [AuthModule, WeddingsModule],
      composers: [AuthEmailComposer, InviteEmailComposer],
    });
    weddings = app.get<Model<Wedding>>(getModelToken(Wedding.name));
    memberships = app.get<Model<WeddingMembership>>(getModelToken(WeddingMembership.name));
    invites = app.get<Model<MembershipInvite>>(getModelToken(MembershipInvite.name));
    tasks = app.get<Model<WeddingTask>>(getModelToken(WeddingTask.name));
    audit = app.get<Model<AuditEvent>>(getModelToken(AuditEvent.name));
  });

  afterAll(async () => {
    await worker.context.close();
    await app.close();
  });

  beforeEach(() => resetRateLimits(app));
  afterEach(() => vi.restoreAllMocks());

  const http = () => request(app.getHttpServer());
  const api = (path: string) => `/api/v1${path}`;

  function codeOf(res: request.Response): string {
    return (res.body as { error: { code: string } }).error.code;
  }

  function dataOf<T>(res: request.Response): T {
    return (res.body as { data: T }).data;
  }

  async function ownerWithWedding() {
    const email = uniqueEmail('owner');
    const owner = { ...(await signupVerified(app, { email })), email };
    const res = await http()
      .post(api('/weddings'))
      .set('Cookie', owner.cookie)
      .send({
        brideName: `Ananya ${tag()}`,
        groomName: 'Arjun',
        city: 'Jaipur',
        state: 'Rajasthan',
      });
    expect(res.status).toBe(201);
    return { ...owner, weddingId: dataOf<{ id: string }>(res).id };
  }

  function invite(cookie: string, weddingId: string, body: object) {
    return http()
      .post(api(`/weddings/${weddingId}/member-invites`))
      .set('Cookie', cookie)
      .send(body);
  }

  function team(cookie: string, weddingId: string) {
    return http()
      .get(api(`/weddings/${weddingId}/team`))
      .set('Cookie', cookie);
  }

  /** The newest invitation email to `address`, once there are `count`. */
  async function tokenFor(address: string, count = 1) {
    const found = await waitFor(
      () => {
        const all = worker.mail.sent.filter(
          (email) => email.to === address && email.subject.includes('invited you'),
        );
        return all.length >= count ? all : undefined;
      },
      { what: `${count} invitation email(s) to ${address}` },
    );
    const sent = found[found.length - 1];
    if (!sent) throw new Error('No invitation email');
    return { token: tokenFromEmail(sent), subject: sent.subject, text: sent.text };
  }

  /** Invites someone with `role` and has them accept; returns their session. */
  async function join(
    by: { cookie: string },
    weddingId: string,
    role: 'admin' | 'manager',
    label?: string,
  ) {
    const email = uniqueEmail(role);
    const sent = await invite(by.cookie, weddingId, { email, role, ...(label ? { label } : {}) });
    expect(sent.status, JSON.stringify(sent.body)).toBe(201);
    const { token } = await tokenFor(email);
    const member = await signupVerified(app, { email });
    const accepted = await http()
      .post(api('/member-invites/accept'))
      .set('Cookie', member.cookie)
      .send({ token });
    expect(accepted.status, JSON.stringify(accepted.body)).toBe(200);
    return { ...member, email };
  }

  it('lets the couple add an admin, such as a parent, with a label; owning another wedding is fine', async () => {
    const owner = await ownerWithWedding();
    const fatherEmail = uniqueEmail('father');
    const sent = await invite(owner.cookie, owner.weddingId, {
      email: fatherEmail,
      role: 'admin',
      label: '  Bride’s   father ',
    });
    expect(sent.status).toBe(201);
    expect(dataOf<{ role: string; label: string }>(sent)).toMatchObject({
      role: 'admin',
      label: 'Bride’s father',
      invitedByName: 'Priya Sharma',
    });
    const mail = await tokenFor(fatherEmail);
    expect(mail.subject).toMatch(/invited you to help plan .*’s wedding/);
    expect(mail.text).toContain('as an admin');

    // The father already plans his own wedding: that does not stop him.
    const father = await signupVerified(app, { email: fatherEmail });
    const own = await http()
      .post(api('/weddings'))
      .set('Cookie', father.cookie)
      .send({ brideName: `Meera ${tag()}`, groomName: 'Dev', city: 'Pune', state: 'Maharashtra' });
    expect(own.status).toBe(201);
    const accepted = await http()
      .post(api('/member-invites/accept'))
      .set('Cookie', father.cookie)
      .send({ token: mail.token });
    expect(accepted.status).toBe(200);
    expect(dataOf<{ role: string }>(accepted).role).toBe('admin');

    const view = dataOf<TeamBody>(await team(father.cookie, owner.weddingId));
    expect(view.viewerRole).toBe('admin');
    expect(view.members.map((member) => member.role)).toEqual(['owner', 'admin']);
    expect(view.members[1]).toMatchObject({
      email: fatherEmail,
      label: 'Bride’s father',
      isYou: true,
      openTaskCount: 0,
    });
    expect(view.invites[0]).toMatchObject({ email: fatherEmail, status: 'accepted' });

    const events = await audit
      .find({ weddingId: new Types.ObjectId(owner.weddingId) })
      .sort({ occurredAt: 1 })
      .lean();
    expect(events.map((event) => event.action)).toEqual(['member_invite.created', 'member.joined']);
    expect(events[1]?.actorUserId?.toHexString()).toBe(father.userId);
    expect(JSON.stringify(events)).not.toContain(mail.token);
  });

  it('keeps managers out of the team: no page, no invitations, no changes', async () => {
    const owner = await ownerWithWedding();
    const admin = await join(owner, owner.weddingId, 'admin');
    const manager = await join(admin, owner.weddingId, 'manager');
    const w = owner.weddingId;

    expect(codeOf(await team(manager.cookie, w))).toBe('ADMIN_REQUIRED');
    const asManager = await invite(manager.cookie, w, { email: uniqueEmail('x'), role: 'manager' });
    expect(codeOf(asManager)).toBe('ADMIN_REQUIRED');
    expect(
      codeOf(
        await http()
          .get(api(`/weddings/${w}/member-invites`))
          .set('Cookie', manager.cookie),
      ),
    ).toBe('ADMIN_REQUIRED');
    expect(
      codeOf(
        await http()
          .delete(api(`/weddings/${w}/members/${admin.userId}`))
          .set('Cookie', manager.cookie),
      ),
    ).toBe('ADMIN_REQUIRED');
    // They still see who is on the team, to assign tasks.
    const members = await http()
      .get(api(`/weddings/${w}/members`))
      .set('Cookie', manager.cookie);
    expect(dataOf<{ members: { role: string }[] }>(members).members.map((m) => m.role)).toEqual([
      'owner',
      'admin',
      'manager',
    ]);
    expect(JSON.stringify(members.body)).not.toContain('@');
  });

  it('protects the bride and groom, and nobody removes themselves', async () => {
    const owner = await ownerWithWedding();
    const admin = await join(owner, owner.weddingId, 'admin');
    const w = owner.weddingId;

    const partner = await invite(admin.cookie, w, { email: uniqueEmail('p'), role: 'owner' });
    expect(codeOf(partner)).toBe('OWNER_REQUIRED');
    const removeOwner = await http()
      .delete(api(`/weddings/${w}/members/${owner.userId}`))
      .set('Cookie', admin.cookie);
    expect(codeOf(removeOwner)).toBe('OWNER_PROTECTED');
    const demote = await http()
      .patch(api(`/weddings/${w}/members/${owner.userId}`))
      .set('Cookie', admin.cookie)
      .send({ role: 'manager' });
    expect(codeOf(demote)).toBe('OWNER_PROTECTED');
    for (const who of [owner, admin]) {
      const self = await http()
        .delete(api(`/weddings/${w}/members/${who.userId}`))
        .set('Cookie', who.cookie);
      expect(codeOf(self)).toBe('NOT_YOURSELF');
    }
    const ownRole = await http()
      .patch(api(`/weddings/${w}/members/${admin.userId}`))
      .set('Cookie', admin.cookie)
      .send({ role: 'manager' });
    expect(codeOf(ownRole)).toBe('NOT_YOURSELF');
    // A label is not a role: anyone's can be changed, the couple's too.
    const labelled = await http()
      .patch(api(`/weddings/${w}/members/${owner.userId}`))
      .set('Cookie', admin.cookie)
      .send({ label: 'Bride' });
    expect(dataOf<{ label: string; role: string }>(labelled)).toMatchObject({
      label: 'Bride',
      role: 'owner',
    });
  });

  it('says when someone is already on the team or already invited', async () => {
    const owner = await ownerWithWedding();
    const manager = await join(owner, owner.weddingId, 'manager');
    const again = await invite(owner.cookie, owner.weddingId, {
      email: manager.email.toUpperCase(),
      role: 'manager',
    });
    expect(codeOf(again)).toBe('ALREADY_MEMBER');

    const email = uniqueEmail('twice');
    expect((await invite(owner.cookie, owner.weddingId, { email, role: 'manager' })).status).toBe(
      201,
    );
    const twice = await invite(owner.cookie, owner.weddingId, { email, role: 'admin' });
    expect(codeOf(twice)).toBe('ALREADY_INVITED');
    // At the same time, only one gets through.
    const other = uniqueEmail('race');
    const results = await Promise.all(
      [0, 1, 2].map(() => invite(owner.cookie, owner.weddingId, { email: other, role: 'manager' })),
    );
    expect(results.map((res) => res.status).sort()).toEqual([201, 409, 409]);
  });

  it('revokes an invitation at once, and a declined one can be sent again', async () => {
    const owner = await ownerWithWedding();
    const w = owner.weddingId;
    const email = uniqueEmail('revoked');
    const created = dataOf<{ id: string }>(
      await invite(owner.cookie, w, { email, role: 'manager' }),
    );
    const { token } = await tokenFor(email);

    const revoke = () =>
      http()
        .post(api(`/weddings/${w}/member-invites/${created.id}/revoke`))
        .set('Cookie', owner.cookie);
    expect(dataOf<{ status: string }>(await revoke()).status).toBe('revoked');
    expect((await revoke()).status).toBe(200);
    const invitee = await signupVerified(app, { email });
    const late = await http()
      .post(api('/member-invites/accept'))
      .set('Cookie', invitee.cookie)
      .send({ token });
    expect(codeOf(late)).toBe('INVITE_INVALID');
    expect((await invites.findById(created.id).lean())?.tokenHashes).toEqual([]);

    // Inviting again, then declining: the person can be asked another time.
    const second = dataOf<{ id: string }>(
      await invite(owner.cookie, w, { email, role: 'manager' }),
    );
    const { token: secondToken } = await tokenFor(email, 2);
    const declined = await http()
      .post(api('/member-invites/decline'))
      .set('Cookie', invitee.cookie)
      .send({ token: secondToken });
    expect(declined.status).toBe(204);
    expect((await invites.findById(second.id).lean())?.status).toBe('declined');
    const afterDecline = await http()
      .post(api(`/weddings/${w}/member-invites/${second.id}/revoke`))
      .set('Cookie', owner.cookie);
    expect(codeOf(afterDecline)).toBe('INVITE_NOT_PENDING');
    expect((await invite(owner.cookie, w, { email, role: 'manager' })).status).toBe(201);

    const actions = (await audit.find({ weddingId: new Types.ObjectId(w) }).lean()).map(
      (event) => event.action,
    );
    expect(actions).toEqual(
      expect.arrayContaining(['member_invite.revoked', 'member_invite.declined']),
    );
  });

  it('removes a manager: access ends at once, their tasks become unassigned, history stays', async () => {
    const owner = await ownerWithWedding();
    const w = owner.weddingId;
    const admin = await join(owner, w, 'admin');
    const manager = await join(owner, w, 'manager', 'Groom’s cousin');

    const created = await http()
      .post(api(`/weddings/${w}/tasks`))
      .set('Cookie', manager.cookie)
      .send({ title: 'Book the band', assigneeId: manager.userId });
    expect(created.status).toBe(201);
    const taskId = dataOf<{ id: string }>(created).id;
    expect(
      dataOf<TeamBody>(await team(owner.cookie, w)).members.find((m) => m.userId === manager.userId)
        ?.openTaskCount,
    ).toBe(1);

    // An admin removes them.
    const removed = await http()
      .delete(api(`/weddings/${w}/members/${manager.userId}`))
      .set('Cookie', admin.cookie);
    expect(removed.status).toBe(204);
    expect(
      codeOf(
        await http()
          .get(api(`/weddings/${w}/tasks`))
          .set('Cookie', manager.cookie),
      ),
    ).toBe('WEDDING_NOT_FOUND');
    const task = await tasks.findById(taskId).lean();
    expect(task?.assigneeId).toBeUndefined();
    expect(task?.createdBy.toHexString()).toBe(manager.userId);
    const record = await memberships
      .findOne({ weddingId: new Types.ObjectId(w), userId: new Types.ObjectId(manager.userId) })
      .lean();
    expect(record).toMatchObject({ status: 'removed' });
    expect(record?.removedBy?.toHexString()).toBe(admin.userId);
    const event = await audit
      .findOne({ weddingId: new Types.ObjectId(w), action: 'member.removed' })
      .lean();
    expect(event?.safeDiff).toMatchObject({ role: 'manager', unassignedTasks: 1 });

    // Removing again finds nobody; invited again, they are back.
    expect(
      codeOf(
        await http()
          .delete(api(`/weddings/${w}/members/${manager.userId}`))
          .set('Cookie', admin.cookie),
      ),
    ).toBe('MEMBER_NOT_FOUND');
    await invite(owner.cookie, w, { email: manager.email, role: 'manager' });
    const { token } = await tokenFor(manager.email, 2);
    const back = await http()
      .post(api('/member-invites/accept'))
      .set('Cookie', manager.cookie)
      .send({ token });
    expect(back.status).toBe(200);
    expect(
      (
        await http()
          .get(api(`/weddings/${w}/tasks`))
          .set('Cookie', manager.cookie)
      ).status,
    ).toBe(200);
  });

  it('changes a manager to an admin and back', async () => {
    const owner = await ownerWithWedding();
    const w = owner.weddingId;
    const manager = await join(owner, w, 'manager');
    const change = (role: string) =>
      http()
        .patch(api(`/weddings/${w}/members/${manager.userId}`))
        .set('Cookie', owner.cookie)
        .send({ role, label: '' });
    expect(dataOf<{ role: string }>(await change('admin')).role).toBe('admin');
    expect((await team(manager.cookie, w)).status).toBe(200);
    expect(dataOf<{ role: string }>(await change('manager')).role).toBe('manager');
    expect(codeOf(await team(manager.cookie, w))).toBe('ADMIN_REQUIRED');
    expect((await change('owner')).status).toBe(400);
  });

  const oid = (id: string) => new Types.ObjectId(id);

  /** The roles on the team, by user ID, as an owner or admin sees them. */
  async function rolesOf(cookie: string, weddingId: string) {
    const view = dataOf<TeamBody>(await team(cookie, weddingId));
    return Object.fromEntries(view.members.map((member) => [member.userId, member.role]));
  }

  function accept(cookie: string, token: string) {
    return http().post(api('/member-invites/accept')).set('Cookie', cookie).send({ token });
  }

  it('hands an owner’s place to someone already on the team: they become owner, the sender admin', async () => {
    const owner = await ownerWithWedding();
    const w = owner.weddingId;
    const admin = await join(owner, w, 'admin');
    const manager = await join(owner, w, 'manager');

    // Only an owner hands over, and only with the owner role.
    const byAdmin = await invite(admin.cookie, w, {
      email: manager.email,
      role: 'owner',
      handOver: true,
    });
    expect(codeOf(byAdmin)).toBe('OWNER_REQUIRED');
    const byManager = await invite(manager.cookie, w, {
      email: admin.email,
      role: 'owner',
      handOver: true,
    });
    expect(codeOf(byManager)).toBe('ADMIN_REQUIRED');
    const notOwner = await invite(owner.cookie, w, {
      email: uniqueEmail('x'),
      role: 'admin',
      handOver: true,
    });
    expect(notOwner.status).toBe(400);
    expect(
      codeOf(await invite(owner.cookie, w, { email: owner.email, role: 'owner', handOver: true })),
    ).toBe('VALIDATION_ERROR');

    const sent = await invite(owner.cookie, w, {
      email: admin.email,
      role: 'owner',
      handOver: true,
    });
    expect(sent.status, JSON.stringify(sent.body)).toBe(201);
    expect(dataOf<{ role: string; handOver: boolean }>(sent)).toMatchObject({
      role: 'owner',
      handOver: true,
    });
    const mail = await tokenFor(admin.email, 2);
    expect(mail.subject).toMatch(/invited you to own .*’s wedding/);
    expect(mail.text).toContain('stays on the team as an admin');

    // Nothing changes until they accept.
    expect(await rolesOf(owner.cookie, w)).toMatchObject({
      [owner.userId]: 'owner',
      [admin.userId]: 'admin',
    });
    const preview = await http().post(api('/member-invites/preview')).send({ token: mail.token });
    expect(dataOf<{ role: string; handOver: boolean }>(preview)).toMatchObject({
      role: 'owner',
      handOver: true,
    });
    const mine = await http().get(api('/member-invites/mine')).set('Cookie', admin.cookie);
    expect(dataOf<{ handOver: boolean }[]>(mine)).toEqual([
      expect.objectContaining({ role: 'owner', handOver: true }),
    ]);

    const accepted = await accept(admin.cookie, mail.token);
    expect(accepted.status, JSON.stringify(accepted.body)).toBe(200);
    expect(dataOf<{ role: string }>(accepted).role).toBe('owner');
    expect(await rolesOf(admin.cookie, w)).toEqual({
      [admin.userId]: 'owner',
      [owner.userId]: 'admin',
      [manager.userId]: 'manager',
    });
    const before = await memberships
      .findOne({ weddingId: oid(w), userId: oid(owner.userId) })
      .lean();
    expect(before).toMatchObject({ role: 'admin', status: 'active', activeOwned: false });

    // The one who handed over is now an admin: owner actions are refused.
    const archive = await http()
      .post(api(`/weddings/${w}/archive`))
      .set('Cookie', owner.cookie);
    expect(codeOf(archive)).toBe('OWNER_REQUIRED');
    // And the new owner is protected as owners are.
    const remove = await http()
      .delete(api(`/weddings/${w}/members/${admin.userId}`))
      .set('Cookie', owner.cookie);
    expect(codeOf(remove)).toBe('OWNER_PROTECTED');

    const events = await audit
      .find({ weddingId: new Types.ObjectId(w), action: /ownership|joined/ })
      .sort({ occurredAt: -1 })
      .limit(2)
      .lean();
    expect(events.map((event) => event.action).sort()).toEqual([
      'member.joined',
      'member.ownership_handed_over',
    ]);
    const handed = events.find((event) => event.action === 'member.ownership_handed_over');
    expect(handed?.actorUserId?.toHexString()).toBe(admin.userId);
    expect(handed?.safeDiff).toMatchObject({ from: owner.userId, to: admin.userId });
    expect(JSON.stringify(events)).not.toContain(mail.token);
  });

  it('hands over with two owners already, to someone new; the partner stays an owner', async () => {
    const owner = await ownerWithWedding();
    const w = owner.weddingId;
    const partnerEmail = uniqueEmail('partner');
    expect((await invite(owner.cookie, w, { email: partnerEmail, role: 'owner' })).status).toBe(
      201,
    );
    const partner = await signupVerified(app, { email: partnerEmail });
    expect((await accept(partner.cookie, (await tokenFor(partnerEmail)).token)).status).toBe(200);
    // Two owners: no seat for a partner, but an owner's own place can go.
    expect(
      codeOf(await invite(owner.cookie, w, { email: uniqueEmail('third'), role: 'owner' })),
    ).toBe('OWNER_LIMIT');
    expect(
      codeOf(await invite(owner.cookie, w, { email: partnerEmail, role: 'owner', handOver: true })),
    ).toBe('ALREADY_OWNER');

    const firstEmail = uniqueEmail('first');
    expect(
      (await invite(owner.cookie, w, { email: firstEmail, role: 'owner', handOver: true })).status,
    ).toBe(201);
    const first = await tokenFor(firstEmail);
    // A newer hand-over replaces the sender's own; the partner's would not.
    const nextEmail = uniqueEmail('next');
    const next = await invite(owner.cookie, w, {
      email: nextEmail,
      role: 'owner',
      handOver: true,
      label: 'Groom',
    });
    expect(next.status).toBe(201);
    const firstPerson = await signupVerified(app, { email: firstEmail });
    expect(codeOf(await accept(firstPerson.cookie, first.token))).toBe('INVITE_INVALID');

    const newcomer = await signupVerified(app, { email: nextEmail });
    const accepted = await accept(newcomer.cookie, (await tokenFor(nextEmail)).token);
    expect(accepted.status, JSON.stringify(accepted.body)).toBe(200);
    const view = dataOf<TeamBody>(await team(partner.cookie, w));
    expect(
      view.members
        .filter((member) => member.role === 'owner')
        .map((m) => m.userId)
        .sort(),
    ).toEqual([partner.userId, newcomer.userId].sort());
    expect(view.members.find((member) => member.userId === newcomer.userId)?.label).toBe('Groom');
    expect(view.members.find((member) => member.userId === owner.userId)?.role).toBe('admin');
    expect(
      await memberships.countDocuments({ weddingId: oid(w), role: 'owner', status: 'active' }),
    ).toBe(2);
  });

  it('refuses a hand-over whose sender is no longer an owner, and lets owners withdraw one', async () => {
    const owner = await ownerWithWedding();
    const w = owner.weddingId;
    const admin = await join(owner, w, 'admin');
    const email = uniqueEmail('stale');
    const sent = dataOf<{ id: string }>(
      await invite(owner.cookie, w, { email, role: 'owner', handOver: true }),
    );
    const { token } = await tokenFor(email);

    // Admins may not resend or withdraw it.
    for (const action of ['resend', 'revoke']) {
      const res = await http()
        .post(api(`/weddings/${w}/member-invites/${sent.id}/${action}`))
        .set('Cookie', admin.cookie);
      expect(codeOf(res)).toBe('OWNER_REQUIRED');
    }
    const resent = await http()
      .post(api(`/weddings/${w}/member-invites/${sent.id}/resend`))
      .set('Cookie', owner.cookie);
    expect(resent.status).toBe(200);
    const { token: fresh } = await tokenFor(email, 2);
    expect(fresh).not.toBe(token);

    // Should the sender have stopped being an owner meanwhile, nothing changes.
    await memberships.updateOne(
      { weddingId: oid(w), userId: oid(owner.userId) },
      { $set: { role: 'admin' } },
    );
    const person = await signupVerified(app, { email });
    const stale = await accept(person.cookie, fresh);
    expect(codeOf(stale)).toBe('HAND_OVER_INVALID');
    expect((stale.body as { error: { message: string } }).error.message).toContain(
      'no longer an owner',
    );
    expect(
      await memberships.findOne({ weddingId: oid(w), userId: oid(person.userId) }).lean(),
    ).toBeNull();
    expect((await invites.findById(sent.id).lean())?.status).toBe('pending');

    await memberships.updateOne(
      { weddingId: oid(w), userId: oid(owner.userId) },
      { $set: { role: 'owner' } },
    );
    const revoked = await http()
      .post(api(`/weddings/${w}/member-invites/${sent.id}/revoke`))
      .set('Cookie', owner.cookie);
    expect(dataOf<{ status: string }>(revoked).status).toBe('revoked');
    expect(codeOf(await accept(person.cookie, fresh))).toBe('INVITE_INVALID');
    expect(await rolesOf(owner.cookie, w)).toMatchObject({ [owner.userId]: 'owner' });
  });

  it('lets admins delete planning records, as owners can', async () => {
    const owner = await ownerWithWedding();
    const admin = await join(owner, owner.weddingId, 'admin');
    const event = await http()
      .post(api(`/weddings/${owner.weddingId}/events`))
      .set('Cookie', owner.cookie)
      .send({ title: 'Sangeet' });
    expect(event.status).toBe(201);
    const deleted = await http()
      .delete(api(`/weddings/${owner.weddingId}/events/${dataOf<{ id: string }>(event).id}`))
      .set('Cookie', admin.cookie);
    expect(deleted.status).toBe(204);
  });

  it('never reaches another wedding’s team, and an archived team is read-only', async () => {
    const owner = await ownerWithWedding();
    const other = await ownerWithWedding();
    const stranger = await join(other, other.weddingId, 'manager');
    const elsewhere = dataOf<{ id: string }>(
      await invite(other.cookie, other.weddingId, { email: uniqueEmail('o'), role: 'manager' }),
    );
    const w = owner.weddingId;

    expect(
      codeOf(
        await http()
          .delete(api(`/weddings/${w}/members/${stranger.userId}`))
          .set('Cookie', owner.cookie),
      ),
    ).toBe('MEMBER_NOT_FOUND');
    expect(
      codeOf(
        await http()
          .post(api(`/weddings/${w}/member-invites/${elsewhere.id}/revoke`))
          .set('Cookie', owner.cookie),
      ),
    ).toBe('INVITE_NOT_FOUND');
    expect(codeOf(await team(owner.cookie, other.weddingId))).toBe('WEDDING_NOT_FOUND');

    const manager = await join(owner, w, 'manager');
    await weddings.updateOne({ _id: w }, { $set: { status: 'archived' } });
    expect((await team(owner.cookie, w)).status).toBe(200);
    expect(
      codeOf(await invite(owner.cookie, w, { email: uniqueEmail('late'), role: 'manager' })),
    ).toBe('WEDDING_ARCHIVED');
    expect(
      codeOf(
        await http()
          .delete(api(`/weddings/${w}/members/${manager.userId}`))
          .set('Cookie', owner.cookie),
      ),
    ).toBe('WEDDING_ARCHIVED');
  });
});
