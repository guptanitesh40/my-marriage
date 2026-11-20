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

/** A verified owner with a wedding; returns the wedding's ID and Tasks address. */
async function ownerAtTasks(page: Page) {
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
  const tasks = `${weddingPath}/tasks`;
  await page.goto(tasks);
  await expect(page.getByRole('heading', { level: 1, name: 'Tasks' })).toBeVisible();
  return { weddingId, tasks };
}

/** Sets up data through the API, as the signed-in owner, to keep the journeys short. */
async function apiPost(page: Page, path: string, body: object) {
  const res = await page.request.post(`/api/v1${path}`, { data: body });
  expect(res.status(), await res.text()).toBe(201);
  return ((await res.json()) as { data: { id: string } }).data.id;
}

const task = (page: Page, title: string) => page.getByRole('article', { name: title });

for (const viewport of VIEWPORTS) {
  test(`tasks, empty and with the drawer open, fit and are accessible at ${viewport.width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const errors = collectErrors(page);
    await ownerAtTasks(page);
    await expect(page.getByRole('heading', { name: 'Let’s get your plans moving' })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoSeriousA11yIssues(page);

    await page.getByRole('button', { name: 'Add your first task' }).click();
    const drawer = page.getByRole('dialog', { name: 'Add task' });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByLabel(/^Task name/)).toBeFocused();
    await expectNoSeriousA11yIssues(page);
    await testInfo.attach(`tasks-drawer-${viewport.width}`, {
      body: await page.screenshot(),
      contentType: 'image/png',
    });
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    expect(errors).toEqual([]);
  });
}

test('add, edit and complete tasks; views, filters and search narrow the list', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: DESKTOP.width, height: DESKTOP.height });
  const errors = collectErrors(page);
  const { weddingId, tasks } = await ownerAtTasks(page);
  await apiPost(page, `/weddings/${weddingId}/events`, { title: 'Haldi' });
  await apiPost(page, `/weddings/${weddingId}/tasks`, {
    title: 'Pay the tent deposit',
    dueDate: '2020-12-01',
    priority: 'high',
  });
  await page.reload();

  // The sidebar leads here and marks Tasks as the current section.
  const nav = page.getByRole('navigation', { name: 'Workspace' });
  await nav.getByRole('link', { name: 'Overview' }).click();
  await nav.getByRole('link', { name: 'Tasks' }).click();
  await expect(page).toHaveURL(tasks);
  await expect(nav.getByRole('link', { name: 'Tasks' })).toHaveAttribute('aria-current', 'page');

  // Add a task with an event, an assignee, a due day and time.
  await page.getByRole('button', { name: 'Add task' }).click();
  const drawer = page.getByRole('dialog', { name: 'Add task' });
  await drawer.getByLabel(/^Task name/).fill('Book Haldi decorator');
  await drawer.getByLabel(/^Description/).fill('Marigold strings and floral seating.');
  await drawer.getByLabel(/^Event/).selectOption({ label: 'Haldi' });
  await drawer.getByLabel(/^Assign to/).selectOption({ label: 'Ananya Sharma (Owner)' });
  await drawer.getByLabel(/^Due date/).fill('2031-12-08');
  await drawer.getByLabel(/^Time/).fill('14:00');
  await drawer.getByText('High', { exact: true }).click();
  await drawer.getByRole('button', { name: 'Create task' }).click();
  await expect(drawer).toBeHidden();
  await expect(
    page.getByRole('status').filter({ hasText: 'Book Haldi decorator was added' }),
  ).toBeAttached();
  const decorator = task(page, 'Book Haldi decorator');
  await expect(decorator).toContainText('Haldi');
  await expect(decorator).toContainText('Ananya');
  await expect(decorator).toContainText('8 Dec 2031, 2:00 pm');
  await expect(decorator).toContainText('High');

  // Overdue and general, unassigned tasks are shown as such.
  const deposit = task(page, 'Pay the tent deposit');
  await expect(deposit).toContainText('Overdue');
  await expect(deposit).toContainText('General');
  await expect(deposit).toContainText('Unassigned');
  const summary = page.getByRole('region', { name: 'Task summary' });
  await expect(summary).toContainText('Overdue1');

  // Edit: the drawer starts from the task as it is.
  await page.getByRole('button', { name: 'Edit Book Haldi decorator' }).click();
  const editing = page.getByRole('dialog', { name: 'Edit task' });
  await expect(editing.getByLabel(/^Task name/)).toHaveValue('Book Haldi decorator');
  await expect(editing.getByLabel(/^Time/)).toHaveValue('14:00');
  await editing.getByText('In Progress', { exact: true }).click();
  await editing.getByRole('button', { name: 'Save changes' }).click();
  await expect(editing).toBeHidden();
  await expect(decorator).toContainText('In Progress');

  // Quick completion from the list.
  await page.getByRole('button', { name: 'Completed: Pay the tent deposit' }).click();
  await expect(
    page.getByRole('button', { name: 'Completed: Pay the tent deposit' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(deposit).toContainText('Completed');
  await expect(deposit).not.toContainText('Overdue');

  // Views, filters and search, kept in the address.
  const views = page.getByRole('group', { name: 'Views' });
  await views.getByRole('button', { name: /Completed/ }).click();
  await expect(page).toHaveURL(/view=completed/);
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(task(page, 'Pay the tent deposit')).toBeVisible();
  await views.getByRole('button', { name: /My Tasks/ }).click();
  await expect(page).toHaveURL(/view=mine/);
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(task(page, 'Book Haldi decorator')).toBeVisible();
  await views.getByRole('button', { name: /All/ }).click();
  await page
    .getByRole('group', { name: 'Filters' })
    .getByLabel('Event')
    .selectOption({ label: 'General' });
  await expect(page).toHaveURL(/eventId=none/);
  await expect(page).not.toHaveURL(/view=/);
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(task(page, 'Pay the tent deposit')).toBeVisible();
  await page
    .getByRole('group', { name: 'Filters' })
    .getByLabel('Event')
    .selectOption({ label: 'Event: All events' });
  await page.getByRole('searchbox', { name: 'Search tasks' }).fill('marigold');
  await expect(page).toHaveURL(/q=marigold/);
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(task(page, 'Book Haldi decorator')).toBeVisible();

  // Nothing matching: a no-results state, then back to everything.
  await page.getByRole('searchbox', { name: 'Search tasks' }).fill('fireworks');
  await expect(page.getByRole('heading', { name: 'No tasks match your filters' })).toBeVisible();
  await testInfo.attach('tasks-no-results-1280', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
  await page.getByRole('link', { name: 'Clear all filters' }).click();
  await expect(page.getByRole('article')).toHaveCount(2);
  await expect(page.getByRole('searchbox', { name: 'Search tasks' })).toHaveValue('');

  // Everything lasts after a reload.
  await page.reload();
  await expect(task(page, 'Book Haldi decorator')).toContainText('In Progress');
  await expect(task(page, 'Pay the tent deposit')).toContainText('Completed');
  await testInfo.attach('tasks-list-1280', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
  await expectNoSeriousA11yIssues(page);
  expect(errors).toEqual([]);
});

test('on a phone the list reads as cards and the drawer works with the keyboard', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: PHONE.width, height: PHONE.height });
  const { weddingId } = await ownerAtTasks(page);
  await apiPost(page, `/weddings/${weddingId}/tasks`, {
    title: 'Arrange guest airport transport for relatives arriving early',
    description: 'Fourteen cars across two days.',
  });
  await page.reload();
  await expect(
    task(page, 'Arrange guest airport transport for relatives arriving early'),
  ).toBeVisible();
  await expectNoHorizontalScroll(page);
  await expectNoSeriousA11yIssues(page);
  await testInfo.attach('tasks-list-390', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });

  await page.getByRole('button', { name: 'Add task' }).focus();
  await page.keyboard.press('Enter');
  const drawer = page.getByRole('dialog', { name: 'Add task' });
  await expect(drawer.getByLabel(/^Task name/)).toBeFocused();
  await drawer.getByRole('button', { name: 'Create task' }).click();
  await expect(drawer.getByText('Enter what needs to be done.')).toBeVisible();
  await expect(drawer.getByLabel(/^Task name/)).toBeFocused();
  await page.keyboard.type('Confirm mehendi artist');
  await page.keyboard.press('Enter');
  await expect(drawer).toBeHidden();
  await expect(task(page, 'Confirm mehendi artist')).toBeVisible();
  await expectNoHorizontalScroll(page);
});

test('another wedding’s tasks are simply not found', async ({ page, browser }) => {
  const theirs = await ownerAtTasks(page);
  await apiPost(page, `/weddings/${theirs.weddingId}/tasks`, { title: 'Private hampers' });

  const otherContext = await newVisitor(browser);
  const other = await otherContext.newPage();
  await ownerAtTasks(other);
  await other.goto(theirs.tasks);
  await expect(
    other.getByRole('heading', { level: 1, name: 'We couldn’t find that wedding' }),
  ).toBeVisible();
  await expect(other.locator('body')).not.toContainText('Private hampers');
  const direct = await other.request.get(`/api/v1/weddings/${theirs.weddingId}/tasks`);
  expect(direct.status()).toBe(404);
  await otherContext.close();
});
