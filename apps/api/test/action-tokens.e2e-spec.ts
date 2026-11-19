import { getModelToken } from '@nestjs/mongoose';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Types, type Model } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ActionTokensService } from '../src/modules/auth/action-tokens.service.js';
import { AuthActionToken } from '../src/modules/auth/schemas/auth-action-token.schema.js';
import { createTestApp } from './support/app.js';

// The worker issues a link while sending each email, up to five jobs at once,
// so issue() must leave only the newest request's link working whatever the
// order or overlap of the jobs.
describe('Email link tokens (integration)', () => {
  let app: NestExpressApplication;
  let service: ActionTokensService;
  let tokens: Model<AuthActionToken>;

  beforeAll(async () => {
    app = await createTestApp();
    service = app.get(ActionTokensService);
    tokens = app.get<Model<AuthActionToken>>(getModelToken(AuthActionToken.name));
  });

  afterAll(() => app.close());

  const HOUR = 60 * 60 * 1000;

  function request(userId: Types.ObjectId, requestedAt: Date) {
    return {
      userId,
      purpose: 'verify_email' as const,
      ttlMs: HOUR,
      notificationId: new Types.ObjectId(),
      requestedAt,
    };
  }

  async function usableLinks(userId: Types.ObjectId) {
    return tokens
      .find({
        userId,
        purpose: 'verify_email',
        consumedAt: { $exists: false },
        revokedAt: { $exists: false },
      })
      .lean();
  }

  it('an older request sent after a newer one gets no link, and replaces nothing', async () => {
    const userId = new Types.ObjectId();
    const older = request(userId, new Date(Date.now() - 60_000));
    const newer = request(userId, new Date());

    expect(await service.issue(newer)).toEqual(expect.any(String));
    expect(await service.issue(older)).toBeNull();

    const usable = await usableLinks(userId);
    expect(usable.map((link) => link.notificationId.toHexString())).toEqual([
      newer.notificationId.toHexString(),
    ]);
  });

  it('a retried send of the same email keeps both of its links', async () => {
    const userId = new Types.ObjectId();
    const email = request(userId, new Date());
    await service.issue(email);
    await service.issue(email);
    expect(await usableLinks(userId)).toHaveLength(2);
  });

  it('of many emails sent at once, only the newest request’s link works', async () => {
    for (let round = 0; round < 10; round += 1) {
      const userId = new Types.ObjectId();
      const start = Date.now() - 60_000;
      // Some share a timestamp, to exercise the tie-break.
      const requests = Array.from({ length: 6 }, (_, i) =>
        request(userId, new Date(start + Math.floor(i / 2) * 1000)),
      );
      const newest = requests.reduce((a, b) =>
        a.requestedAt < b.requestedAt ||
        (a.requestedAt.getTime() === b.requestedAt.getTime() &&
          a.notificationId.toHexString() < b.notificationId.toHexString())
          ? b
          : a,
      );

      // Shuffled, then all at once.
      const shuffled = [...requests].sort(() => Math.random() - 0.5);
      const issued = await Promise.all(shuffled.map((r) => service.issue(r)));

      const usable = await usableLinks(userId);
      expect(usable.map((link) => link.notificationId.toHexString())).toEqual([
        newest.notificationId.toHexString(),
      ]);
      expect(issued[shuffled.indexOf(newest)]).toEqual(expect.any(String));
    }
  });
});
