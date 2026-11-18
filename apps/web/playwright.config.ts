import { defineConfig, devices } from '@playwright/test';

const PORT = 3200;

/**
 * Browser tests for the public pages, run against a production build:
 * accessibility (axe), layout at phone/tablet/desktop widths, keyboard use
 * and link integrity. Screenshots are attached to the HTML report for visual
 * review against the Stitch design; they are not pixel-compared.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // CI's Build step has already produced the production build; building
    // again would only add minutes. Locally, always build so the tests never
    // run against a stale one.
    command: process.env.CI
      ? `pnpm exec next start -p ${PORT}`
      : `pnpm exec next build && pnpm exec next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
  },
});
