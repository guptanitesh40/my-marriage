import { getModelToken } from '@nestjs/mongoose';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Types, type Model } from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { FileAsset } from '../src/platform/storage/file-asset.schema.js';
import { WeddingMembership } from '../src/modules/weddings/schemas/wedding-membership.schema.js';
import { todayInIndia } from '../src/modules/weddings/wedding-policy.js';
import { createTestApp } from './support/app.js';
import { resetRateLimits, signupVerified } from './support/auth.js';

const dataOf = <T>(res: request.Response): T => (res.body as { data: T }).data;
const codeOf = (res: request.Response): string | undefined =>
  (res.body as { error?: { code: string } }).error?.code;

interface FileBody {
  id: string;
  fileName: string;
  contentType: string;
  bytes: number;
  url: string;
  viewable: boolean;
}

interface Detail {
  expense: { id: string; receiptCount: number; paidPaise: number };
  receipts: FileBody[];
  entries: { id: string; type: string; receipts: FileBody[] }[];
}

// Each check reads only a file's first bytes; the rest stands in for content.
const FILES = {
  pdf: { type: 'application/pdf', name: 'Advance receipt.pdf', body: pad('%PDF-1.7\n') },
  png: {
    type: 'image/png',
    name: 'bill.png',
    body: pad(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  docx: {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    name: 'Contract.docx',
    body: pad(Buffer.from([0x50, 0x4b, 0x03, 0x04])),
  },
  xls: {
    type: 'application/vnd.ms-excel',
    name: 'Quote.xls',
    body: pad(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])),
  },
} as const;

function pad(start: string | Buffer): Buffer {
  return Buffer.concat([Buffer.from(start), Buffer.alloc(300, 7)]);
}

/**
 * Receipts and documents on expenses and their payments (PRD EXP-01,
 * decision 0023): checked uploads, attached once, private to the wedding.
 */
