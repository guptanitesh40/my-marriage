import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

export const PHONE = { name: 'phone', width: 360, height: 800 };
export const TABLET = { name: 'tablet', width: 768, height: 1024 };
export const DESKTOP = { name: 'desktop', width: 1280, height: 900 };
export const VIEWPORTS = [PHONE, TABLET, DESKTOP];

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, 'page is wider than the viewport').toBeLessThanOrEqual(0);
}

export async function expectNoSeriousA11yIssues(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  expect(
    serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
  ).toEqual([]);
}

/**
 * Collects page errors, console errors and failed requests while a test
 * runs. `allow` lists request paths expected to fail (e.g. a 401 the page
 * handles). Check the result with `expect(errors).toEqual([])`.
 */
export function collectErrors(page: Page, allow: string[] = []): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    // Failed requests are reported below, with their URL.
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) {
      errors.push(message.text());
    }
  });
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (response.status() >= 400 && !allow.includes(url.pathname)) {
      errors.push(`${response.status()} ${url.pathname}`);
    }
  });
  // Requests that fail without a response (net::ERR_*, blocked, aborted)
  // never reach the listener above.
  page.on('requestfailed', (request) => {
    const url = new URL(request.url());
    // A full-page navigation away cancels in-flight prefetches; harmless.
    if (request.failure()?.errorText === 'net::ERR_ABORTED') return;
    errors.push(`${request.failure()?.errorText ?? 'failed'} ${url.pathname}`);
  });
  return errors;
}
