import { test as base, type Browser, type BrowserContextOptions } from '@playwright/test';

/**
 * Each browser test is a different visitor, from a different address, as
 * real people are. Without this every test would share one address and
 * soon hit the API's per-address limits (10 sign-ups an hour), which are
 * meant for people, not a test suite.
 *
 * The address travels in X-Forwarded-For, which the web app's /api
 * forwarding passes on unchanged; the test API trusts that one hop
 * (TRUST_PROXY_HOPS=1 in playwright.config.ts).
 */
function randomAddress(): string {
  const part = () => 1 + Math.floor(Math.random() * 254);
  return `10.${part()}.${part()}.${part()}`;
}

export function visitorHeaders(): Record<string, string> {
  return { 'x-forwarded-for': randomAddress() };
}

/** `test` whose `page` (and `request`) come from a visitor with their own address. */
export const test = base.extend({
  // Named `provide`, not Playwright's usual `use`, which the React lint rules read as a hook.
  extraHTTPHeaders: async ({}, provide) => {
    await provide(visitorHeaders());
  },
});

/** A second visitor in the same test, e.g. the partner on another device. */
export function newVisitor(browser: Browser, options: BrowserContextOptions = {}) {
  return browser.newContext({
    ...options,
    extraHTTPHeaders: { ...options.extraHTTPHeaders, ...visitorHeaders() },
  });
}
