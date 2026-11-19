import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { MAIL_DIR } from './e2e/support/paths';

const WEB_PORT = 3200;
const API_PORT = 4200;
const WEB_ORIGIN = `http://localhost:${WEB_PORT}`;
const API_ORIGIN = `http://localhost:${API_PORT}`;

/**
 * Browser tests, against production builds of the web app and the API:
 * accessibility (axe), layout at phone/tablet/desktop widths, keyboard use,
 * link integrity, and the sign-up, verification, sign-in and password reset
 * journeys end to end, emails included. Screenshots are attached to the HTML
 * report for visual review against the Stitch design; they are not
 * pixel-compared.
 *
 * Needs MongoDB and Redis (`pnpm services:up`). The API runs on its own test
 * database and Redis database, reset at every run.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: WEB_ORIGIN,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // CI's Build step has already built the API; locally, always build so
      // the tests never run against a stale one.
      command: `${process.env.CI ? '' : 'pnpm build && '}node test/support/browser-stack.ts`,
      cwd: path.join(__dirname, '../api'),
      url: `${API_ORIGIN}/api/v1/health/ready`,
      env: {
        NODE_ENV: 'test',
        PORT: String(API_PORT),
        MONGODB_URI:
          process.env.BROWSER_TEST_MONGODB_URI ??
          'mongodb://localhost:27017/my_marriage_browser_test?directConnection=true',
        REDIS_URL: process.env.BROWSER_TEST_REDIS_URL ?? 'redis://localhost:6379/2',
        WEB_ORIGIN,
        MAIL_TRANSPORT: 'file',
        MAIL_FILE_DIR: MAIL_DIR,
        // The web app's /api forwarding is the one hop in front of the API,
        // so each test's own address (e2e/support/visitor.ts) counts.
        TRUST_PROXY_HOPS: '1',
      },
      timeout: 180_000,
      // Always a fresh API: the run starts from an empty database.
      reuseExistingServer: false,
    },
    {
      // The /api/v1 rewrite is fixed at build time, so the build must see
      // API_ORIGIN. CI's Build step sets the same value (ci.yml).
      command: process.env.CI
        ? `pnpm exec next start -p ${WEB_PORT}`
        : `pnpm exec next build && pnpm exec next start -p ${WEB_PORT}`,
      url: WEB_ORIGIN,
      env: { API_ORIGIN },
      timeout: 180_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
