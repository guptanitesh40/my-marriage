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

/** A verified owner with a wedding; returns the wedding's ID and Expenses address. */
async function ownerAtExpenses(page: Page) {
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
  const expenses = `${weddingPath}/expenses`;
  await page.goto(expenses);
  await expect(page.getByRole('heading', { level: 1, name: 'Expenses' })).toBeVisible();
  return { weddingId, weddingPath, expenses };
}

/** Sets up data through the API, as the signed-in owner, to keep the journeys short. */
async function apiPost(page: Page, path: string, body: object) {
  const res = await page.request.post(`/api/v1${path}`, { data: body });
  expect(res.status(), await res.text()).toBe(201);
  return ((await res.json()) as { data: { id: string } }).data.id;
}

const row = (page: Page, title: string) => page.getByRole('article', { name: title });

for (const viewport of VIEWPORTS) {
  test(`expenses, empty and with the drawer open, fit and are accessible at ${viewport.width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const errors = collectErrors(page);
    await ownerAtExpenses(page);
    await expect(
      page.getByRole('heading', { name: 'Start tracking your wedding expenses' }),
    ).toBeVisible();
    await expect(page.getByRole('region', { name: 'Expense totals' })).toHaveCount(0);
    await expectNoHorizontalScroll(page);
    await expectNoSeriousA11yIssues(page);

    await page.getByRole('button', { name: 'Add your first expense' }).click();
    const drawer = page.getByRole('dialog', { name: 'Add expense' });
    await expect(drawer.getByLabel(/^Expense name/)).toBeFocused();
    await expectNoSeriousA11yIssues(page);
    await testInfo.attach(`expenses-drawer-${viewport.width}`, {
      body: await page.screenshot(),
      contentType: 'image/png',
    });
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    expect(errors).toEqual([]);
  });
}

test('add an expense, pay part, negotiate a discount, pay a bonus, reverse a mistake', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: DESKTOP.width, height: DESKTOP.height });
  const errors = collectErrors(page);
  const { weddingId, weddingPath, expenses } = await ownerAtExpenses(page);
  const wedding = await apiPost(page, `/weddings/${weddingId}/events`, { title: 'Wedding' });
  await apiPost(page, `/weddings/${weddingId}/events`, { title: 'Sangeet' });
  await apiPost(page, `/weddings/${weddingId}/vendors`, {
    name: 'The Marigold Studio',
    category: 'Photography & Videography',
  });
  await page.reload();

  // The sidebar leads here.
  const nav = page.getByRole('navigation', { name: 'Workspace' });
  await nav.getByRole('link', { name: 'Vendors' }).click();
  await nav.getByRole('link', { name: 'Expenses & Budget' }).click();
  await expect(page).toHaveURL(expenses);

  // Add: name, category and agreed amount are required.
  await page.getByRole('button', { name: 'Add your first expense' }).click();
  const drawer = page.getByRole('dialog', { name: 'Add expense' });
  await drawer.getByRole('button', { name: 'Save expense' }).click();
  await expect(drawer.getByText('Enter an expense name.')).toBeVisible();
  await drawer.getByLabel(/^Expense name/).fill('Wedding photography package');
  await drawer.getByLabel(/^Category/).selectOption('Photography & Videography');
  await drawer.getByLabel(/^Agreed amount/).fill('80,000');
  // One photographer for two ceremonies.
  await drawer.getByText('Sangeet', { exact: true }).click();
  await drawer.getByText('Wedding', { exact: true }).click();
  await expect(drawer.getByText('For 2 ceremonies.')).toBeVisible();
  await drawer.getByLabel(/^Vendor/).selectOption({ label: 'The Marigold Studio' });
  await drawer.getByLabel(/^Payment due date/).fill('2027-02-10');
  await drawer.getByRole('button', { name: 'Save expense' }).click();

  // It opens on its details, ready for the first payment.
  const details = page.getByRole('dialog', { name: 'Wedding photography package' });
  await expect(details.getByText('No payments recorded yet.')).toBeVisible();

  // Two payments; the second is too much at first.
  await details.getByRole('button', { name: 'Record payment' }).click();
  let dialog = page.getByRole('dialog', { name: 'Record payment' });
  await dialog.getByLabel(/^Amount paid/).fill('10,000');
  await dialog.getByLabel(/^Payment method/).selectOption('Bank transfer');
  await dialog.getByLabel(/^Note/).fill('Advance');
  await dialog.getByRole('button', { name: 'Record payment' }).click();
  await expect(dialog).toBeHidden();
  await details.getByRole('button', { name: 'Record payment' }).click();
  await dialog.getByLabel(/^Amount paid/).fill('80,000');
  await dialog.getByRole('button', { name: 'Record payment' }).click();
  await expect(
    dialog.getByText('Amount can’t be more than the outstanding ₹70,000.'),
  ).toBeVisible();
  await dialog.getByLabel(/^Amount paid/).fill('20,000');
  await dialog.getByRole('button', { name: 'Record payment' }).click();
  await expect(dialog).toBeHidden();
  const amounts = details.getByRole('region', { name: 'Amounts' });
  await expect(amounts).toContainText('Paid₹30,000');
  await expect(amounts).toContainText('Outstanding₹50,000');

  // They agreed to take 10% less.
  await details.getByRole('button', { name: 'Discount or extra' }).click();
  dialog = page.getByRole('dialog', { name: 'Discount or extra' });
  await dialog.getByRole('button', { name: '10%' }).click();
  await expect(dialog.getByText(/What’s owed: ₹80,000 → ₹72,000/)).toBeVisible();
  await dialog.getByLabel(/^Note/).fill('Agreed 10% off');
  await expectNoSeriousA11yIssues(page);
  await dialog.getByRole('button', { name: 'Record discount' }).click();
  await expect(dialog).toBeHidden();
  await expect(amounts).toContainText('Owed₹72,000');
  await expect(amounts).toContainText('Outstanding₹42,000');
  await expect(amounts).toContainText('Discounts −₹8,000');

  // A payment entered by mistake, then reversed.
  await details.getByRole('button', { name: 'Record payment' }).click();
  dialog = page.getByRole('dialog', { name: 'Record payment' });
  await dialog.getByLabel(/^Amount paid/).fill('5,000');
  await dialog.getByRole('button', { name: 'Record payment' }).click();
  await expect(dialog).toBeHidden();
  await details.getByRole('button', { name: /^Reverse\s*payment of ₹5,000/ }).click();
  dialog = page.getByRole('dialog', { name: 'Reverse this entry?' });
  await expect(dialog).toContainText('Paid goes from ₹35,000 to ₹30,000');
  await dialog.getByLabel(/^Reason/).fill('Entered by mistake');
  await dialog.getByRole('button', { name: 'Reverse' }).click();
  await expect(dialog).toBeHidden();
  await expect(details.getByText('Reversed', { exact: true })).toBeVisible();
  await expect(amounts).toContainText('Paid₹30,000');

  // Paid in full, then a bonus for great work.
  await details.getByRole('button', { name: 'Record payment' }).click();
  dialog = page.getByRole('dialog', { name: 'Record payment' });
  await dialog.getByLabel(/^Amount paid/).fill('42,000');
  await dialog.getByRole('button', { name: 'Record payment' }).click();
  await expect(details.getByText(/Paid in full: nothing left to pay/)).toBeVisible();
  await expect(details.getByRole('button', { name: 'Record payment' })).toBeDisabled();
  await details.getByRole('button', { name: 'Discount or extra' }).click();
  dialog = page.getByRole('dialog', { name: 'Discount or extra' });
  await dialog.getByText('Extra', { exact: true }).click();
  await dialog.getByLabel(/^Extra \(₹\)/).fill('5,000');
  await dialog.getByLabel(/^Note/).fill('Bonus for the album');
  await dialog.getByRole('button', { name: 'Record extra' }).click();
  await expect(dialog).toBeHidden();
  await expect(amounts).toContainText('Outstanding₹5,000');
  await testInfo.attach('expenses-details-1280', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });

  // Edit: the agreed amount can't drop below what has been paid.
  await details.getByRole('button', { name: 'Edit expense' }).click();
  await details.getByLabel(/^Agreed amount/).fill('70,000');
  await details.getByRole('button', { name: 'Save changes' }).click();
  await expect(details.getByText(/can’t be less than ₹75,000/)).toBeVisible();
  await details.getByRole('button', { name: 'Cancel' }).click();
  await page.keyboard.press('Escape');

  // The list and its totals.
  const expense = row(page, 'Wedding photography package');
  await expect(expense).toContainText('Partially paid');
  await expect(expense).toContainText('agreed ₹80,000');
  const totals = page.getByRole('region', { name: 'Expense totals' });
  await expect(totals).toContainText('₹77,000');
  await expect(totals).toContainText('Saved by negotiation₹8,000');
  await expect(totals).toContainText('₹5,000 paid in extras');

  // A second, overdue expense, then the filters.
  await apiPost(page, `/weddings/${weddingId}/expenses`, {
    title: 'Wedding catering',
    category: 'Catering',
    amountPaise: 15000000,
    dueDate: '2026-01-05',
  });
  await page.reload();
  await expect(row(page, 'Wedding catering')).toContainText('Overdue');
  await page
    .getByRole('group', { name: 'Payment status' })
    .getByRole('button', { name: /Overdue/ })
    .click();
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page).toHaveURL(/status=overdue/);
  await page
    .getByRole('group', { name: 'Filters' })
    .getByLabel('Vendor')
    .selectOption({ label: 'The Marigold Studio' });
  await expect(page.getByRole('heading', { name: 'No matching expenses' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).last().click();
  await expect(page.getByRole('article')).toHaveCount(2);
  await testInfo.attach('expenses-list-1280', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
  await expectNoSeriousA11yIssues(page);

  // From the ceremony on the Events page to its expenses.
  await page.goto(`${weddingPath}/events`);
  await page.getByRole('button', { name: 'More for Wedding' }).click();
  await page.getByRole('link', { name: 'View expenses' }).click();
  await expect(page).toHaveURL(new RegExp(`/expenses\\?eventId=${wedding}`));
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(row(page, 'Wedding photography package')).toContainText('Wedding, Sangeet');

  // An owner deletes the other expense; it leaves the list and the totals.
  await page.goto(expenses);
  await row(page, 'Wedding catering')
    .getByRole('button', { name: /View details/ })
    .click();
  const catering = page.getByRole('dialog', { name: 'Wedding catering' });
  await catering.getByRole('button', { name: 'Delete' }).click();
  const confirm = page.getByRole('dialog', { name: 'Delete Wedding catering?' });
  await expect(confirm.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await confirm.getByRole('button', { name: 'Delete' }).click();
  await expect(confirm).toBeHidden();
  await expect(
    page.getByRole('status').filter({ hasText: 'Wedding catering was deleted.' }),
  ).toBeAttached();
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('region', { name: 'Expense totals' })).toContainText(
    'Across 1 expense',
  );
  expect(errors).toEqual([]);
});

test('on a phone the expenses read as cards and the dialogs fit', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: PHONE.width, height: PHONE.height });
  const { weddingId } = await ownerAtExpenses(page);
  const id = await apiPost(page, `/weddings/${weddingId}/expenses`, {
    title: 'Shree Ganesh Tent, Light & Sound Decorators — full wedding package',
    category: 'Decoration',
    amountPaise: 125000050,
  });
  await apiPost(page, `/weddings/${weddingId}/expenses/${id}/payments`, {
    amountPaise: 50000000,
    paidAt: '2026-11-01',
  });
  await page.reload();
  const card = row(page, 'Shree Ganesh Tent, Light & Sound Decorators — full wedding package');
  await expect(card).toContainText('₹12,50,000.50');
  await expect(card).toContainText('₹7,50,000.50');
  await expectNoHorizontalScroll(page);
  await expectNoSeriousA11yIssues(page);
  await testInfo.attach('expenses-list-390', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });

  await card.getByRole('button', { name: /View details/ }).click();
  const details = page.getByRole('dialog', { name: /Shree Ganesh Tent/ });
  await details.getByRole('button', { name: 'Record payment' }).click();
  const dialog = page.getByRole('dialog', { name: 'Record payment' });
  await expect(dialog.getByRole('button', { name: 'Record payment' })).toBeInViewport();
  await expectNoSeriousA11yIssues(page);
  await testInfo.attach('expenses-payment-390', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
  await expectNoHorizontalScroll(page);
});

test('another wedding’s expenses are simply not found', async ({ page, browser }) => {
  const theirs = await ownerAtExpenses(page);
  await apiPost(page, `/weddings/${theirs.weddingId}/expenses`, {
    title: 'Private catering',
    category: 'Catering',
    amountPaise: 10000000,
  });

  const otherContext = await newVisitor(browser);
  const other = await otherContext.newPage();
  await ownerAtExpenses(other);
  await other.goto(theirs.expenses);
  await expect(
    other.getByRole('heading', { level: 1, name: 'We couldn’t find that wedding' }),
  ).toBeVisible();
  await expect(other.locator('body')).not.toContainText('Private catering');
  const direct = await other.request.get(`/api/v1/weddings/${theirs.weddingId}/expenses`);
  expect(direct.status()).toBe(404);
  await otherContext.close();
});

const PDF = {
  name: 'Caterer quote.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.7\n'.padEnd(400, ' ')),
};
const PNG = {
  name: 'UPI screenshot.png',
  mimeType: 'image/png',
  buffer: Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(400, 7),
  ]),
};

for (const viewport of [PHONE, DESKTOP]) {
  test(`receipts and documents go with an expense and its payments at ${viewport.width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const errors = collectErrors(page);
    await ownerAtExpenses(page);

    await page.getByRole('button', { name: 'Add your first expense' }).click();
    const drawer = page.getByRole('dialog', { name: 'Add expense' });
    await drawer.getByLabel(/^Expense name/).fill('Caterer');
    await drawer.getByLabel(/^Category/).selectOption('Catering');
    await drawer.getByLabel(/^Agreed amount/).fill('2,50,000');
    await drawer.getByLabel(/Upload receipt or document/).setInputFiles(PDF);
    await expect(drawer.getByText(/^PDF · \d+ KB$/)).toBeVisible();
    await drawer.getByRole('button', { name: 'Save expense' }).click();

    const details = page.getByRole('dialog', { name: 'Caterer' });
    const files = details.getByRole('region', { name: 'Receipts & documents' });
    const quote = details.getByRole('link', { name: /Caterer quote\.pdf/ });
    await expect(quote).toBeVisible();
    // A PDF downloads, for members only.
    const href = (await quote.getAttribute('href')) ?? '';
    const got = await page.request.get(href);
    expect(got.status()).toBe(200);
    expect(got.headers()['content-disposition']).toContain('attachment');

    await details.getByRole('button', { name: 'Record payment' }).click();
    const dialog = page.getByRole('dialog', { name: 'Record payment' });
    await dialog.getByLabel(/^Amount paid/).fill('50,000');
    await dialog.getByLabel(/Upload receipt or document/).setInputFiles(PNG);
    await expect(dialog.getByText(/^Photo · \d+ KB$/)).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoSeriousA11yIssues(page);
    await testInfo.attach(`payment-receipt-${viewport.width}`, {
      body: await page.screenshot(),
      contentType: 'image/png',
    });
    await dialog.getByRole('button', { name: 'Record payment' }).click();
    await expect(dialog).toBeHidden();

    // The payment keeps its own file, in the history.
    const history = details.getByRole('region', { name: 'Payment history' });
    await expect(history.getByRole('link', { name: /UPI screenshot\.png/ })).toBeVisible();
    await expect(files.getByRole('link')).toHaveCount(1);
    await expectNoHorizontalScroll(page);
    expect(errors).toEqual([]);
  });
}
