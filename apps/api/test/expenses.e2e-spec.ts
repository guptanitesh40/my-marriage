import { getModelToken } from '@nestjs/mongoose';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Types, type Model } from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { todayIn } from '../src/modules/events/event-time.js';
import { ExpenseEntry } from '../src/modules/expenses/schemas/expense-entry.schema.js';
import { Expense } from '../src/modules/expenses/schemas/expense.schema.js';
import { WeddingMembership } from '../src/modules/weddings/schemas/wedding-membership.schema.js';
import { Wedding } from '../src/modules/weddings/schemas/wedding.schema.js';
import { createTestApp } from './support/app.js';
import { resetRateLimits, signupVerified } from './support/auth.js';

interface ExpenseBody {
  id: string;
  title: string;
  category: string;
  events: { id: string; title: string; available: boolean }[];
  vendor?: { id: string; name: string; available: boolean };
  amountPaise: number;
  discountPaise: number;
  extraPaise: number;
  finalPaise: number;
  paidPaise: number;
  outstandingPaise: number;
  status: string;
  overdue: boolean;
  dueDate?: string;
  notes?: string;
}

interface EntryBody {
  id: string;
  type: string;
  amountPaise: number;
  date: string;
  method?: string;
  note?: string;
  recordedBy: { userId: string; displayName?: string };
  reversalOfId?: string;
  reversed: boolean;
}

interface DetailBody {
  expense: ExpenseBody;
  entries: EntryBody[];
}

const TODAY = todayIn('Asia/Kolkata');
const rupees = (amount: number) => amount * 100;

function errorOf(res: request.Response) {
  return (res.body as { error: { code: string; message: string; details?: { field: string }[] } })
    .error;
}

function fieldsOf(res: request.Response) {
  return errorOf(res).details?.map((d) => d.field) ?? [];
}

