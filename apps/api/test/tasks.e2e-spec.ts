import { getModelToken } from '@nestjs/mongoose';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Types, type Model } from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { todayIn } from '../src/modules/events/event-time.js';
import { WeddingTask } from '../src/modules/tasks/schemas/task.schema.js';
import { WeddingMembership } from '../src/modules/weddings/schemas/wedding-membership.schema.js';
import { Wedding } from '../src/modules/weddings/schemas/wedding.schema.js';
import { createTestApp } from './support/app.js';
import { resetRateLimits, signup, signupVerified } from './support/auth.js';

interface TaskBody {
  id: string;
  title: string;
  description?: string;
  event?: { id: string; title: string };
  assignee?: { userId: string; displayName: string; role: string };
  dueDate?: string;
  dueTime?: string;
  dueAt?: string;
  overdue: boolean;
  priority: string;
  state: string;
  completedAt?: string;
  completedBy?: { userId: string; displayName?: string };
}

interface ListBody {
  tasks: TaskBody[];
  truncated: boolean;
  counts: { all: number; mine: number; overdue: number; inProgress: number; completed: number };
}

function errorOf(res: request.Response) {
  return (res.body as { error: { code: string; details?: { field: string }[] } }).error;
}

function fieldsOf(res: request.Response) {
  return errorOf(res).details?.map((d) => d.field) ?? [];
}

