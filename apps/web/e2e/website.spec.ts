import { expect, type Page } from '@playwright/test';
import {
  collectErrors,
  expectNoHorizontalScroll,
  expectNoSeriousA11yIssues,
  VIEWPORTS,
} from './support/checks';
import { createWedding, signUpVerified, WORKSPACE } from './support/journeys';
import { uniqueEmail } from './support/mail';
import { newVisitor, test } from './support/visitor';

/** A verified owner with a wedding, on its Wedding Website page. */
async function ownerAtWebsite(page: Page) {
  await signUpVerified(page, uniqueEmail('owner'), 'Ananya Sharma');
  await page.goto('/onboarding');
  await createWedding(page, {
    bride: 'Ananya',
    groom: 'Arjun',
    city: 'Jaipur',
    state: 'Rajasthan',
  });
  await page.goto('/dashboard');
  await expect(page).toHaveURL(WORKSPACE);
  const weddingPath = new URL(page.url()).pathname;
  const weddingId = weddingPath.split('/').pop() ?? '';
  await page.goto(`${weddingPath}/website`);
  await expect(page.getByRole('heading', { level: 1, name: 'Wedding Website' })).toBeVisible();
  return { weddingId, website: `${weddingPath}/website` };
}

for (const viewport of VIEWPORTS) {
  test(`the website page fits and is accessible at ${viewport.width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const errors = collectErrors(page);
    await ownerAtWebsite(page);
    await expect(page.getByText('Draft · Not published')).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoSeriousA11yIssues(page);
    await testInfo.attach(`website-${viewport.width}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
    expect(errors).toEqual([]);
  });
}

test('a new website is a private draft that says what publishing needs, and keeps its design choice', async ({
  page,
}) => {
  const { weddingId } = await ownerAtWebsite(page);
  const ready = page.getByRole('region', { name: 'Before you publish' });
  await expect(ready).toContainText('Ananya & Arjun');
  await expect(ready).toContainText('Add at least one ceremony on the Events page.');
  await expect(page.getByRole('region', { name: 'Website address' })).toContainText(
    '/w/ananya-arjun',
  );

  const design = page.getByRole('region', { name: 'Website design' });
  await expect(design.getByRole('radio')).toHaveCount(3);
  await expect(design.getByRole('radio', { name: /Traditional/ })).toBeChecked();
  await design.getByText('Royal / Elegant', { exact: true }).click();
  await expect(design.getByRole('radio', { name: /Royal/ })).toBeChecked();
  await expect(design).toContainText('Selected');
  await page.reload();
  await expect(
    page.getByRole('region', { name: 'Website design' }).getByRole('radio', { name: /Royal/ }),
  ).toBeChecked();

  // Adding a ceremony makes it ready to publish.
  const res = await page.request.post(`/api/v1/weddings/${weddingId}/events`, {
    data: { title: 'Haldi' },
  });
  expect(res.status()).toBe(201);
  await page.reload();
  await expect(page.getByRole('region', { name: 'Ready to publish' })).toContainText(
    '1 ceremony ready to show',
  );
});

test('another wedding’s website page is simply not found', async ({ page, browser }) => {
  const theirs = await ownerAtWebsite(page);
  const other = await newVisitor(browser);
  const tab = await other.newPage();
  await ownerAtWebsite(tab);
  await tab.goto(theirs.website);
  await expect(
    tab.getByRole('heading', { level: 1, name: 'We couldn’t find that wedding' }),
  ).toBeVisible();
  expect((await tab.request.get(`/api/v1/weddings/${theirs.weddingId}/website`)).status()).toBe(
    404,
  );
  await other.close();
});
