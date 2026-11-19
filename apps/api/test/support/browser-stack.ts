/**
 * Starts the built API and worker for the web app's browser tests
 * (apps/web/playwright.config.ts), on a fresh test database:
 *
 *   1. drops the MongoDB test database, empties the Redis test database and
 *      the folder emails are written to;
 *   2. applies migrations;
 *   3. runs the worker and the API until Playwright stops this process.
 *
 * Run with `node test/support/browser-stack.ts` from apps/api after
 * `pnpm build` (Node runs TypeScript directly). Everything comes from the
 * environment Playwright sets; it refuses to touch a database whose name does
 * not end in `_test`.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { basename } from 'node:path';
import { Redis } from 'ioredis';
import mongoose from 'mongoose';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set`);
  return value;
}

const mongoUri = required('MONGODB_URI');
const redisUrl = required('REDIS_URL');
const mailDir = required('MAIL_FILE_DIR');

const databaseName = new URL(mongoUri.replace(/^mongodb(\+srv)?:/, 'http:')).pathname.slice(1);
if (!databaseName.endsWith('_test')) {
  throw new Error(`Refusing to reset "${databaseName}": not a test database`);
}
if (basename(mailDir) !== '.e2e-mail') {
  throw new Error('MAIL_FILE_DIR must be a folder named .e2e-mail');
}

const connection = await mongoose.createConnection(mongoUri).asPromise();
await connection.dropDatabase();
await connection.close();
const redis = new Redis(redisUrl);
await redis.flushdb();
redis.disconnect();
await rm(mailDir, { recursive: true, force: true });

function run(entry: string): ChildProcess {
  return spawn(process.execPath, [entry], { stdio: 'inherit', env: process.env });
}

const migrate = run('dist/migrate.js');
const migrated = await new Promise<number | null>((resolve) => migrate.on('exit', resolve));
if (migrated !== 0) process.exit(migrated ?? 1);

const children = [run('dist/worker.js'), run('dist/main.js')];
let stopping = false;
function stop(code: number): void {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  process.exitCode = code;
}
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => stop(0));
// If either process dies, stop the other: the tests need both.
for (const child of children) child.on('exit', (code) => stop(code ?? 1));
