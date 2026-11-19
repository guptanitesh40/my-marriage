import { ServiceUnavailableException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { Redis } from 'ioredis';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PlatformModule } from '../src/platform/platform.module.js';
import { RateLimitedException, RateLimiter } from '../src/platform/rate-limit.js';
import { REDIS } from '../src/platform/redis.js';

const rule = { name: 'test-rule', limit: 3, windowSeconds: 60 };

describe('RateLimiter (integration)', () => {
  let moduleRef: TestingModule;
  let limiter: RateLimiter;
  let redis: Redis;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [PlatformModule],
      providers: [RateLimiter],
    }).compile();
    limiter = moduleRef.get(RateLimiter);
    redis = moduleRef.get<Redis>(REDIS);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(async () => {
    const keys = await redis.keys('rl:test-rule:*');
    if (keys.length > 0) await redis.del(...keys);
  });

  it('allows the limit, then refuses with the time left in the window', async () => {
    for (let hit = 0; hit < 3; hit += 1) {
      await limiter.consume(rule, 'priya@example.com');
    }
    const error = await limiter
      .consume(rule, 'priya@example.com')
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(RateLimitedException);
    const retryAfter = (error as RateLimitedException).getResponse() as {
      retryAfterSeconds: number;
    };
    expect(retryAfter.retryAfterSeconds).toBeGreaterThan(0);
    expect(retryAfter.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it('counts each subject separately', async () => {
    for (let hit = 0; hit < 3; hit += 1) await limiter.consume(rule, 'a@example.com');
    await expect(limiter.consume(rule, 'b@example.com')).resolves.toBeUndefined();
  });

  it('never lets concurrent hits slip past the limit', async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, () => limiter.hit(rule, 'burst@example.com')),
    );
    expect(results.filter((result) => result.allowed)).toHaveLength(3);
  });

  it('can forget a subject', async () => {
    for (let hit = 0; hit < 3; hit += 1) await limiter.hit(rule, 'c@example.com');
    expect((await limiter.hit(rule, 'c@example.com')).allowed).toBe(false);

    await limiter.reset(rule, 'c@example.com');
    expect((await limiter.hit(rule, 'c@example.com')).allowed).toBe(true);
  });

  it('never stores the subject itself in Redis', async () => {
    await limiter.hit(rule, 'priya@example.com');
    const keys = await redis.keys('rl:test-rule:*');
    expect(keys).toHaveLength(1);
    expect(keys[0]).not.toContain('priya');
  });

  it('refuses requests (503) instead of skipping the check when Redis is down', async () => {
    const unreachable = new Redis('redis://127.0.0.1:1', {
      maxRetriesPerRequest: 0,
      connectTimeout: 200,
      retryStrategy: () => null,
    });
    unreachable.on('error', () => undefined);
    const offline = new RateLimiter(unreachable);
    // Silence the expected error log.
    Object.assign(offline, { logger: { error: () => undefined } });
    try {
      await expect(offline.consume(rule, 'priya@example.com')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    } finally {
      unreachable.disconnect();
    }
  });
});
