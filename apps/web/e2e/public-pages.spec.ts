import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const PAGES = ['/', '/privacy', '/terms'];

const PHONE = { name: 'phone', width: 360, height: 800 };
const TABLET = { name: 'tablet', width: 768, height: 1024 };
const DESKTOP = { name: 'desktop', width: 1280, height: 900 };
const VIEWPORTS = [PHONE, TABLET, DESKTOP];

/**
 * Routes the public pages link to that a later milestone builds. Each must
 * be removed from this list by the milestone that creates it.
 *   /login — authentication milestone.
 */
const PENDING_ROUTES = new Set(['/login']);

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, 'page is wider than the viewport').toBeLessThanOrEqual(0);
}

async function expectNoSeriousA11yIssues(page: Page) {
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

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.name} (${viewport.width}px)`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const path of PAGES) {
      test(`${path} is accessible and fits the screen`, async ({ page }, testInfo) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('console', (message) => {
          // Failed requests are reported below, with their URL.
          if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) {
            errors.push(message.text());
          }
        });
        // Next.js prefetches linked pages, so a pending route shows up here
        // as a 404 until its milestone builds it. Nothing else may fail.
        page.on('response', (response) => {
          const url = new URL(response.url());
          if (response.status() >= 400 && !PENDING_ROUTES.has(url.pathname)) {
            errors.push(`${response.status()} ${url.pathname}`);
          }
        });
        // Requests that fail without a response (net::ERR_*, blocked,
        // aborted) never reach the listener above.
        page.on('requestfailed', (request) => {
          const url = new URL(request.url());
          errors.push(`${request.failure()?.errorText ?? 'failed'} ${url.pathname}`);
        });

        await page.goto(path);
        await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
        await expectNoHorizontalScroll(page);
        await expectNoSeriousA11yIssues(page);
        expect(errors).toEqual([]);

        await testInfo.attach(`${path === '/' ? 'home' : path.slice(1)}-${viewport.width}`, {
          body: await page.screenshot({ fullPage: true }),
          contentType: 'image/png',
        });
      });
    }

    test('header shows the right controls for the width', async ({ page }) => {
      await page.goto('/');
      const header = page.getByRole('banner');
      await expect(header.getByRole('link', { name: 'Log in' })).toBeVisible();
      const nav = header.getByRole('navigation', { name: 'Main' });
      const start = header.getByRole('link', { name: 'Start planning free' });
      if (viewport.width < 640) {
        await expect(start).toBeHidden();
        await expect(nav).toBeHidden();
      } else if (viewport.width < 768) {
        await expect(start).toBeVisible();
        await expect(nav).toBeHidden();
      } else {
        await expect(start).toBeVisible();
        await expect(nav).toBeVisible();
      }
    });
  });
}

test('the skip link is the first stop and jumps to the content', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);
});

test('FAQ answers open with the keyboard, one at a time', async ({ page }) => {
  await page.goto('/');
  const first = page.locator('#faq details').nth(0);
  const second = page.locator('#faq details').nth(1);
  await first.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(first).toHaveAttribute('open', '');
  await second.locator('summary').focus();
  await page.keyboard.press('Space');
  await expect(second).toHaveAttribute('open', '');
  await expect(first).not.toHaveAttribute('open');
});

test('planning preview tabs work with the keyboard', async ({ page }) => {
  await page.goto('/');
  const tasks = page.getByRole('tab', { name: 'Tasks' });
  await tasks.focus();
  await page.keyboard.press('ArrowRight');
  const expenses = page.getByRole('tab', { name: 'Vendors & expenses' });
  await expect(expenses).toBeFocused();
  await expect(expenses).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel')).toContainText('Wedding photography');
  // The PRD's worked example: ₹80,000 with ₹30,000 paid leaves ₹50,000.
  await expect(page.getByRole('tabpanel')).toContainText('₹50,000');
});

test('header navigation scrolls to each homepage section', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main' });
  for (const [label, id] of [
    ['Features', 'features'],
    ['How it works', 'how-it-works'],
    ['Wedding websites', 'wedding-websites'],
    ['FAQ', 'faq'],
  ] as const) {
    await nav.getByRole('link', { name: label }).click();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await expect(page.locator(`#${id}`)).toBeInViewport();
  }
});

test('every link on the public pages resolves', async ({ page, request }) => {
  const checked = new Set<string>();
  for (const path of PAGES) {
    await page.goto(path);
    const hrefs = await page
      .locator('a[href]')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
    for (const href of hrefs) {
      expect(href, `empty or placeholder link on ${path}`).not.toMatch(/^#?$/);
      expect(href, `external link on ${path}`).toMatch(/^[/#]/);
      const [target = '', hash] = href.split('#');
      if (hash) {
        const onPage = target === '' || target === path;
        if (onPage) await expect(page.locator(`#${hash}`)).toHaveCount(1);
      }
      const route = target || path;
      if (checked.has(route) || PENDING_ROUTES.has(route)) continue;
      checked.add(route);
      const response = await request.get(route);
      expect(response.status(), `${route} (linked from ${path})`).toBe(200);
    }
  }
  // Fail loudly once a pending route exists, so it is removed from the list.
  for (const route of PENDING_ROUTES) {
    const response = await request.get(route);
    expect(response.status(), `${route} now exists: remove it from PENDING_ROUTES`).toBe(404);
  }
});

test('the footer shows the current year', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('contentinfo')).toContainText(
    `© ${new Date().getFullYear()} My Marriage`,
  );
});

// axe only checks what is rendered, so open each hidden part and check it too.
for (const viewport of [PHONE, DESKTOP]) {
  test(`hidden tab panels and FAQ answers are accessible at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/');
    for (const name of ['Vendors & expenses', 'Guests by ceremony']) {
      await page.getByRole('tab', { name }).click();
      await expect(page.getByRole('tab', { name })).toHaveAttribute('aria-selected', 'true');
      await expectNoHorizontalScroll(page);
      await expectNoSeriousA11yIssues(page);
    }
    const answers = page.locator('#faq details');
    for (let index = 0; index < (await answers.count()); index++) {
      await answers.nth(index).locator('summary').click();
      await expect(answers.nth(index)).toHaveAttribute('open', '');
      await expectNoSeriousA11yIssues(page);
    }
  });
}
