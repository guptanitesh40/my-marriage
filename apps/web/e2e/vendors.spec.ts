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

/** A verified owner with a wedding; returns the wedding's ID and Vendors address. */
async function ownerAtVendors(page: Page) {
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
  const vendors = `${weddingPath}/vendors`;
  await page.goto(vendors);
  await expect(page.getByRole('heading', { level: 1, name: 'Vendors' })).toBeVisible();
  return { weddingId, weddingPath, vendors };
}

/** Sets up data through the API, as the signed-in owner, to keep the journeys short. */
async function apiPost(page: Page, path: string, body: object) {
  const res = await page.request.post(`/api/v1${path}`, { data: body });
  expect(res.status(), await res.text()).toBe(201);
  return ((await res.json()) as { data: { id: string } }).data.id;
}

const vendor = (page: Page, name: string) => page.getByRole('article', { name });

for (const viewport of VIEWPORTS) {
  test(`vendors, empty and with the drawer open, fit and are accessible at ${viewport.width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const errors = collectErrors(page);
    await ownerAtVendors(page);
    await expect(
      page.getByRole('heading', { name: 'Bring your wedding team together' }),
    ).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoSeriousA11yIssues(page);

    await page.getByRole('button', { name: 'Add your first vendor' }).click();
    const drawer = page.getByRole('dialog', { name: 'Add vendor' });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByLabel(/^Vendor \/ business name/)).toBeFocused();
    await expectNoSeriousA11yIssues(page);
    await testInfo.attach(`vendors-drawer-${viewport.width}`, {
      body: await page.screenshot(),
      contentType: 'image/png',
    });
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    expect(errors).toEqual([]);
  });
}

test('add, view, edit and filter vendors linked to several ceremonies', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: DESKTOP.width, height: DESKTOP.height });
  const errors = collectErrors(page);
  const { weddingId, weddingPath, vendors } = await ownerAtVendors(page);
  const haldi = await apiPost(page, `/weddings/${weddingId}/events`, {
    title: 'Haldi',
    startDate: '2031-02-18',
  });
  await apiPost(page, `/weddings/${weddingId}/events`, {
    title: 'Sangeet',
    startDate: '2031-02-19',
  });
  await apiPost(page, `/weddings/${weddingId}/events`, {
    title: 'Wedding',
    startDate: '2031-02-20',
  });
  await page.reload();

  // The sidebar leads here.
  const nav = page.getByRole('navigation', { name: 'Workspace' });
  await nav.getByRole('link', { name: 'Tasks' }).click();
  await nav.getByRole('link', { name: 'Vendors' }).click();
  await expect(page).toHaveURL(vendors);
  await expect(nav.getByRole('link', { name: 'Vendors' })).toHaveAttribute('aria-current', 'page');

  // Only the name and category are required.
  await page.getByRole('button', { name: 'Add your first vendor' }).click();
  let drawer = page.getByRole('dialog', { name: 'Add vendor' });
  await drawer.getByRole('button', { name: 'Save vendor' }).click();
  await expect(drawer.getByText('Enter the vendor or business name.')).toBeVisible();
  await expect(drawer.getByText('Choose a service category.')).toBeVisible();
  await drawer.getByLabel(/^Vendor \/ business name/).fill('Cityline Guest Travel');
  await drawer.getByLabel(/^Service category/).selectOption('Transportation');
  await drawer.getByRole('button', { name: 'Save vendor' }).click();
  await expect(drawer).toBeHidden();
  await expect(
    page.getByRole('status').filter({ hasText: 'Cityline Guest Travel was added' }),
  ).toBeAttached();
  await expect(vendor(page, 'Cityline Guest Travel')).toContainText('No events linked');

  // One photographer, three ceremonies, one record.
  await page.getByRole('button', { name: 'Add vendor' }).click();
  drawer = page.getByRole('dialog', { name: 'Add vendor' });
  await drawer.getByLabel(/^Vendor \/ business name/).fill('The Marigold Studio');
  await drawer.getByLabel(/^Service category/).selectOption('Photography & Videography');
  await drawer.getByLabel(/^Contact person/).fill('Rohan Shah');
  await drawer.getByLabel(/^Phone number/).fill('+91 98201 44521');
  await drawer.getByLabel(/^Email address/).fill('rohan@');
  for (const ceremony of ['Haldi', 'Sangeet', 'Wedding']) {
    await drawer.getByText(ceremony, { exact: true }).click();
  }
  await drawer.getByLabel(/^Private organizer notes/).fill('Three drones; advance paid.');
  await drawer.getByRole('button', { name: 'Save vendor' }).click();
  await expect(
    drawer.getByText('Enter a valid email address, like name@example.com.'),
  ).toBeVisible();
  await drawer.getByLabel(/^Email address/).fill('rohan@marigoldstudio.in');
  await drawer.getByRole('button', { name: 'Save vendor' }).click();
  await expect(drawer).toBeHidden();
  const marigold = vendor(page, 'The Marigold Studio');
  await expect(marigold).toContainText('Rohan Shah');
  await expect(marigold).toContainText('(3 events)');
  await expect(page.getByRole('region', { name: 'Vendor summary' })).toContainText(
    'Multi-event partners1',
  );

  // Details, then edit: drop Haldi.
  await page.getByRole('button', { name: 'View details for The Marigold Studio' }).click();
  const details = page.getByRole('dialog', { name: 'The Marigold Studio' });
  await expect(details).toContainText('Assigned ceremonies (3)');
  await expect(details).toContainText('Three drones; advance paid.');
  await expect(details.getByRole('link', { name: 'rohan@marigoldstudio.in' })).toHaveAttribute(
    'href',
    'mailto:rohan@marigoldstudio.in',
  );
  await testInfo.attach('vendors-details-1280', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
  await details.getByRole('button', { name: 'Edit vendor' }).click();
  await expect(details.getByLabel(/^Vendor \/ business name/)).toHaveValue('The Marigold Studio');
  await details.getByText('Haldi', { exact: true }).click();
  await details.getByLabel(/^Phone number/).fill('');
  await details.getByRole('button', { name: 'Update vendor' }).click();
  await expect(details).toContainText('Assigned ceremonies (2)');
  await page.keyboard.press('Escape');
  await expect(marigold).toContainText('(2 events)');
  await expect(marigold).toContainText('Not added');

  // Search and filters, kept in the address.
  await page.getByRole('searchbox', { name: 'Search vendors' }).fill('rohan');
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page).toHaveURL(/q=rohan/);
  await page.getByRole('button', { name: 'Reset filters' }).click();
  await page.getByLabel('Ceremony').selectOption({ label: 'Not linked to an event' });
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(vendor(page, 'Cityline Guest Travel')).toBeVisible();
  await page.getByLabel('Ceremony').selectOption({ label: 'Haldi' });
  await expect(page.getByRole('heading', { name: 'No matching vendors found' })).toBeVisible();
  await testInfo.attach('vendors-no-results-1280', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
  await page.getByRole('button', { name: 'Clear all filters' }).click();
  await expect(page.getByRole('article')).toHaveCount(2);

  // Everything lasts after a reload; a filter in the address applies at once.
  await page.goto(`${vendors}?category=Transportation`);
  await expect(page.getByRole('article')).toHaveCount(1);
  await page.goto(vendors);
  await expect(marigold).toContainText('Sangeet');
  await expect(marigold).not.toContainText('Haldi');
  await testInfo.attach('vendors-list-1280', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
  await expectNoSeriousA11yIssues(page);

  // An owner deletes a vendor, after confirming; it stays gone after a reload.
  await page.getByRole('button', { name: 'View details for Cityline Guest Travel' }).click();
  const cityline = page.getByRole('dialog', { name: 'Cityline Guest Travel' });
  await cityline.getByRole('button', { name: 'Delete' }).click();
  const confirm = page.getByRole('dialog', { name: 'Delete Cityline Guest Travel?' });
  await expect(confirm.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await expectNoSeriousA11yIssues(page);
  await confirm.getByRole('button', { name: 'Delete' }).click();
  await expect(confirm).toBeHidden();
  await expect(cityline).toBeHidden();
  await expect(
    page.getByRole('status').filter({ hasText: 'Cityline Guest Travel was deleted.' }),
  ).toBeAttached();
  await expect(page.getByRole('article')).toHaveCount(1);
  await page.reload();
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(vendor(page, 'Cityline Guest Travel')).toHaveCount(0);

  // From a ceremony on the Events page to its vendors.
  await page.goto(`${weddingPath}/events`);
  await page.getByRole('button', { name: 'More for Haldi' }).click();
  await page.getByRole('link', { name: 'View vendors' }).click();
  await expect(page).toHaveURL(new RegExp(`/vendors\\?eventId=${haldi}`));
  await expect(page.getByRole('heading', { name: 'No matching vendors found' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('on a phone the directory reads as cards and the form sheet works', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: PHONE.width, height: PHONE.height });
  const { weddingId } = await ownerAtVendors(page);
  const ids = [];
  for (const title of ['Haldi', 'Mehendi', 'Sangeet', 'Wedding', 'Reception']) {
    ids.push(await apiPost(page, `/weddings/${weddingId}/events`, { title }));
  }
  await apiPost(page, `/weddings/${weddingId}/vendors`, {
    name: 'Shree Ganesh Tent, Light & Sound Decorators of Rajasthan',
    category: 'Decoration',
    email: 'bookings.and.enquiries@shreeganeshtentdecorators.example.in',
    eventIds: ids,
  });
  await page.reload();
  const card = vendor(page, 'Shree Ganesh Tent, Light & Sound Decorators of Rajasthan');
  await expect(card).toContainText('+2 more');
  await expectNoHorizontalScroll(page);
  await expectNoSeriousA11yIssues(page);
  await testInfo.attach('vendors-list-390', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });

  await page.getByRole('button', { name: 'Add vendor' }).focus();
  await page.keyboard.press('Enter');
  const drawer = page.getByRole('dialog', { name: 'Add vendor' });
  await expect(drawer.getByLabel(/^Vendor \/ business name/)).toBeFocused();
  await page.keyboard.type('Meera Bridal Artistry');
  await drawer.getByLabel(/^Service category/).selectOption('Makeup & Styling');
  await drawer.getByRole('button', { name: 'Save vendor' }).click();
  await expect(drawer).toBeHidden();
  await expect(vendor(page, 'Meera Bridal Artistry')).toBeVisible();
  await expectNoHorizontalScroll(page);
});

test('another wedding’s vendors are simply not found', async ({ page, browser }) => {
  const theirs = await ownerAtVendors(page);
  await apiPost(page, `/weddings/${theirs.weddingId}/vendors`, {
    name: 'Private Caterer',
    category: 'Catering',
    phone: '+91 99200 81290',
  });

  const otherContext = await newVisitor(browser);
  const other = await otherContext.newPage();
  await ownerAtVendors(other);
  await other.goto(theirs.vendors);
  await expect(
    other.getByRole('heading', { level: 1, name: 'We couldn’t find that wedding' }),
  ).toBeVisible();
  await expect(other.locator('body')).not.toContainText('Private Caterer');
  const direct = await other.request.get(`/api/v1/weddings/${theirs.weddingId}/vendors`);
  expect(direct.status()).toBe(404);
  await otherContext.close();
});
