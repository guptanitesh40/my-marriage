import { defineConfig } from 'vitest/config';

// Integration tests: run against the real MongoDB replica set and Redis from
// compose.yaml (`pnpm services:up`). Values below are only defaults; anything
// already set in the environment wins.
//
// Tests get their own MongoDB database and their own Redis database (/1), so
// they never see — or are consumed by — a `pnpm dev` running alongside. Files
// run one at a time because they share that database.
export default defineConfig({
  test: {
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      MONGODB_URI:
        process.env.MONGODB_URI ??
        'mongodb://localhost:27017/my_marriage_test?directConnection=true',
      REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379/1',
      MAIL_TRANSPORT: 'memory',
      // Uploads stay in a local folder: tests never touch the real S3 bucket,
      // even when apps/api/.env names one.
      S3_BUCKET: '',
    },
  },
});
