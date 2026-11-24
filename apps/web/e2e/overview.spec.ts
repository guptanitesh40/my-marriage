import { expect, type Page } from '@playwright/test';
import {
  collectErrors,
  expectNoHorizontalScroll,
  expectNoSeriousA11yIssues,
  VIEWPORTS,
} from './support/checks';
import { createWedding, signUpVerified, WORKSPACE } from './support/journeys';
import { uniqueEmail } from './support/mail';
import { test } from './support/visitor';

/** A verified owner with a new wedding, on its overview. */
async function ownerAtOverview(page: Page) {
  await signUpVerified(page, uniqueEmail('owner'), 'Ananya Sharma');
  await page.goto('/onboarding');
  await createWedding(page, {
    bride: 'Ananya',
    groom: 'Arjun',
    city: 'Jaipur',
    state: 'Rajasthan',
    date: '2031-12-10',
  });
  await page.goto('/dashboard');
  await expect(page).toHaveURL(WORKSPACE);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Ananya & Arjun’s Wedding' }),
  ).toBeVisible();
  return new URL(page.url()).pathname;
}

const quickActions = (page: Page) => page.getByRole('navigation', { name: 'Quick actions' });
const panel = (page: Page, name: string) => page.getByRole('region', { name });

for (const viewport of VIEWPORTS) {
  test(`the overview fits and is accessible at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const errors = collectErrors(page);
    await ownerAtOverview(page);

    const main = page.getByRole('main');
    await expect(main).toContainText('Welcome back, Ananya.');
    await expect(main).toContainText('10 December 2031 (main wedding day)');
    await expect(main).toContainText('To the main wedding day');
    await expect(page.getByRole('heading', { name: 'Begin planning your wedding' })).toBeVisible();
    // A new wedding shows real zeros, never "unavailable".
    await expect(main).toContainText('0 ceremonies');
    await expect(main).toContainText('0 open tasks');
    await expect(main).toContainText('₹0');
    await expect(main).toContainText('0 contacts');
    await expect(main).not.toContainText('unavailable');
    await expect(quickActions(page).getByRole('link', { name: 'Add ceremony' })).toBeVisible();

    await expectNoHorizontalScroll(page);
    await expectNoSeriousA11yIssues(page);
    await testInfo.attach(`overview-${viewport.width}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
    expect(errors).toEqual([]);
  });
}

test('quick actions open each page’s add form, and the overview counts what was added', async ({
  page,
}) => {
  const errors = collectErrors(page);
  const weddingPath = await ownerAtOverview(page);

  // A ceremony.
  await quickActions(page).getByRole('link', { name: 'Add ceremony' }).click();
  await expect(page).toHaveURL(`${weddingPath}/events`);
  let drawer = page.getByRole('dialog', { name: 'Add a ceremony' });
  await expect(drawer).toBeVisible();
  await drawer.getByText('Custom +').click();
  await drawer.getByLabel(/^Name/).fill('Haldi');
  await drawer.getByLabel(/^Date/).fill('2031-12-08');
  await drawer.getByLabel(/^Start time/).fill('10:30');
  await drawer.getByLabel(/^Venue/).fill('Rambagh Palace lawns');
  await drawer.getByRole('button', { name: /Save ceremony/ }).click();
  await expect(drawer).toBeHidden();

  // A task.
  await page.goto(weddingPath);
  await quickActions(page).getByRole('link', { name: 'Add task' }).click();
  await expect(page).toHaveURL(`${weddingPath}/tasks`);
  drawer = page.getByRole('dialog', { name: 'Add task' });
  await drawer.getByLabel(/^Task name/).fill('Book the Haldi decorator');
  await drawer.getByRole('button', { name: 'Create task' }).click();
  await expect(drawer).toBeHidden();

  // An expense.
  await page.goto(weddingPath);
  await quickActions(page).getByRole('link', { name: 'Add expense' }).click();
  await expect(page).toHaveURL(`${weddingPath}/expenses`);
  drawer = page.getByRole('dialog', { name: 'Add expense' });
  await drawer.getByLabel(/^Expense name/).fill('Palace lawns');
  await drawer.getByLabel(/^Category/).selectOption('Venue');
  await drawer.getByLabel(/^Agreed amount/).fill('8,50,000');
  await drawer.getByRole('button', { name: 'Save expense' }).click();
  await expect(page.getByRole('dialog', { name: 'Palace lawns' })).toBeVisible();

  // A family of five, invited to the Haldi.
  await page.goto(weddingPath);
  await quickActions(page).getByRole('link', { name: 'Add guest' }).click();
  await expect(page).toHaveURL(`${weddingPath}/guests`);
  drawer = page.getByRole('dialog', { name: 'Add guest' });
  await drawer.getByLabel(/^Primary contact name/).fill('Sharma family');
  for (let i = 0; i < 4; i++) await drawer.getByRole('button', { name: 'One more' }).click();
  await drawer.getByRole('checkbox', { name: /^Haldi/ }).check();
  await drawer.getByRole('button', { name: 'Add guest' }).click();
  await expect(page.getByRole('dialog', { name: 'Sharma family' })).toBeVisible();

  await page.goto(weddingPath);
  const main = page.getByRole('main');
  await expect(page.getByRole('heading', { name: 'Begin planning your wedding' })).toBeHidden();
  await expect(main).toContainText('1 ceremony');
  await expect(panel(page, 'Upcoming celebrations')).toContainText('Haldi');
  await expect(panel(page, 'Upcoming celebrations')).toContainText('Rambagh Palace lawns');
  await expect(panel(page, 'Upcoming celebrations')).toContainText('0 people confirmed');
  await expect(main).toContainText('1 open task');
  await expect(panel(page, 'Tasks needing attention')).toContainText('Book the Haldi decorator');
  await expect(panel(page, 'Expense overview')).toContainText('₹8,50,000');
  await expect(panel(page, 'Expense overview')).toContainText('Venue');
  await expect(main).toContainText('1 contact');
  await expect(main).toContainText('5 people invited');
  await expect(panel(page, 'Guests & RSVP')).toContainText('1 awaiting reply');
  // The add forms opened once; going back does not open them again.
  await page.goBack();
  await expect(page.getByRole('dialog', { name: 'Add guest' })).toBeHidden();
  expect(errors).toEqual([]);
});

test('an archived wedding’s overview is read-only, with the owner’s safety links', async ({
  page,
}, testInfo) => {
  const weddingPath = await ownerAtOverview(page);
  const archived = await page.request.post(`/api/v1${weddingPath}/archive`);
  expect(archived.status()).toBe(200);

  await page.reload();
  await expect(page.getByRole('heading', { name: 'This wedding is archived' })).toBeVisible();
  await expect(page.getByRole('main')).toContainText('Archived · read-only');
  await expect(quickActions(page)).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Begin planning your wedding' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Unpublish the website' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Add task' })).toHaveCount(0);
  await expectNoHorizontalScroll(page);
  await testInfo.attach('overview-archived', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
});
