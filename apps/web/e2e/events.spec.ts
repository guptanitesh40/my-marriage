import { expect, type Page } from '@playwright/test';
import {
  collectErrors,
  DESKTOP,
  expectNoHorizontalScroll,
  expectNoSeriousA11yIssues,
  PHONE,
  VIEWPORTS,
} from './support/checks';
import { createWedding, signUpVerified, WORKSPACE } from './support/journeys';
import { uniqueEmail } from './support/mail';
import { newVisitor, test } from './support/visitor';

/** A verified owner with a wedding; returns the wedding's events address. */
async function ownerAtEvents(page: Page) {
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
  const events = `${new URL(page.url()).pathname}/events`;
  await page.goto(events);
  await expect(page.getByRole('heading', { level: 1, name: 'Events' })).toBeVisible();
  return events;
}

for (const viewport of VIEWPORTS) {
  test(`events, empty and with the drawer open, fit and are accessible at ${viewport.width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const errors = collectErrors(page);
    await ownerAtEvents(page);
    await expect(page.getByRole('heading', { name: 'No ceremonies added yet' })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoSeriousA11yIssues(page);

    await page.getByRole('button', { name: 'Add first ceremony' }).click();
    const drawer = page.getByRole('dialog', { name: 'Add a ceremony' });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByLabel(/^Name/)).toBeFocused();
    await expectNoSeriousA11yIssues(page);
    await testInfo.attach(`events-drawer-${viewport.width}`, {
      body: await page.screenshot(),
      contentType: 'image/png',
    });
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    expect(errors).toEqual([]);
  });
}

test('add a preset and a custom ceremony; the list updates and stays in date order', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: DESKTOP.width, height: DESKTOP.height });
  const errors = collectErrors(page);
  await page.goto('/');
  const events = await ownerAtEvents(page);

  // The sidebar leads here and marks Events as the current section.
  const nav = page.getByRole('navigation', { name: 'Workspace' });
  await nav.getByRole('link', { name: 'Overview' }).click();
  await nav.getByRole('link', { name: 'Events' }).click();
  await expect(page).toHaveURL(events);
  await expect(nav.getByRole('link', { name: 'Events' })).toHaveAttribute('aria-current', 'page');

  // A preset with nothing else: only the name is needed.
  await page.getByRole('button', { name: 'Add first ceremony' }).click();
  const drawer = page.getByRole('dialog', { name: 'Add a ceremony' });
  await drawer.getByText('Haldi', { exact: true }).click();
  await expect(drawer.getByLabel(/^Name/)).toHaveValue('Haldi');
  await drawer.getByRole('button', { name: /Save ceremony/ }).click();
  await expect(drawer).toBeHidden();
  await expect(page.getByRole('status').filter({ hasText: 'Haldi was added' })).toBeAttached();
  const haldi = page.getByRole('article', { name: 'Haldi' });
  await expect(haldi).toContainText('Date not set');
  await expect(haldi).toContainText('Venue not set');

  // A custom ceremony with a day, a time and a venue, in India time.
  await page.getByRole('button', { name: 'Add event' }).click();
  await drawer.getByText('Custom +').click();
  await drawer.getByLabel(/^Name/).fill('Sangeet & Cocktail');
  await drawer.getByLabel(/^Date/).fill('2031-12-13');
  await drawer.getByLabel(/^Start time/).fill('18:30');
  await drawer.getByLabel(/^Venue/).fill('The Grand Ballroom');
  await drawer.getByLabel(/^Address/).fill('Jai Mahal Palace, Jaipur');
  await drawer.getByRole('button', { name: /Save ceremony/ }).click();
  await expect(drawer).toBeHidden();

  const sangeet = page.getByRole('article', { name: 'Sangeet & Cocktail' });
  await expect(sangeet).toContainText('Day 1');
  await expect(sangeet).toContainText('Sat, 13 Dec 2031 · 6:30 pm');
  await expect(sangeet).toContainText('The Grand Ballroom · Jai Mahal Palace, Jaipur');
  // Dated first, undated after, and still so after a reload.
  const expectInOrder = async () => {
    await expect(page.getByRole('article')).toHaveCount(2);
    await expect(page.getByRole('article').getByRole('heading', { level: 2 })).toHaveText([
      'Sangeet & Cocktail',
      'Haldi',
    ]);
  };
  await expectInOrder();
  await page.reload();
  await expectInOrder();
  await testInfo.attach('events-list-1280', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
  await expectNoSeriousA11yIssues(page);
  expect(errors).toEqual([]);
});

test('the drawer explains what is missing and works with the keyboard alone', async ({ page }) => {
  await page.setViewportSize({ width: PHONE.width, height: PHONE.height });
  await ownerAtEvents(page);
  await page.getByRole('button', { name: 'Add first ceremony' }).focus();
  await page.keyboard.press('Enter');
  const drawer = page.getByRole('dialog', { name: 'Add a ceremony' });
  await expect(drawer.getByLabel(/^Name/)).toBeFocused();

  await drawer.getByRole('button', { name: /Save ceremony/ }).click();
  await expect(drawer.getByText('Enter the ceremony’s name.')).toBeVisible();
  await expect(drawer.getByLabel(/^Name/)).toBeFocused();

  await page.keyboard.type('Garba night');
  await page.keyboard.press('Enter');
  await expect(drawer).toBeHidden();
  await expect(page.getByRole('article', { name: 'Garba night' })).toBeVisible();
  await expectNoHorizontalScroll(page);
});

test('edit a ceremony and delete another after confirming; both last after a reload', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: PHONE.width, height: PHONE.height });
  const errors = collectErrors(page);
  await ownerAtEvents(page);
  const drawer = page.getByRole('dialog', { name: 'Add a ceremony' });
  for (const name of ['Haldi', 'Mehendi']) {
    await page.getByRole('button', { name: /Add (first ceremony|event)/ }).click();
    await drawer.getByText(name, { exact: true }).click();
    if (name === 'Haldi') {
      await drawer.getByLabel(/^Date/).fill('2031-12-12');
      await drawer.getByLabel(/^Start time/).fill('10:00');
      await drawer.getByLabel(/^Venue/).fill('Poolside Courtyard');
    }
    await drawer.getByRole('button', { name: /Save ceremony/ }).click();
    await expect(drawer).toBeHidden();
  }
  await expectNoHorizontalScroll(page);

  // Edit: the drawer starts from the ceremony as it is.
  await page.getByRole('button', { name: 'Manage Haldi' }).click();
  const editing = page.getByRole('dialog', { name: 'Haldi' });
  await expect(editing.getByLabel(/^Name/)).toHaveValue('Haldi');
  await expect(editing.getByLabel(/^Start time/)).toHaveValue('10:00');
  await editing.getByLabel(/^Name/).fill('Haldi & Pithi');
  await editing.getByLabel(/^Start time/).fill('11:30');
  await editing.getByLabel(/^Venue/).fill('');
  await editing.getByLabel(/^Status/).selectOption('cancelled');
  await editing.getByRole('button', { name: 'Save changes' }).click();
  await expect(editing).toBeHidden();
  await expect(
    page.getByRole('status').filter({ hasText: 'Haldi & Pithi was updated.' }),
  ).toBeAttached();
  const haldi = page.getByRole('article', { name: 'Haldi & Pithi' });
  await expect(haldi).toContainText('Fri, 12 Dec 2031 · 11:30 am');
  await expect(haldi).toContainText('Cancelled');
  await expect(haldi).toContainText('Venue not set');

  // Delete asks first; Cancel keeps the ceremony.
  await page.getByRole('button', { name: 'More for Mehendi' }).click();
  await page.getByRole('button', { name: 'Delete ceremony' }).click();
  const confirm = page.getByRole('dialog', { name: 'Delete Mehendi?' });
  await expect(confirm.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await expectNoSeriousA11yIssues(page);
  await testInfo.attach('events-delete-390', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
  await confirm.getByRole('button', { name: 'Cancel' }).click();
  await expect(confirm).toBeHidden();
  await expect(page.getByRole('article', { name: 'Mehendi' })).toBeVisible();

  await page.getByRole('button', { name: 'More for Mehendi' }).click();
  await page.getByRole('button', { name: 'Delete ceremony' }).click();
  await confirm.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('article', { name: 'Mehendi' })).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: 'Mehendi was deleted.' })).toBeAttached();

  await page.reload();
  await expect(page.getByRole('article').getByRole('heading', { level: 2 })).toHaveText([
    'Haldi & Pithi',
  ]);
  await expect(page.getByRole('article', { name: 'Haldi & Pithi' })).toContainText('11:30 am');
  expect(errors).toEqual([]);
});

test('each ceremony shows its tasks, which its menu opens; search and tabs narrow the list', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: DESKTOP.width, height: DESKTOP.height });
  const errors = collectErrors(page);
  const events = await ownerAtEvents(page);
  const weddingId = events.split('/')[2] ?? '';
  const post = async (path: string, body: object) => {
    const res = await page.request.post(`/api/v1/weddings/${weddingId}${path}`, { data: body });
    expect(res.status(), await res.text()).toBe(201);
    return ((await res.json()) as { data: { id: string } }).data.id;
  };
  const haldi = await post('/events', {
    title: 'Haldi',
    startDate: '2031-12-12',
    startTime: '10:00',
    venue: { name: 'Poolside Courtyard', address: 'Rambagh Palace, Jaipur' },
  });
  await post('/events', { title: 'Sangeet', startDate: '2031-12-13', startTime: '19:00' });
  await post('/tasks', { title: 'Book decorator', eventId: haldi, state: 'completed' });
  await post('/tasks', { title: 'Buy turmeric', eventId: haldi, dueDate: '2020-01-01' });
  await post('/tasks', { title: 'Brass bowls', eventId: haldi });
  await page.reload();

  const summary = page.getByRole('region', { name: 'Summary' });
  await expect(summary).toContainText('Total ceremonies2');
  await expect(summary).toContainText('2 days');
  await expect(summary).toContainText('12–13 Dec');
  await expect(summary).toContainText('33%');
  await expect(summary).toContainText('1/3');

  const card = page.getByRole('article', { name: 'Haldi' });
  await expect(card).toContainText('Day 1 · Morning');
  await expect(
    card.getByRole('link', { name: /^Tasks for Haldi: ?1 \/ 3 done ?Overdue ?1$/ }),
  ).toBeVisible();
  await expect(page.getByRole('article', { name: 'Sangeet' })).toContainText('None yet');
  await expectNoSeriousA11yIssues(page);
  await testInfo.attach('events-overview-1280', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });

  // Search and tabs.
  await page.getByRole('searchbox', { name: 'Search events' }).fill('poolside');
  await expect(page.getByRole('article')).toHaveCount(1);
  await page.getByRole('searchbox', { name: 'Search events' }).fill('');
  await page.getByRole('button', { name: 'Completed (0)' }).click();
  await expect(page.getByRole('heading', { name: 'No ceremonies match' })).toBeVisible();
  await page.getByRole('button', { name: 'Show all ceremonies' }).click();
  await expect(page.getByRole('article')).toHaveCount(2);

  // The menu leads to the ceremony's tasks.
  await page.getByRole('button', { name: 'More for Haldi' }).click();
  await page.getByRole('link', { name: 'View tasks' }).click();
  await expect(page).toHaveURL(new RegExp(`/tasks\\?eventId=${haldi}`));
  await expect(page.getByRole('article')).toHaveCount(3);
  expect(errors).toEqual([]);
});

test('another wedding’s events are simply not found', async ({ page, browser }) => {
  const theirs = await ownerAtEvents(page);
  await page.getByRole('button', { name: 'Add first ceremony' }).click();
  await page.getByRole('dialog').getByLabel(/^Name/).fill('Private Haldi');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Save ceremony/ })
    .click();
  await expect(page.getByRole('article', { name: 'Private Haldi' })).toBeVisible();

  const otherContext = await newVisitor(browser);
  const other = await otherContext.newPage();
  await ownerAtEvents(other);
  await other.goto(theirs);
  await expect(
    other.getByRole('heading', { level: 1, name: 'We couldn’t find that wedding' }),
  ).toBeVisible();
  await expect(other.locator('body')).not.toContainText('Private Haldi');
  await otherContext.close();
});
