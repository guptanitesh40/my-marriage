import type { INestApplicationContext } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Redis } from 'ioredis';
import type { Model } from 'mongoose';
import request from 'supertest';
import { User } from '../../src/modules/auth/schemas/user.schema.js';
import { BackgroundTasks } from '../../src/platform/background-tasks.js';
import { REDIS } from '../../src/platform/redis.js';

export const PASSWORD = 'mehendi at the haveli';

let counter = 0;
/** A fresh address per call, so tests never collide on the unique email index. */
export function uniqueEmail(name = 'priya'): string {
  counter += 1;
  return `${name}.${Date.now().toString(36)}${counter}@example.com`;
}

/** `name=value` from a response's Set-Cookie, ready for a Cookie header; undefined if not set. */
export function cookieFrom(setCookie: string[] | string | undefined, name = 'mm_session') {
  const all = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  const match = all.find((cookie) => cookie.startsWith(`${name}=`));
  return match?.split(';', 1)[0];
}

/** Signs up through the API and returns the response and its session cookie. */
export async function signup(
  app: NestExpressApplication,
  overrides: Partial<{ email: string; password: string; displayName: string }> = {},
) {
  const body = {
    email: uniqueEmail(),
    password: PASSWORD,
    displayName: 'Priya Sharma',
    ...overrides,
  };
  const res = await request(app.getHttpServer()).post('/api/v1/auth/signup').send(body);
  return { res, body, cookie: cookieFrom(res.headers['set-cookie']) };
}

/**
 * Signs up and marks the email verified directly in the database, for tests
 * of features behind verification. Returns the session cookie and the user ID.
 */
export async function signupVerified(
  app: NestExpressApplication,
  overrides: Partial<{ email: string; password: string; displayName: string }> = {},
) {
  const result = await signup(app, overrides);
  if (!result.cookie) throw new Error(`Signup failed: ${result.res.status}`);
  const users = app.get<Model<User>>(getModelToken(User.name));
  await users.updateOne(
    { emailNormalized: result.body.email.toLowerCase() },
    { $set: { verifiedAt: new Date() } },
  );
  return { cookie: result.cookie, userId: (result.res.body as { data: { id: string } }).data.id };
}

/** Clears every rate-limit counter; all test requests share one client address. */
export async function resetRateLimits(app: INestApplicationContext): Promise<void> {
  const redis = app.get<Redis>(REDIS);
  const keys = await redis.keys('rl:*');
  if (keys.length > 0) await redis.del(...keys);
}

/**
 * Waits for the work requests left running after answering (forgot
 * password, resend verification), so a test can check what it wrote.
 */
export function settle(app: INestApplicationContext): Promise<void> {
  return app.get(BackgroundTasks).drain();
}

/** The secret from the link in an email (`…#token=<secret>`). */
export function tokenFromEmail(email: { text: string } | undefined): string {
  const token = /#token=([A-Za-z0-9_-]+)/.exec(email?.text ?? '')?.[1];
  if (!token) throw new Error('No link token in the email');
  return token;
}