describe('Expenses (integration)', () => {
  let app: NestExpressApplication;
  let weddings: Model<Wedding>;
  let memberships: Model<WeddingMembership>;
  let expenses: Model<Expense>;
  let entries: Model<ExpenseEntry>;

  beforeAll(async () => {
    app = await createTestApp();
    weddings = app.get<Model<Wedding>>(getModelToken(Wedding.name));
    memberships = app.get<Model<WeddingMembership>>(getModelToken(WeddingMembership.name));
    expenses = app.get<Model<Expense>>(getModelToken(Expense.name));
    entries = app.get<Model<ExpenseEntry>>(getModelToken(ExpenseEntry.name));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => resetRateLimits(app));

  const server = () => app.getHttpServer();
  const base = (weddingId: string) => `/api/v1/weddings/${weddingId}/expenses`;

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

  async function post(cookie: string | undefined, path: string, body: unknown) {
    const req = request(server()).post(path);
    return (cookie ? req.set('Cookie', cookie) : req).send(body as object);
  }

  async function made(cookie: string, path: string, body: unknown) {
    const res = await post(cookie, path, body);
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    return (res.body as { data: { id: string } }).data.id;
  }

  async function created(cookie: string, weddingId: string, body: unknown) {
    const res = await post(cookie, base(weddingId), body);
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    return (res.body as { data: ExpenseBody }).data;
  }

  function patch(cookie: string | undefined, weddingId: string, id: string, body: unknown) {
    const req = request(server()).patch(`${base(weddingId)}/${id}`);
    return (cookie ? req.set('Cookie', cookie) : req).send(body as object);
  }

  function get(cookie: string | undefined, path: string) {
    const req = request(server()).get(path);
    return cookie ? req.set('Cookie', cookie) : req;
  }

  async function detail(cookie: string, weddingId: string, id: string) {
    const res = await get(cookie, `${base(weddingId)}/${id}`);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    return (res.body as { data: DetailBody }).data;
  }

  const pay = (cookie: string | undefined, weddingId: string, id: string, body: object) =>
    post(cookie, `${base(weddingId)}/${id}/payments`, { paidAt: TODAY, ...body });
  const adjust = (cookie: string | undefined, weddingId: string, id: string, body: object) =>
    post(cookie, `${base(weddingId)}/${id}/adjustments`, { date: TODAY, ...body });
  const reverse = (cookie: string | undefined, weddingId: string, id: string, body: object) =>
    post(cookie, `${base(weddingId)}/${id}/payments/reverse`, body);

  function ok(res: request.Response) {
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    return (res.body as { data: DetailBody }).data;
  }

  async function fenceOf(weddingId: string) {
    return (await weddings.findById(weddingId).lean())?.writeFenceVersion;
  }

  describe('adding an expense', () => {
    it('needs a name, a category and an agreed amount in whole paise', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const before = await fenceOf(weddingId);
      const expense = await created(cookie, weddingId, {
        title: ' Mehendi  artist booking ',
        category: 'Makeup & Mehendi',
        amountPaise: rupees(20000),
      });
      expect(expense).toMatchObject({
        title: 'Mehendi artist booking',
        amountPaise: 2000000,
        finalPaise: 2000000,
        paidPaise: 0,
        outstandingPaise: 2000000,
        status: 'unpaid',
        overdue: false,
      });
      expect(expense.events).toEqual([]);
      expect(await fenceOf(weddingId)).toBe((before ?? 0) + 1);

      const missing = await post(cookie, base(weddingId), {});
      expect(fieldsOf(missing).sort()).toEqual(['amountPaise', 'category', 'title']);
      for (const amountPaise of [0, -100, 100.5, '8000000', 100_000_000_001]) {
        const res = await post(cookie, base(weddingId), { title: 'A', category: 'B', amountPaise });
        expect(fieldsOf(res), String(amountPaise)).toEqual(['amountPaise']);
      }
      const bad = await post(cookie, base(weddingId), {
        title: 'A',
        category: 'B',
        amountPaise: 100,
        dueDate: '2027-02-30',
        receiptAssetIds: [],
      });
      expect(fieldsOf(bad).sort()).toEqual(['dueDate', 'receiptAssetIds']);
    });

    it('links an event and a vendor of the same wedding only', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const other = await ownerWithWedding('Meera Iyer');
      const haldi = await made(cookie, `/api/v1/weddings/${weddingId}/events`, { title: 'Haldi' });
      const bloom = await made(cookie, `/api/v1/weddings/${weddingId}/vendors`, {
        name: 'Royal Bloom',
        category: 'Decoration',
      });
      const theirEvent = await made(other.cookie, `/api/v1/weddings/${other.weddingId}/events`, {
        title: 'Their Haldi',
      });
      const theirVendor = await made(other.cookie, `/api/v1/weddings/${other.weddingId}/vendors`, {
        name: 'Their Decor',
        category: 'Decoration',
      });

      const expense = await created(cookie, weddingId, {
        title: 'Haldi decoration',
        category: 'Decoration',
        amountPaise: rupees(45000),
        eventIds: [haldi],
        vendorId: bloom,
        dueDate: '2027-01-20',
        notes: 'Marigold strings.',
      });
      expect(expense).toMatchObject({
        events: [{ id: haldi, title: 'Haldi', available: true }],
        vendor: { id: bloom, name: 'Royal Bloom', available: true },
        dueDate: '2027-01-20',
      });

      for (const body of [
        { eventIds: [haldi, theirEvent] },
        { vendorId: theirVendor },
        { eventIds: [new Types.ObjectId().toHexString()] },
        { eventIds: null },
      ]) {
        const res = await post(cookie, base(weddingId), {
          title: 'X',
          category: 'Y',
          amountPaise: 100,
          ...body,
        });
        expect(res.status).toBe(400);
        expect(fieldsOf(res)).toEqual(Object.keys(body));
      }
    });

    it('keeps a deleted event or vendor, marked no longer available', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const haldi = await made(cookie, `/api/v1/weddings/${weddingId}/events`, { title: 'Haldi' });
      const bloom = await made(cookie, `/api/v1/weddings/${weddingId}/vendors`, {
        name: 'Royal Bloom',
        category: 'Decoration',
      });
      const expense = await created(cookie, weddingId, {
        title: 'Haldi decoration',
        category: 'Decoration',
        amountPaise: rupees(45000),
        eventIds: [haldi],
        vendorId: bloom,
      });
      await request(server())
        .delete(`/api/v1/weddings/${weddingId}/events/${haldi}`)
        .set('Cookie', cookie)
        .expect(204);
      await request(server())
        .delete(`/api/v1/weddings/${weddingId}/vendors/${bloom}`)
        .set('Cookie', cookie)
        .expect(204);

      const { expense: now } = await detail(cookie, weddingId, expense.id);
      expect(now.events).toEqual([{ id: haldi, title: 'Haldi', available: false }]);
      expect(now.vendor).toEqual({ id: bloom, name: 'Royal Bloom', available: false });

      // Saving with the same links keeps them; a deleted one can't be chosen anew.
      const kept = await patch(cookie, weddingId, expense.id, {
        title: 'Haldi decor',
        eventIds: [haldi],
        vendorId: bloom,
      });
      expect(kept.status, JSON.stringify(kept.body)).toBe(200);
      const other = await created(cookie, weddingId, { title: 'X', category: 'Y', amountPaise: 1 });
      expect(fieldsOf(await patch(cookie, weddingId, other.id, { eventIds: [haldi] }))).toEqual([
        'eventIds',
      ]);
      const cleared = await patch(cookie, weddingId, expense.id, { eventIds: [], vendorId: null });
      expect((cleared.body as { data: ExpenseBody }).data.events).toEqual([]);
    });
  });

  describe('several events', () => {
    it('covers several ceremonies at once, in the wedding’s order, once each', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const events = `/api/v1/weddings/${weddingId}/events`;
      const wedding = await made(cookie, events, { title: 'Wedding', startDate: '2031-02-20' });
      const haldi = await made(cookie, events, { title: 'Haldi', startDate: '2031-02-18' });
      const sangeet = await made(cookie, events, { title: 'Sangeet', startDate: '2031-02-19' });
      const expense = await created(cookie, weddingId, {
        title: 'Photography for three days',
        category: 'Photography',
        amountPaise: rupees(150000),
        eventIds: [wedding, haldi, sangeet, haldi.toUpperCase()],
      });
      expect(expense.events.map((e) => e.title)).toEqual(['Haldi', 'Sangeet', 'Wedding']);
      expect((await expenses.findById(expense.id).lean())?.eventIds).toHaveLength(3);

      const narrowed = await patch(cookie, weddingId, expense.id, { eventIds: [wedding] });
      expect((narrowed.body as { data: ExpenseBody }).data.events.map((e) => e.title)).toEqual([
        'Wedding',
      ]);
      const untouched = await patch(cookie, weddingId, expense.id, { title: 'Photography' });
      expect((untouched.body as { data: ExpenseBody }).data.events).toHaveLength(1);
    });
  });

  describe('deleting an expense', () => {
    it('keeps it and its history, marked deleted, out of the list and the totals', async () => {
      const { cookie, weddingId, userId } = await ownerWithWedding();
      const keep = await created(cookie, weddingId, {
        title: 'Catering',
        category: 'Catering',
        amountPaise: rupees(100000),
      });
      const wrong = await created(cookie, weddingId, {
        title: 'Entered twice',
        category: 'Catering',
        amountPaise: rupees(50000),
      });
      ok(await pay(cookie, weddingId, wrong.id, { amountPaise: rupees(10000) }));
      const before = await fenceOf(weddingId);

      const res = await request(server())
        .delete(`${base(weddingId)}/${wrong.id}`)
        .set('Cookie', cookie);
      expect(res.status).toBe(204);
      expect(await fenceOf(weddingId)).toBe((before ?? 0) + 1);

      const list = await get(cookie, base(weddingId));
      const data = (
        list.body as {
          data: {
            expenses: ExpenseBody[];
            totals: { count: number; finalPaise: number; paidPaise: number };
          };
        }
      ).data;
      expect(data.expenses.map((e) => e.id)).toEqual([keep.id]);
      expect(data.totals).toMatchObject({ count: 1, finalPaise: rupees(100000), paidPaise: 0 });
      for (const gone of [
        await get(cookie, `${base(weddingId)}/${wrong.id}`),
        await patch(cookie, weddingId, wrong.id, { title: 'Back' }),
        await pay(cookie, weddingId, wrong.id, { amountPaise: 1 }),
        await request(server())
          .delete(`${base(weddingId)}/${wrong.id}`)
          .set('Cookie', cookie),
      ]) {
        expect(gone.status).toBe(404);
        expect(errorOf(gone).code).toBe('EXPENSE_NOT_FOUND');
      }
      const stored = await expenses.findById(wrong.id).lean();
      expect(stored?.deletedBy?.toHexString()).toBe(userId);
      expect(stored?.paidPaise).toBe(rupees(10000));
      expect(await entries.countDocuments({ expenseId: new Types.ObjectId(wrong.id) })).toBe(1);
    });

    it('is for owners of an active wedding only, and never another wedding’s', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const manager = await addManager(weddingId);
      const other = await ownerWithWedding('Meera Iyer');
      const expense = await created(cookie, weddingId, {
        title: 'Catering',
        category: 'Catering',
        amountPaise: rupees(1000),
      });
      const path = `${base(weddingId)}/${expense.id}`;
      const byManager = await request(server()).delete(path).set('Cookie', manager.cookie);
      expect(byManager.status).toBe(403);
      expect(errorOf(byManager).code).toBe('OWNER_REQUIRED');
      expect((await request(server()).delete(path)).status).toBe(401);
      const byOther = await request(server()).delete(path).set('Cookie', other.cookie);
      expect(errorOf(byOther).code).toBe('WEDDING_NOT_FOUND');
      const crossed = await request(server())
        .delete(`${base(other.weddingId)}/${expense.id}`)
        .set('Cookie', other.cookie);
      expect(errorOf(crossed).code).toBe('EXPENSE_NOT_FOUND');

      await weddings.updateOne({ _id: weddingId }, { $set: { status: 'archived' } });
      const archived = await request(server()).delete(path).set('Cookie', cookie);
      expect(errorOf(archived).code).toBe('WEDDING_ARCHIVED');
      expect((await expenses.findById(expense.id).lean())?.deletedAt).toBeUndefined();
    });
  });

  describe('payments', () => {
    it('adds up several payments and shows what is outstanding (PRD acceptance)', async () => {
      const { cookie, weddingId, userId } = await ownerWithWedding();
      const manager = await addManager(weddingId, 'Arjun Mehta');
      const expense = await created(cookie, weddingId, {
        title: 'Wedding photography package',
        category: 'Photography & Videography',
        amountPaise: rupees(80000),
      });
      ok(
        await pay(manager.cookie, weddingId, expense.id, {
          amountPaise: rupees(10000),
          paidAt: '2026-11-01',
          method: 'bank_transfer',
          note: 'Advance',
        }),
      );
      const after = ok(
        await pay(cookie, weddingId, expense.id, { amountPaise: rupees(20000), method: 'cash' }),
      );
      expect(after.expense).toMatchObject({
        paidPaise: rupees(30000),
        outstandingPaise: rupees(50000),
        status: 'partially_paid',
      });
      expect(after.entries.map((e) => [e.type, e.amountPaise, e.method])).toEqual([
        ['payment', rupees(20000), 'cash'],
        ['payment', rupees(10000), 'bank_transfer'],
      ]);
      expect(after.entries[0]?.recordedBy).toEqual({ userId, displayName: 'Ananya Sharma' });
      expect(after.entries[1]).toMatchObject({
        date: '2026-11-01',
        note: 'Advance',
        recordedBy: { displayName: 'Arjun Mehta' },
        reversed: false,
      });

      const ledger = await get(cookie, `${base(weddingId)}/${expense.id}/payments`);
      expect((ledger.body as { data: { entries: EntryBody[] } }).data.entries).toHaveLength(2);
    });

    it('refuses more than is owed, nothing, a future day and an unknown method', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const expense = await created(cookie, weddingId, {
        title: 'Catering',
        category: 'Catering',
        amountPaise: rupees(50000),
      });
      ok(await pay(cookie, weddingId, expense.id, { amountPaise: rupees(30000) }));

      const over = await pay(cookie, weddingId, expense.id, { amountPaise: rupees(20000) + 1 });
      expect(over.status).toBe(400);
      expect(errorOf(over).message).toBe('Amount can’t be more than the outstanding ₹20,000.');
      for (const [body, field] of [
        [{ amountPaise: 0 }, 'amountPaise'],
        [{ amountPaise: 100, paidAt: '2099-01-01' }, 'paidAt'],
        [{ amountPaise: 100, paidAt: 'yesterday' }, 'paidAt'],
        [{ amountPaise: 100, method: 'upi' }, 'method'],
      ] as const) {
        expect(fieldsOf(await pay(cookie, weddingId, expense.id, body))).toEqual([field]);
      }

      const full = ok(await pay(cookie, weddingId, expense.id, { amountPaise: rupees(20000) }));
      expect(full.expense).toMatchObject({ outstandingPaise: 0, status: 'paid' });
      const more = await pay(cookie, weddingId, expense.id, { amountPaise: 100 });
      expect(errorOf(more).message).toBe('Nothing is left to pay on this expense.');
      expect(await entries.countDocuments({ expenseId: new Types.ObjectId(expense.id) })).toBe(2);
    });

    it('lets only one of two payments at once take the last of what is owed', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const expense = await created(cookie, weddingId, {
        title: 'Tent',
        category: 'Decoration',
        amountPaise: rupees(50000),
      });
      const results = await Promise.all([
        pay(cookie, weddingId, expense.id, { amountPaise: rupees(30000) }),
        pay(cookie, weddingId, expense.id, { amountPaise: rupees(30000) }),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([201, 400]);
      const { expense: now, entries: history } = await detail(cookie, weddingId, expense.id);
      expect(now.paidPaise).toBe(rupees(30000));
      expect(history).toHaveLength(1);
    });
  });

  describe('discounts and extras agreed later', () => {
    it('lowers what is owed with a discount and raises it with an extra', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const expense = await created(cookie, weddingId, {
        title: 'Wedding photography package',
        category: 'Photography & Videography',
        amountPaise: rupees(80000),
      });
      ok(await pay(cookie, weddingId, expense.id, { amountPaise: rupees(30000) }));

      // Negotiated 10% off the agreed amount.
      const discounted = ok(
        await adjust(cookie, weddingId, expense.id, {
          kind: 'discount',
          amountPaise: rupees(8000),
          note: 'Agreed 10% off',
        }),
      );
      expect(discounted.expense).toMatchObject({
        amountPaise: rupees(80000),
        discountPaise: rupees(8000),
        finalPaise: rupees(72000),
        outstandingPaise: rupees(42000),
      });
      expect(discounted.entries[0]).toMatchObject({ type: 'discount', note: 'Agreed 10% off' });

      // Paid in full, then a bonus for great work.
      ok(await pay(cookie, weddingId, expense.id, { amountPaise: rupees(42000) }));
      const bonus = ok(
        await adjust(cookie, weddingId, expense.id, {
          kind: 'extra',
          amountPaise: rupees(5000),
          note: 'Bonus for the album',
        }),
      );
      expect(bonus.expense).toMatchObject({
        finalPaise: rupees(77000),
        paidPaise: rupees(72000),
        outstandingPaise: rupees(5000),
        status: 'partially_paid',
      });
      const paid = ok(await pay(cookie, weddingId, expense.id, { amountPaise: rupees(5000) }));
      expect(paid.expense).toMatchObject({ status: 'paid', paidPaise: rupees(77000) });
    });

    it('never lets a discount make what is owed less than what was paid', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const expense = await created(cookie, weddingId, {
        title: 'Catering',
        category: 'Catering',
        amountPaise: rupees(100000),
      });
      ok(await pay(cookie, weddingId, expense.id, { amountPaise: rupees(95000) }));
      const res = await adjust(cookie, weddingId, expense.id, {
        kind: 'discount',
        amountPaise: rupees(6000),
      });
      expect(res.status).toBe(400);
      expect(errorOf(res).message).toBe('A discount can’t be more than the ₹5,000 still to pay.');
      expect(
        fieldsOf(await adjust(cookie, weddingId, expense.id, { kind: 'refund', amountPaise: 100 })),
      ).toEqual(['kind']);
      expect(
        fieldsOf(
          await adjust(cookie, weddingId, expense.id, {
            kind: 'extra',
            amountPaise: 100,
            date: '2099-01-01',
          }),
        ),
      ).toEqual(['date']);
    });
  });

  describe('reversals', () => {
    it('undoes a payment with a reversal entry, once, keeping both', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const expense = await created(cookie, weddingId, {
        title: 'Photography',
        category: 'Photography',
        amountPaise: rupees(80000),
      });
      ok(await pay(cookie, weddingId, expense.id, { amountPaise: rupees(10000) }));
      const twice = ok(await pay(cookie, weddingId, expense.id, { amountPaise: rupees(10000) }));
      const mistake = twice.entries[0]?.id ?? '';

      const undone = ok(
        await reverse(cookie, weddingId, expense.id, { entryId: mistake, note: 'Entered twice' }),
      );
      expect(undone.expense).toMatchObject({
        paidPaise: rupees(10000),
        outstandingPaise: rupees(70000),
      });
      expect(undone.entries[0]).toMatchObject({
        type: 'reversal',
        amountPaise: rupees(10000),
        reversalOfId: mistake,
        note: 'Entered twice',
        date: TODAY,
      });
      expect(undone.entries.find((e) => e.id === mistake)?.reversed).toBe(true);

      const again = await reverse(cookie, weddingId, expense.id, { entryId: mistake });
      expect(again.status).toBe(409);
      expect(errorOf(again).code).toBe('ENTRY_ALREADY_REVERSED');
      const ofReversal = await reverse(cookie, weddingId, expense.id, {
        entryId: undone.entries[0]?.id,
      });
      expect(errorOf(ofReversal).code).toBe('ENTRY_NOT_REVERSIBLE');
      expect(await entries.countDocuments({ expenseId: new Types.ObjectId(expense.id) })).toBe(3);
    });

    it('undoes discounts and extras, but not an extra that was already paid', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const expense = await created(cookie, weddingId, {
        title: 'Music',
        category: 'Music & Entertainment',
        amountPaise: rupees(30000),
      });
      const discount = ok(
        await adjust(cookie, weddingId, expense.id, {
          kind: 'discount',
          amountPaise: rupees(3000),
        }),
      );
      const restored = ok(
        await reverse(cookie, weddingId, expense.id, { entryId: discount.entries[0]?.id }),
      );
      expect(restored.expense).toMatchObject({ discountPaise: 0, finalPaise: rupees(30000) });

      const extra = ok(
        await adjust(cookie, weddingId, expense.id, { kind: 'extra', amountPaise: rupees(2000) }),
      );
      const extraId = extra.entries[0]?.id ?? '';
      ok(await pay(cookie, weddingId, expense.id, { amountPaise: rupees(32000) }));
      const blocked = await reverse(cookie, weddingId, expense.id, { entryId: extraId });
      expect(blocked.status).toBe(409);
      expect(errorOf(blocked).code).toBe('REVERSAL_BELOW_PAID');
    });

    it('only reverses entries of the same expense', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const a = await created(cookie, weddingId, { title: 'A', category: 'X', amountPaise: 1000 });
      const b = await created(cookie, weddingId, { title: 'B', category: 'X', amountPaise: 1000 });
      const paid = ok(await pay(cookie, weddingId, a.id, { amountPaise: 500 }));
      for (const entryId of [paid.entries[0]?.id, new Types.ObjectId().toHexString()]) {
        const res = await reverse(cookie, weddingId, b.id, { entryId });
        expect(res.status).toBe(404);
        expect(errorOf(res).code).toBe('EXPENSE_ENTRY_NOT_FOUND');
      }
      expect(fieldsOf(await reverse(cookie, weddingId, b.id, { entryId: 'x' }))).toEqual([
        'entryId',
      ]);
    });
  });

  describe('editing an expense', () => {
    it('changes details but never the agreed amount below what has been paid', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const expense = await created(cookie, weddingId, {
        title: 'Photography',
        category: 'Photography',
        amountPaise: rupees(80000),
        dueDate: '2027-02-10',
        notes: 'Drones',
      });
      ok(await pay(cookie, weddingId, expense.id, { amountPaise: rupees(30000) }));
      ok(await adjust(cookie, weddingId, expense.id, { kind: 'extra', amountPaise: rupees(2000) }));

      const tooLow = await patch(cookie, weddingId, expense.id, { amountPaise: rupees(27999) });
      expect(tooLow.status).toBe(400);
      expect(errorOf(tooLow).message).toContain('can’t be less than ₹28,000');
      const lowest = await patch(cookie, weddingId, expense.id, {
        amountPaise: rupees(28000),
        dueDate: null,
        notes: null,
        title: 'Photography package',
      });
      expect(lowest.status, JSON.stringify(lowest.body)).toBe(200);
      const changed = (lowest.body as { data: ExpenseBody }).data;
      expect(changed).toMatchObject({
        title: 'Photography package',
        finalPaise: rupees(30000),
        outstandingPaise: 0,
        status: 'paid',
      });
      expect(changed).not.toHaveProperty('dueDate');
      expect(changed).not.toHaveProperty('notes');
      // The history is untouched.
      expect(await entries.countDocuments({ expenseId: new Types.ObjectId(expense.id) })).toBe(2);
    });

    it('answers not found for an unknown or malformed expense', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      for (const id of [new Types.ObjectId().toHexString(), 'nope']) {
        expect(errorOf(await get(cookie, `${base(weddingId)}/${id}`)).code).toBe(
          'EXPENSE_NOT_FOUND',
        );
        expect(errorOf(await patch(cookie, weddingId, id, { title: 'X' })).code).toBe(
          'EXPENSE_NOT_FOUND',
        );
        expect(errorOf(await pay(cookie, weddingId, id, { amountPaise: 1 })).code).toBe(
          'EXPENSE_NOT_FOUND',
        );
      }
    });
  });

  describe('the list and totals', () => {
    it('sorts by due day and adds everything up, with savings, extras and overdue', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const photo = await created(cookie, weddingId, {
        title: 'Wedding photography package',
        category: 'Photography',
        amountPaise: rupees(80000),
        dueDate: '2099-02-10',
      });
      const catering = await created(cookie, weddingId, {
        title: 'Wedding catering',
        category: 'Catering',
        amountPaise: rupees(150000),
        dueDate: '2026-01-05',
      });
      const haldi = await created(cookie, weddingId, {
        title: 'Haldi decoration',
        category: 'Decoration',
        amountPaise: rupees(45000),
        dueDate: '2025-12-01',
      });
      await created(cookie, weddingId, {
        title: 'Mehendi artist booking',
        category: 'Makeup & Mehendi',
        amountPaise: rupees(20000),
      });
      ok(await pay(cookie, weddingId, photo.id, { amountPaise: rupees(30000) }));
      ok(await pay(cookie, weddingId, catering.id, { amountPaise: rupees(50000) }));
      ok(
        await adjust(cookie, weddingId, haldi.id, { kind: 'discount', amountPaise: rupees(5000) }),
      );
      ok(await pay(cookie, weddingId, haldi.id, { amountPaise: rupees(40000) }));
      ok(await adjust(cookie, weddingId, haldi.id, { kind: 'extra', amountPaise: rupees(1000) }));
      ok(await pay(cookie, weddingId, haldi.id, { amountPaise: rupees(1000) }));

      const res = await get(cookie, base(weddingId));
      const list = (res.body as { data: { expenses: ExpenseBody[]; totals: object } }).data;
      expect(list.expenses.map((e) => [e.title, e.status, e.overdue])).toEqual([
        ['Haldi decoration', 'paid', false],
        ['Wedding catering', 'partially_paid', true],
        ['Wedding photography package', 'partially_paid', false],
        ['Mehendi artist booking', 'unpaid', false],
      ]);
      const totals = {
        finalPaise: rupees(80000 + 150000 + 41000 + 20000),
        paidPaise: rupees(30000 + 50000 + 41000),
        outstandingPaise: rupees(50000 + 100000 + 20000),
        discountPaise: rupees(5000),
        extraPaise: rupees(1000),
        overdue: 1,
        count: 4,
      };
      expect(list.totals).toEqual(totals);
      const summary = await get(cookie, `/api/v1/weddings/${weddingId}/expenses-summary`);
      expect((summary.body as { data: object }).data).toEqual(totals);
    });
  });

  describe('privacy and isolation', () => {
    it('refuses visitors, other weddings and another wedding’s expense by ID', async () => {
      const ours = await ownerWithWedding();
      const theirs = await ownerWithWedding('Meera Iyer');
      const expense = await created(theirs.cookie, theirs.weddingId, {
        title: 'Private catering',
        category: 'Catering',
        amountPaise: rupees(100000),
      });
      const paid = ok(
        await pay(theirs.cookie, theirs.weddingId, expense.id, { amountPaise: rupees(1000) }),
      );
      const entryId = paid.entries[0]?.id;

      for (const res of [
        await get(undefined, base(theirs.weddingId)),
        await pay(undefined, theirs.weddingId, expense.id, { amountPaise: 1 }),
      ]) {
        expect(res.status).toBe(401);
      }
      for (const res of [
        await get(ours.cookie, base(theirs.weddingId)),
        await get(ours.cookie, `/api/v1/weddings/${theirs.weddingId}/expenses-summary`),
        await get(ours.cookie, `${base(theirs.weddingId)}/${expense.id}`),
        await patch(ours.cookie, theirs.weddingId, expense.id, { title: 'Taken' }),
        await pay(ours.cookie, theirs.weddingId, expense.id, { amountPaise: 1 }),
        await adjust(ours.cookie, theirs.weddingId, expense.id, { kind: 'extra', amountPaise: 1 }),
        await reverse(ours.cookie, theirs.weddingId, expense.id, { entryId }),
      ]) {
        expect(res.status).toBe(404);
        expect(errorOf(res).code).toBe('WEDDING_NOT_FOUND');
      }
      for (const res of [
        await get(ours.cookie, `${base(ours.weddingId)}/${expense.id}`),
        await pay(ours.cookie, ours.weddingId, expense.id, { amountPaise: 1 }),
        await reverse(ours.cookie, ours.weddingId, expense.id, { entryId }),
      ]) {
        expect(res.status).toBe(404);
        expect(errorOf(res).code).toBe('EXPENSE_NOT_FOUND');
      }
      const stored = await expenses.findById(expense.id).lean();
      expect(stored).toMatchObject({ title: 'Private catering', paidPaise: rupees(1000) });
    });
  });

  describe('an archived wedding', () => {
    it('stays readable but refuses every change, writing nothing', async () => {
      const { cookie, weddingId } = await ownerWithWedding();
      const expense = await created(cookie, weddingId, {
        title: 'Catering',
        category: 'Catering',
        amountPaise: rupees(10000),
      });
      const paid = ok(await pay(cookie, weddingId, expense.id, { amountPaise: 500 }));
      await weddings.updateOne({ _id: weddingId }, { $set: { status: 'archived' } });
      const before = await fenceOf(weddingId);

      expect((await get(cookie, base(weddingId))).status).toBe(200);
      expect((await get(cookie, `${base(weddingId)}/${expense.id}`)).status).toBe(200);
      for (const res of [
        await post(cookie, base(weddingId), { title: 'X', category: 'Y', amountPaise: 1 }),
        await patch(cookie, weddingId, expense.id, { title: 'Renamed' }),
        await pay(cookie, weddingId, expense.id, { amountPaise: 1 }),
        await adjust(cookie, weddingId, expense.id, { kind: 'discount', amountPaise: 1 }),
        await reverse(cookie, weddingId, expense.id, { entryId: paid.entries[0]?.id }),
      ]) {
        expect(res.status).toBe(409);
        expect(errorOf(res).code).toBe('WEDDING_ARCHIVED');
      }
      expect(await expenses.countDocuments({ weddingId: new Types.ObjectId(weddingId) })).toBe(1);
      expect(await entries.countDocuments({ expenseId: new Types.ObjectId(expense.id) })).toBe(1);
      expect(await fenceOf(weddingId)).toBe(before);
    });
  });
});