describe('Tasks (integration)', () => {
  let app: NestExpressApplication;
  let weddings: Model<Wedding>;
  let memberships: Model<WeddingMembership>;
  let tasks: Model<WeddingTask>;

  beforeAll(async () => {
    app = await createTestApp();
    weddings = app.get<Model<Wedding>>(getModelToken(Wedding.name));
    memberships = app.get<Model<WeddingMembership>>(getModelToken(WeddingMembership.name));
    tasks = app.get<Model<WeddingTask>>(getModelToken(WeddingTask.name));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => resetRateLimits(app));

  const server = () => app.getHttpServer();

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

  async function eventIn(cookie: string, weddingId: string, title: string) {
    const res = await request(server())
      .post(`/api/v1/weddings/${weddingId}/events`)
      .set('Cookie', cookie)
      .send({ title });
    expect(res.status).toBe(201);
    return (res.body as { data: { id: string } }).data.id;
  }

  function create(cookie: string | undefined, weddingId: string, body: unknown) {
    const req = request(server()).post(`/api/v1/weddings/${weddingId}/tasks`);
    return (cookie ? req.set('Cookie', cookie) : req).send(body as object);
  }

  async function created(cookie: string, weddingId: string, body: unknown) {
    const res = await create(cookie, weddingId, body);
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    return (res.body as { data: TaskBody }).data;
  }

  function patch(cookie: string | undefined, weddingId: string, taskId: string, body: unknown) {
    const req = request(server()).patch(`/api/v1/weddings/${weddingId}/tasks/${taskId}`);
    return (cookie ? req.set('Cookie', cookie) : req).send(body as object);
  }

  function list(cookie: string | undefined, weddingId: string, query: Record<string, string> = {}) {
    const req = request(server()).get(`/api/v1/weddings/${weddingId}/tasks`).query(query);
    return cookie ? req.set('Cookie', cookie) : req;
  }

  async function listed(cookie: string, weddingId: string, query: Record<string, string> = {}) {
    const res = await list(cookie, weddingId, query);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    return (res.body as { data: ListBody }).data;
  }

  async function titles(cookie: string, weddingId: string, query: Record<string, string> = {}) {
    return (await listed(cookie, weddingId, query)).tasks.map((t) => t.title);
  }

  async function fenceOf(weddingId: string) {
    return (await weddings.findById(weddingId).lean())?.writeFenceVersion;
  }

  describe('the wedding’s team', () => {
    it('lists active owners first, then managers by name, for members only', async () => {
      const { cookie, weddingId, userId } = await ownerWithWedding('Ananya Sharma');
      const ritu = await addManager(weddingId, 'Ritu Sharma');
      await addManager(weddingId, 'Kabir Rao');
      const removed = await addManager(weddingId, 'Zoya Khan');
      await memberships.updateOne(
        { weddingId: new Types.ObjectId(weddingId), userId: new Types.ObjectId(removed.userId) },
        { $set: { status: 'removed' } },
      );

      const res = await request(server())
        .get(`/api/v1/weddings/${weddingId}/members`)
        .set('Cookie', ritu.cookie);
      expect(res.status).toBe(200);
      const members = (res.body as { data: { members: unknown[] } }).data.members;
      expect(members).toEqual([
        { userId, displayName: 'Ananya Sharma', role: 'owner' },
        { userId: expect.any(String) as unknown, displayName: 'Kabir Rao', role: 'manager' },
        { userId: ritu.userId, displayName: 'Ritu Sharma', role: 'manager' },
      ]);

      const stranger = await signupVerified(app);
      const outside = await request(server())
        .get(`/api/v1/weddings/${weddingId}/members`)
        .set('Cookie', stranger.cookie);
      expect(outside.status).toBe(404);
      expect(cookie).toBeTruthy();
    });
  });

  describe('creating a task', () => {
    it('needs only a title: general, unassigned, no due date, Medium and To Do', async () => {
      const { cookie, weddingId, userId } = await ownerWithWedding();
      const before = await fenceOf(weddingId);

      const task = await created(cookie, weddingId, { title: '  Book   Haldi decorator ' });
      expect(task).toEqual({
        id: expect.stringMatching(/^[0-9a-f]{24}$/) as unknown,
        title: 'Book Haldi decorator',
        overdue: false,
        priority: 'normal',
        state: 'todo',
        createdAt: expect.any(String) as unknown,
        updatedAt: expect.any(String) as unknown,
      });
      expect(await fenceOf(weddingId)).toBe((before ?? 0) + 1);
      const stored = await tasks.findById(task.id).lean();
      expect(stored?.createdBy.toHexString()).toBe(userId);
      expect(stored?.weddingId.toHexString()).toBe(weddingId);
    });

    it('links an event and a team member, and reads the due day and time in India', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const manager = await addManager(weddingId, 'Rajesh Mehta');
      const haldi = await eventIn(cookie, weddingId, 'Haldi');

      const task = await created(cookie, weddingId, {
        title: 'Book Haldi decorator',
        description: 'Marigold strings,\r\nfloral seating.',
        eventId: haldi,
        assigneeId: manager.userId,
        dueDate: '2099-12-08',
        dueTime: '14:00',
        priority: 'high',
        state: 'in_progress',
      });
      expect(task).toMatchObject({
        description: 'Marigold strings,\nfloral seating.',
        event: { id: haldi, title: 'Haldi' },
        assignee: { userId: manager.userId, displayName: 'Rajesh Mehta', role: 'manager' },
        dueDate: '2099-12-08',
        dueTime: '14:00',
        dueAt: '2099-12-08T08:30:00.000Z',
        priority: 'high',
        state: 'in_progress',
      });

      // Managers add and see tasks too.
      await created(manager.cookie, weddingId, { title: 'Confirm tent' });
      expect(await titles(manager.cookie, weddingId)).toEqual([
        'Book Haldi decorator',
        'Confirm tent',
      ]);
    });

    it('records who completed a task created as completed', async () => {
      const { cookie, weddingId, userId } = await ownerWithWedding('Ananya Sharma');
      const task = await created(cookie, weddingId, { title: 'Venue booked', state: 'completed' });
      expect(task.completedAt).toEqual(expect.any(String));
      expect(task.completedBy).toEqual({ userId, displayName: 'Ananya Sharma' });
    });

    it('refuses events and people from outside the wedding', async () => {
      const a = await ownerWithWedding();
      const b = await ownerWithWedding();
      const ofB = await eventIn(b.cookie, b.weddingId, 'Sangeet of B');
      const deleted = await eventIn(a.cookie, a.weddingId, 'Mehendi');
      await request(server())
        .delete(`/api/v1/weddings/${a.weddingId}/events/${deleted}`)
        .set('Cookie', a.cookie)
        .expect(204);
      const removed = await addManager(a.weddingId, 'Former Manager');
      await memberships.updateOne(
        { weddingId: new Types.ObjectId(a.weddingId), userId: new Types.ObjectId(removed.userId) },
        { $set: { status: 'removed' } },
      );
      const stranger = await signupVerified(app);
      const before = await fenceOf(a.weddingId);

      for (const [body, field] of [
        [{ eventId: ofB }, 'eventId'],
        [{ eventId: deleted }, 'eventId'],
        [{ eventId: new Types.ObjectId().toHexString() }, 'eventId'],
        [{ assigneeId: b.userId }, 'assigneeId'],
        [{ assigneeId: removed.userId }, 'assigneeId'],
        [{ assigneeId: stranger.userId }, 'assigneeId'],
        [{ eventId: 'haldi' }, 'eventId'],
        [{ assigneeId: 'me' }, 'assigneeId'],
      ] as const) {
        const res = await create(a.cookie, a.weddingId, { title: 'Intruder', ...body });
        expect(res.status, JSON.stringify(body)).toBe(400);
        expect(fieldsOf(res)).toEqual([field]);
      }
      expect(await tasks.countDocuments({ title: 'Intruder' })).toBe(0);
      expect(await fenceOf(a.weddingId)).toBe(before);
    });

    it('validates every field', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      for (const [body, field] of [
        [{}, 'title'],
        [{ title: '   ' }, 'title'],
        [{ title: 'x'.repeat(121) }, 'title'],
        [{ title: 'A', description: 'x'.repeat(2001) }, 'description'],
        [{ title: 'A', priority: 'urgent' }, 'priority'],
        [{ title: 'A', priority: 'medium' }, 'priority'],
        [{ title: 'A', state: 'done' }, 'state'],
        [{ title: 'A', state: null }, 'state'],
        [{ title: 'A', dueDate: '2027-02-30' }, 'dueDate'],
        [{ title: 'A', dueDate: '12/08/2027' }, 'dueDate'],
        [{ title: 'A', dueDate: '2027-12-08', dueTime: '25:00' }, 'dueTime'],
        [{ title: 'A', dueTime: '10:00' }, 'dueTime'],
        [{ title: 'A', dueAt: '2027-12-08T10:00:00Z' }, 'dueAt'],
        [{ title: 'A', weddingId }, 'weddingId'],
        [{ title: 'A', createdBy: new Types.ObjectId().toHexString() }, 'createdBy'],
      ] as const) {
        const res = await create(cookie, weddingId, body);
        expect(res.status, JSON.stringify(body)).toBe(400);
        expect(errorOf(res).code).toBe('VALIDATION_ERROR');
        expect(fieldsOf(res)).toContain(field);
      }
      expect(await tasks.countDocuments({ weddingId: new Types.ObjectId(weddingId) })).toBe(0);
    });

    it('allows a due day that has passed, which is then overdue', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const task = await created(cookie, weddingId, { title: 'Late', dueDate: '2020-01-10' });
      expect(task.overdue).toBe(true);
    });
  });

  describe('changing a task', () => {
    it('changes only the fields given and clears those set to null', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const manager = await addManager(weddingId, 'Rajesh Mehta');
      const haldi = await eventIn(cookie, weddingId, 'Haldi');
      const task = await created(cookie, weddingId, {
        title: 'Book decorator',
        description: 'Marigolds',
        eventId: haldi,
        assigneeId: manager.userId,
        dueDate: '2099-12-08',
        dueTime: '14:00',
      });
      const before = await fenceOf(weddingId);

      const renamed = await patch(manager.cookie, weddingId, task.id, {
        title: 'Book Haldi decorator',
        priority: 'high',
      });
      expect(renamed.status).toBe(200);
      expect((renamed.body as { data: TaskBody }).data).toMatchObject({
        title: 'Book Haldi decorator',
        priority: 'high',
        description: 'Marigolds',
        event: { id: haldi },
        assignee: { userId: manager.userId },
        dueTime: '14:00',
      });
      expect(await fenceOf(weddingId)).toBe((before ?? 0) + 1);

      const cleared = (
        await patch(cookie, weddingId, task.id, {
          description: null,
          eventId: null,
          assigneeId: null,
          dueDate: null,
        })
      ).body as { data: TaskBody };
      expect(cleared.data.description).toBeUndefined();
      expect(cleared.data.event).toBeUndefined();
      expect(cleared.data.assignee).toBeUndefined();
      expect(cleared.data.dueDate).toBeUndefined();
      expect(cleared.data.dueTime).toBeUndefined();
      const stored = await tasks.findById(task.id).lean();
      expect(stored?.dueAt).toBeUndefined();
      expect(stored?.assigneeId).toBeUndefined();

      const timeAlone = await patch(cookie, weddingId, task.id, { dueTime: '09:00' });
      expect(timeAlone.status).toBe(400);
      expect(fieldsOf(timeAlone)).toEqual(['dueTime']);
    });

    it('keeps To Do, In Progress, Completed and Cancelled distinct, with completion details', async () => {
      const { cookie, weddingId, userId } = await ownerWithWedding('Ananya Sharma');
      const manager = await addManager(weddingId, 'Rajesh Mehta');
      const task = await created(cookie, weddingId, { title: 'Book band', dueDate: '2020-01-10' });
      expect(task.overdue).toBe(true);

      const started = (await patch(cookie, weddingId, task.id, { state: 'in_progress' })).body as {
        data: TaskBody;
      };
      expect(started.data).toMatchObject({ state: 'in_progress', overdue: true });
      expect(started.data.completedAt).toBeUndefined();

      const done = (await patch(manager.cookie, weddingId, task.id, { state: 'completed' }))
        .body as { data: TaskBody };
      expect(done.data).toMatchObject({
        state: 'completed',
        overdue: false,
        completedBy: { userId: manager.userId, displayName: 'Rajesh Mehta' },
      });
      const completedAt = done.data.completedAt;
      expect(completedAt).toEqual(expect.any(String));

      // Saving other changes keeps who completed it and when.
      const renamed = (await patch(cookie, weddingId, task.id, { title: 'Book dhol band' }))
        .body as { data: TaskBody };
      expect(renamed.data.completedAt).toBe(completedAt);
      expect(renamed.data.completedBy?.userId).toBe(manager.userId);

      // Reopening clears it; cancelling is not completing.
      const reopened = (await patch(cookie, weddingId, task.id, { state: 'todo' })).body as {
        data: TaskBody;
      };
      expect(reopened.data.completedAt).toBeUndefined();
      expect(reopened.data.completedBy).toBeUndefined();
      const cancelled = (await patch(cookie, weddingId, task.id, { state: 'cancelled' })).body as {
        data: TaskBody;
      };
      expect(cancelled.data).toMatchObject({ state: 'cancelled', overdue: false });
      expect(cancelled.data.completedAt).toBeUndefined();
      expect(userId).toBeTruthy();
    });

    it('reassigns only to the wedding’s active team, and drops a removed assignee', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const manager = await addManager(weddingId, 'Rajesh Mehta');
      const other = await ownerWithWedding('Other Owner');
      const task = await created(cookie, weddingId, {
        title: 'Hampers',
        assigneeId: manager.userId,
      });

      const foreign = await patch(cookie, weddingId, task.id, { assigneeId: other.userId });
      expect(fieldsOf(foreign)).toEqual(['assigneeId']);
      const otherEvent = await eventIn(other.cookie, other.weddingId, 'Their Haldi');
      const foreignEvent = await patch(cookie, weddingId, task.id, { eventId: otherEvent });
      expect(fieldsOf(foreignEvent)).toEqual(['eventId']);

      // Removed from the team: no longer shown as the assignee, nor assignable.
      await memberships.updateOne(
        { weddingId: new Types.ObjectId(weddingId), userId: new Types.ObjectId(manager.userId) },
        { $set: { status: 'removed' } },
      );
      const shown = await listed(cookie, weddingId);
      expect(shown.tasks[0]?.assignee).toBeUndefined();
      const again = await patch(cookie, weddingId, task.id, { assigneeId: manager.userId });
      expect(fieldsOf(again)).toEqual(['assigneeId']);
    });

    it('finds only the wedding’s own tasks', async () => {
      const a = await ownerWithWedding();
      const b = await ownerWithWedding();
      const ofB = await created(b.cookie, b.weddingId, { title: 'Task of B' });
      for (const taskId of [ofB.id, 'not-an-id', new Types.ObjectId().toHexString()]) {
        const res = await patch(a.cookie, a.weddingId, taskId, { title: 'Intruder' });
        expect(res.status).toBe(404);
        expect(errorOf(res).code).toBe('TASK_NOT_FOUND');
      }
      const notMember = await patch(a.cookie, b.weddingId, ofB.id, { title: 'Intruder' });
      expect(errorOf(notMember).code).toBe('WEDDING_NOT_FOUND');
      expect((await tasks.findById(ofB.id).lean())?.title).toBe('Task of B');
    });
  });

  describe('listing tasks', () => {
    /** A wedding with tasks covering each view and filter. */
    async function plannedWedding() {
      const owner = await ownerWithWedding('Ananya Sharma');
      const { cookie, weddingId } = owner;
      const manager = await addManager(weddingId, 'Arjun Mehta');
      const haldi = await eventIn(cookie, weddingId, 'Haldi');
      const sangeet = await eventIn(cookie, weddingId, 'Sangeet');
      const today = todayIn('Asia/Kolkata');
      await created(cookie, weddingId, {
        title: 'Book Haldi decorator',
        eventId: haldi,
        assigneeId: owner.userId,
        dueDate: '2020-12-08',
        priority: 'high',
      });
      await created(cookie, weddingId, {
        title: 'Finalize Sangeet playlist',
        description: 'Twelve family dance tracks',
        eventId: sangeet,
        assigneeId: manager.userId,
        dueDate: '2099-12-10',
        dueTime: '19:00',
        state: 'in_progress',
      });
      await created(cookie, weddingId, {
        title: 'Arrange airport transport',
        priority: 'normal',
      });
      await created(cookie, weddingId, {
        title: 'Review Mehendi artists',
        assigneeId: manager.userId,
        dueDate: today,
        priority: 'low',
      });
      await created(cookie, weddingId, {
        title: 'Confirm venue contract',
        eventId: haldi,
        assigneeId: owner.userId,
        dueDate: '2020-12-04',
        state: 'completed',
      });
      await created(cookie, weddingId, {
        title: 'Old photographer quote',
        dueDate: '2020-11-01',
        state: 'cancelled',
      });
      return { owner, manager, haldi, sangeet };
    }

    it('sorts by due day and time, tasks without a due day last, and counts each view', async () => {
      const { owner } = await plannedWedding();
      const all = await listed(owner.cookie, owner.weddingId);
      expect(all.tasks.map((t) => t.title)).toEqual([
        'Old photographer quote',
        'Confirm venue contract',
        'Book Haldi decorator',
        'Review Mehendi artists',
        'Finalize Sangeet playlist',
        'Arrange airport transport',
      ]);
      expect(all.counts).toEqual({ all: 6, mine: 2, overdue: 1, inProgress: 1, completed: 1 });
      expect(all.truncated).toBe(false);
      // Due today, with no time: not overdue yet.
      expect(all.tasks.find((t) => t.title === 'Review Mehendi artists')?.overdue).toBe(false);

      expect(await titles(owner.cookie, owner.weddingId, { sort: 'due_desc' })).toEqual([
        'Finalize Sangeet playlist',
        'Review Mehendi artists',
        'Book Haldi decorator',
        'Confirm venue contract',
        'Old photographer quote',
        'Arrange airport transport',
      ]);
      expect(await titles(owner.cookie, owner.weddingId, { sort: 'priority' })).toEqual([
        'Book Haldi decorator',
        'Old photographer quote',
        'Confirm venue contract',
        'Finalize Sangeet playlist',
        'Arrange airport transport',
        'Review Mehendi artists',
      ]);
      const recent = await titles(owner.cookie, owner.weddingId, { sort: 'updated' });
      expect(recent[0]).toBe('Old photographer quote');
    });

    it('shows My Tasks, Overdue and Completed views, each person their own', async () => {
      const { owner, manager } = await plannedWedding();
      expect(await titles(owner.cookie, owner.weddingId, { view: 'mine' })).toEqual([
        'Confirm venue contract',
        'Book Haldi decorator',
      ]);
      expect(await titles(manager.cookie, owner.weddingId, { view: 'mine' })).toEqual([
        'Review Mehendi artists',
        'Finalize Sangeet playlist',
      ]);
      expect(await titles(owner.cookie, owner.weddingId, { view: 'overdue' })).toEqual([
        'Book Haldi decorator',
      ]);
      expect(await titles(owner.cookie, owner.weddingId, { view: 'completed' })).toEqual([
        'Confirm venue contract',
      ]);
      // Views and filters combine; nothing matching is an empty list, not an error.
      expect(
        await titles(owner.cookie, owner.weddingId, { view: 'overdue', priority: 'low' }),
      ).toEqual([]);
    });

    it('filters by event, General, assignee, Unassigned, status, priority and search', async () => {
      const { owner, manager, haldi } = await plannedWedding();
      const by = (query: Record<string, string>) => titles(owner.cookie, owner.weddingId, query);
      expect(await by({ eventId: haldi })).toEqual([
        'Confirm venue contract',
        'Book Haldi decorator',
      ]);
      expect(await by({ eventId: 'none' })).toEqual([
        'Old photographer quote',
        'Review Mehendi artists',
        'Arrange airport transport',
      ]);
      expect(await by({ assigneeId: manager.userId })).toEqual([
        'Review Mehendi artists',
        'Finalize Sangeet playlist',
      ]);
      expect(await by({ assigneeId: 'none' })).toEqual([
        'Old photographer quote',
        'Arrange airport transport',
      ]);
      expect(await by({ state: 'cancelled' })).toEqual(['Old photographer quote']);
      expect(await by({ priority: 'high' })).toEqual(['Book Haldi decorator']);
      expect(await by({ q: 'haldi' })).toEqual(['Book Haldi decorator']);
      expect(await by({ q: 'DANCE tracks' })).toEqual(['Finalize Sangeet playlist']);
      expect(await by({ q: 'arjun' })).toEqual([
        'Review Mehendi artists',
        'Finalize Sangeet playlist',
      ]);
      // Searched as typed, not as a pattern.
      expect(await by({ q: '.*' })).toEqual([]);
      expect(await by({ q: 'nothing like this' })).toEqual([]);
    });

    it('refuses filters it does not know', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      for (const [query, field] of [
        [{ view: 'urgent' }, 'view'],
        [{ sort: 'title' }, 'sort'],
        [{ state: 'done' }, 'state'],
        [{ eventId: 'haldi' }, 'eventId'],
        [{ assigneeId: 'me' }, 'assigneeId'],
        [{ q: 'x'.repeat(101) }, 'q'],
        [{ weddingId }, 'weddingId'],
      ] as const) {
        const res = await list(cookie, weddingId, query);
        expect(res.status, JSON.stringify(query)).toBe(400);
        expect(fieldsOf(res)).toContain(field);
      }
    });

    it('says when there are more tasks than it returns', async () => {
      const { cookie, weddingId, userId } = await ownerWithWedding();
      await tasks.insertMany(
        Array.from({ length: 201 }, (_, i) => ({
          weddingId: new Types.ObjectId(weddingId),
          title: `Task ${i}`,
          priority: 'normal',
          state: 'todo',
          createdBy: new Types.ObjectId(userId),
        })),
      );
      const all = await listed(cookie, weddingId);
      expect(all.tasks).toHaveLength(200);
      expect(all.truncated).toBe(true);
      expect(all.counts.all).toBe(201);
    });

    it('shows a wedding’s tasks to its members only, and nothing of other weddings', async () => {
      const a = await ownerWithWedding();
      const b = await ownerWithWedding();
      await created(a.cookie, a.weddingId, { title: 'Task of A' });
      await created(b.cookie, b.weddingId, { title: 'Task of B' });
      expect(await titles(a.cookie, a.weddingId)).toEqual(['Task of A']);
      expect(await titles(b.cookie, b.weddingId)).toEqual(['Task of B']);

      for (const [cookie, weddingId] of [
        [b.cookie, a.weddingId],
        [a.cookie, 'not-an-id'],
        [a.cookie, new Types.ObjectId().toHexString()],
      ] as const) {
        for (const res of [
          await list(cookie, weddingId),
          await create(cookie, weddingId, { title: 'Intruder' }),
        ]) {
          expect(res.status).toBe(404);
          expect(errorOf(res).code).toBe('WEDDING_NOT_FOUND');
        }
      }
      expect(await tasks.countDocuments({ title: 'Intruder' })).toBe(0);
    });

    it('needs a signed-in user with a verified email', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const task = await created(cookie, weddingId, { title: 'Hampers' });
      expect((await list(undefined, weddingId)).status).toBe(401);
      expect((await create(undefined, weddingId, { title: 'X' })).status).toBe(401);
      expect((await patch(undefined, weddingId, task.id, { title: 'X' })).status).toBe(401);
      const unverified = await signup(app);
      expect((await list(unverified.cookie, weddingId)).status).toBe(403);
    });
  });

  describe('task counts by ceremony', () => {
    it('counts each event’s tasks, completed and overdue, without cancelled or deleted ones', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const haldi = await eventIn(cookie, weddingId, 'Haldi');
      const sangeet = await eventIn(cookie, weddingId, 'Sangeet');
      const gone = await eventIn(cookie, weddingId, 'Mehendi');
      await created(cookie, weddingId, { title: 'A', eventId: haldi, state: 'completed' });
      await created(cookie, weddingId, { title: 'B', eventId: haldi, dueDate: '2020-01-01' });
      await created(cookie, weddingId, { title: 'C', eventId: haldi, state: 'cancelled' });
      await created(cookie, weddingId, { title: 'D', eventId: haldi, dueDate: '2099-01-01' });
      await created(cookie, weddingId, { title: 'E', eventId: sangeet, state: 'in_progress' });
      await created(cookie, weddingId, { title: 'F', eventId: gone });
      await created(cookie, weddingId, { title: 'General' });
      await request(server())
        .delete(`/api/v1/weddings/${weddingId}/events/${gone}`)
        .set('Cookie', cookie)
        .expect(204);
      const other = await ownerWithWedding();
      await created(other.cookie, other.weddingId, { title: 'Theirs' });

      const res = await request(server())
        .get(`/api/v1/weddings/${weddingId}/tasks/summary`)
        .set('Cookie', cookie);
      expect(res.status).toBe(200);
      const events = (res.body as { data: { events: { eventId: string }[] } }).data.events;
      expect([...events].sort((a, b) => a.eventId.localeCompare(b.eventId))).toEqual(
        [
          { eventId: haldi, total: 3, completed: 1, overdue: 1 },
          { eventId: sangeet, total: 1, completed: 0, overdue: 0 },
        ].sort((a, b) => a.eventId.localeCompare(b.eventId)),
      );

      const outside = await request(server())
        .get(`/api/v1/weddings/${weddingId}/tasks/summary`)
        .set('Cookie', other.cookie);
      expect(outside.status).toBe(404);
    });
  });

  describe('an archived wedding', () => {
    it('stays readable but refuses every change, writing nothing', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const task = await created(cookie, weddingId, { title: 'Hampers' });
      await weddings.updateOne({ _id: weddingId }, { $set: { status: 'archived' } });
      const before = await fenceOf(weddingId);

      expect(await titles(cookie, weddingId)).toEqual(['Hampers']);
      for (const res of [
        await create(cookie, weddingId, { title: 'More' }),
        await patch(cookie, weddingId, task.id, { state: 'completed' }),
      ]) {
        expect(res.status).toBe(409);
        expect(errorOf(res).code).toBe('WEDDING_ARCHIVED');
      }
      expect((await tasks.findById(task.id).lean())?.state).toBe('todo');
      expect(await tasks.countDocuments({ weddingId: new Types.ObjectId(weddingId) })).toBe(1);
      expect(await fenceOf(weddingId)).toBe(before);
    });
  });
});