describe('Expense receipts (integration)', () => {
  let app: NestExpressApplication;
  let assets: Model<FileAsset>;
  let memberships: Model<WeddingMembership>;

  beforeAll(async () => {
    app = await createTestApp();
    assets = app.get<Model<FileAsset>>(getModelToken(FileAsset.name));
    memberships = app.get<Model<WeddingMembership>>(getModelToken(WeddingMembership.name));
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

  async function ownerWithExpense() {
    const owner = await signupVerified(app, { displayName: 'Ananya Sharma' });
    const api = as(owner.cookie);
    const tag = Math.random().toString(36).slice(2, 10).replace(/\d/g, 'x');
    const wedding = dataOf<{ id: string }>(
      await api
        .post('/weddings', {
          brideName: `Ananya ${tag}`,
          groomName: 'Arjun',
          city: 'Jaipur',
          state: 'Rajasthan',
        })
        .expect(201),
    );
    const base = `/weddings/${wedding.id}`;
    return { ...owner, api, weddingId: wedding.id, base };
  }

  /** Uploads one file the way the browser does, and completes it. */
  async function upload(
    w: Awaited<ReturnType<typeof ownerWithExpense>>,
    file: { type: string; name: string; body: Buffer },
  ): Promise<FileBody> {
    const form = dataOf<{ uploadId: string; url: string; fields: Record<string, string> }>(
      await w.api
        .post(`${w.base}/expense-files`, {
          contentType: file.type,
          bytes: file.body.length,
          fileName: file.name,
        })
        .expect(201),
    );
    // Without S3_BUCKET the browser posts to the API's local stand-in.
    let req = request(server()).post(form.url);
    for (const [key, value] of Object.entries(form.fields)) req = req.field(key, value);
    const sent = await req.attach('file', file.body, {
      filename: file.name,
      contentType: file.type,
    });
    expect(sent.status, JSON.stringify(sent.body)).toBe(204);
    const done = await w.api.post(`${w.base}/expense-files/${form.uploadId}/complete`);
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    return dataOf<FileBody>(done);
  }

  const detailOf = async (w: Awaited<ReturnType<typeof ownerWithExpense>>, expenseId: string) =>
    dataOf<Detail>(await w.api.get(`${w.base}/expenses/${expenseId}`).expect(200));

  it('keeps PDFs, photos, Word and Excel files with an expense, and serves them only to its members', async () => {
    const w = await ownerWithExpense();
    const pdf = await upload(w, FILES.pdf);
    const png = await upload(w, FILES.png);
    expect(pdf).toMatchObject({
      fileName: 'Advance receipt.pdf',
      contentType: 'application/pdf',
      bytes: FILES.pdf.body.length,
      viewable: false,
    });
    expect(png.viewable).toBe(true);

    const expense = dataOf<{ id: string; receiptCount: number }>(
      await w.api
        .post(`${w.base}/expenses`, {
          title: 'Caterer',
          category: 'Catering',
          amountPaise: 25_000_000,
          receiptAssetIds: [pdf.id, png.id],
        })
        .expect(201),
    );
    expect(expense.receiptCount).toBe(2);
    const detail = await detailOf(w, expense.id);
    expect(detail.receipts.map((file) => file.id)).toEqual([pdf.id, png.id]);

    // A PDF downloads under its own name; a photo opens in the browser.
    const got = await request(server()).get(pdf.url).set('Cookie', w.cookie).buffer(true);
    expect(got.status).toBe(200);
    expect(got.headers['content-type']).toBe('application/pdf');
    expect(got.headers['content-disposition']).toContain('attachment;');
    expect(got.headers['content-disposition']).toContain('Advance receipt.pdf');
    expect(got.headers['x-content-type-options']).toBe('nosniff');
    expect(got.headers['content-security-policy']).toContain('sandbox');
    const shown = await request(server()).get(png.url).set('Cookie', w.cookie);
    expect(shown.headers['content-disposition']).toMatch(/^inline;/);

    // Nobody else: another wedding's owner, or no one signed in.
    const other = await ownerWithExpense();
    expect((await request(server()).get(pdf.url).set('Cookie', other.cookie)).status).toBe(404);
    expect((await request(server()).get(pdf.url)).status).toBe(401);
    // Nor can another wedding attach it to its own expense.
    const stolen = await other.api.post(`${other.base}/expenses`, {
      title: 'Mine',
      category: 'Venue',
      amountPaise: 100,
      receiptAssetIds: [pdf.id],
    });
    expect(stolen.status).toBe(400);
  });

  it('adds and removes an expense’s files when it is edited, deleting what was removed', async () => {
    const w = await ownerWithExpense();
    const first = await upload(w, FILES.pdf);
    const expense = dataOf<{ id: string }>(
      await w.api
        .post(`${w.base}/expenses`, {
          title: 'Decor',
          category: 'Decor',
          amountPaise: 5_000_000,
          receiptAssetIds: [first.id],
        })
        .expect(201),
    );
    const second = await upload(w, FILES.docx);
    const edited = dataOf<{ receiptCount: number }>(
      await w.api
        .patch(`${w.base}/expenses/${expense.id}`, { receiptAssetIds: [second.id] })
        .expect(200),
    );
    expect(edited.receiptCount).toBe(1);
    expect((await detailOf(w, expense.id)).receipts.map((file) => file.fileName)).toEqual([
      'Contract.docx',
    ]);
    expect((await assets.findById(first.id).lean())?.state).toBe('deleted');
    expect((await request(server()).get(first.url).set('Cookie', w.cookie)).status).toBe(404);

    // Other edits leave the files alone.
    await w.api.patch(`${w.base}/expenses/${expense.id}`, { title: 'Flowers' }).expect(200);
    expect((await detailOf(w, expense.id)).receipts).toHaveLength(1);
  });

  it('keeps files with payments, discounts and reversals, each on its own entry', async () => {
    const w = await ownerWithExpense();
    const expense = dataOf<{ id: string }>(
      await w.api
        .post(`${w.base}/expenses`, { title: 'Band', category: 'Music', amountPaise: 1_000_000 })
        .expect(201),
    );
    const slip = await upload(w, FILES.png);
    const paid = dataOf<Detail>(
      await w.api
        .post(`${w.base}/expenses/${expense.id}/payments`, {
          amountPaise: 400_000,
          paidAt: todayInIndia(),
          receiptAssetIds: [slip.id],
        })
        .expect(201),
    );
    const payment = paid.entries[0];
    expect(payment?.receipts.map((file) => file.id)).toEqual([slip.id]);

    const quote = await upload(w, FILES.xls);
    await w.api
      .post(`${w.base}/expenses/${expense.id}/adjustments`, {
        kind: 'discount',
        amountPaise: 100_000,
        date: todayInIndia(),
        receiptAssetIds: [quote.id],
      })
      .expect(201);

    const refund = await upload(w, FILES.pdf);
    const reversed = dataOf<Detail>(
      await w.api
        .post(`${w.base}/expenses/${expense.id}/payments/reverse`, {
          entryId: payment?.id,
          note: 'Paid twice',
          receiptAssetIds: [refund.id],
        })
        .expect(201),
    );
    expect(reversed.expense.paidPaise).toBe(0);
    const byType = new Map(reversed.entries.map((entry) => [entry.type, entry.receipts]));
    expect(byType.get('reversal')?.map((file) => file.id)).toEqual([refund.id]);
    expect(byType.get('discount')?.map((file) => file.id)).toEqual([quote.id]);
    expect(byType.get('payment')?.map((file) => file.id)).toEqual([slip.id]);

    // A file is attached once: the slip can't go on another payment too.
    const again = await w.api.post(`${w.base}/expenses/${expense.id}/payments`, {
      amountPaise: 100,
      paidAt: todayInIndia(),
      receiptAssetIds: [slip.id],
    });
    expect(again.status).toBe(400);
    expect((await detailOf(w, expense.id)).entries).toHaveLength(3);
  });

  it('refuses files that are not what they say, too large, or of a kind it does not keep', async () => {
    const w = await ownerWithExpense();
    // A web page renamed .pdf.
    const fake = { type: 'application/pdf', name: 'receipt.pdf', body: pad('<html><script>') };
    const form = dataOf<{ uploadId: string; url: string; fields: Record<string, string> }>(
      await w.api
        .post(`${w.base}/expense-files`, {
          contentType: fake.type,
          bytes: fake.body.length,
          fileName: fake.name,
        })
        .expect(201),
    );
    let req = request(server()).post(form.url);
    for (const [key, value] of Object.entries(form.fields)) req = req.field(key, value);
    await req
      .attach('file', fake.body, { filename: fake.name, contentType: fake.type })
      .expect(204);
    const refused = await w.api.post(`${w.base}/expense-files/${form.uploadId}/complete`);
    expect([refused.status, codeOf(refused)]).toEqual([422, 'UPLOAD_WRONG_TYPE']);
    expect((await assets.findById(form.uploadId).lean())?.state).toBe('deleted');

    for (const body of [
      { contentType: 'text/html', bytes: 10, fileName: 'page.html' },
      { contentType: 'image/svg+xml', bytes: 10, fileName: 'logo.svg' },
      { contentType: 'application/pdf', bytes: 16 * 1024 * 1024, fileName: 'huge.pdf' },
      { contentType: 'application/pdf', bytes: 10 },
    ]) {
      const res = await w.api.post(`${w.base}/expense-files`, body);
      expect([res.status, codeOf(res)], JSON.stringify(body)).toEqual([400, 'VALIDATION_ERROR']);
    }
    // Never uploaded: nothing to complete.
    const missing = dataOf<{ uploadId: string }>(
      await w.api
        .post(`${w.base}/expense-files`, {
          contentType: 'application/pdf',
          bytes: 100,
          fileName: 'later.pdf',
        })
        .expect(201),
    );
    const notThere = await w.api.post(`${w.base}/expense-files/${missing.uploadId}/complete`);
    expect([notThere.status, codeOf(notThere)]).toEqual([422, 'UPLOAD_NOT_FOUND']);
    // An upload not completed can't be attached.
    const early = await w.api.post(`${w.base}/expenses`, {
      title: 'Venue',
      category: 'Venue',
      amountPaise: 100,
      receiptAssetIds: [missing.uploadId],
    });
    expect(early.status).toBe(400);
  });

  it('lets managers attach files, and stops uploads once the wedding is archived', async () => {
    const w = await ownerWithExpense();
    const manager = await signupVerified(app, { displayName: 'Kavya Sharma' });
    await memberships.create({
      weddingId: new Types.ObjectId(w.weddingId),
      userId: new Types.ObjectId(manager.userId),
      role: 'manager',
      status: 'active',
      activeOwned: false,
      joinedAt: new Date(),
    });
    const theirs = await upload({ ...w, api: as(manager.cookie) }, FILES.pdf);
    expect(theirs.fileName).toBe('Advance receipt.pdf');

    await w.api.post(`${w.base}/archive`).expect(200);
    const res = await w.api.post(`${w.base}/expense-files`, {
      contentType: 'application/pdf',
      bytes: 100,
      fileName: 'late.pdf',
    });
    expect([res.status, codeOf(res)]).toEqual([409, 'WEDDING_ARCHIVED']);
    // What is kept stays readable.
    expect((await request(server()).get(theirs.url).set('Cookie', w.cookie)).status).toBe(200);
  });
});
