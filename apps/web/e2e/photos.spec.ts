import { expect, type Page } from '@playwright/test';
import {
  collectErrors,
  expectNoHorizontalScroll,
  expectNoSeriousA11yIssues,
  PHONE,
  VIEWPORTS,
} from './support/checks';
import { createWedding, signUpVerified, WORKSPACE } from './support/journeys';
import { uniqueEmail } from './support/mail';
import { newVisitor, test } from './support/visitor';

/** A verified owner with a wedding and two ceremonies; returns its Photos address. */
async function ownerAtPhotos(page: Page) {
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
  for (const event of [
    { title: 'Mehendi', startDate: '2030-02-12', venue: { name: 'Royal Courtyard' } },
    { title: 'Haldi', startDate: '2030-02-11' },
  ]) {
    const res = await page.request.post(`/api/v1${weddingPath}/events`, { data: event });
    expect(res.status(), await res.text()).toBe(201);
  }
  const photos = `${weddingPath}/photos`;
  await page.goto(photos);
  await expect(page.getByRole('heading', { level: 1, name: 'Photos & Albums' })).toBeVisible();
  return { weddingPath, photos };
}

const card = (page: Page, title: string) =>
  page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: title }) });

for (const viewport of VIEWPORTS) {
  test(`photos page fits and is accessible at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const errors = collectErrors(page);
    await ownerAtPhotos(page);
    await expect(page.getByRole('heading', { name: 'Haldi' })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoSeriousA11yIssues(page);
    await testInfo.attach(`photos-${viewport.width}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });

    await page.getByRole('button', { name: 'Create album' }).click();
    await expect(page.getByRole('dialog', { name: 'Create new album' })).toBeVisible();
    await expectNoSeriousA11yIssues(page);
    await page.keyboard.press('Escape');
    expect(errors).toEqual([]);
  });
}

test('every ceremony has an album, in order, beside the general one', async ({ page }) => {
  await ownerAtPhotos(page);
  const titles = page.getByRole('list').getByRole('heading', { level: 3 });
  await expect(titles).toHaveText(['Haldi', 'Mehendi', 'General Collection']);
  await expect(card(page, 'Mehendi')).toContainText('Day 2 · Ceremony');
  await expect(card(page, 'Mehendi')).toContainText('12 Feb 2030 · Royal Courtyard');
  await expect(page.getByRole('progressbar', { name: 'Photo storage used' })).toHaveAttribute(
    'aria-valuenow',
    '0',
  );
  await expect(page.getByText('0 GB / 5 GB')).toBeVisible();

  await page.getByRole('button', { name: /Ceremony albums/ }).click();
  await expect(titles).toHaveText(['Haldi', 'Mehendi']);
  await expect(page).toHaveURL(/\?show=event$/);
  await page.getByRole('button', { name: /All albums/ }).click();
  await page.getByRole('searchbox', { name: 'Search albums' }).fill('general');
  await expect(titles).toHaveText(['General Collection']);
});

test('creates, renames and pauses an album', async ({ page }) => {
  const { photos } = await ownerAtPhotos(page);
  await page.getByRole('button', { name: 'Create album' }).click();
  const dialog = page.getByRole('dialog', { name: 'Create new album' });
  await dialog.getByRole('button', { name: 'Create album' }).click();
  await expect(dialog.getByText('Enter a name for the album.')).toBeVisible();
  await dialog.getByLabel('Album name').fill('Pre-Wedding Shoot');
  await dialog.getByRole('button', { name: 'Create album' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Pre-Wedding Shoot' })).toBeVisible();
  await expect(page.getByText('No photos in this album yet')).toBeVisible();

  await page.getByRole('button', { name: 'Rename' }).click();
  const rename = page.getByRole('dialog', { name: 'Rename album' });
  await rename.getByLabel('Album name').fill('Family Portraits');
  await rename.getByRole('button', { name: 'Save name' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Family Portraits' })).toBeVisible();

  const uploads = page.getByRole('switch', { name: 'Guest uploads' });
  await expect(uploads).toHaveAttribute('aria-checked', 'true');
  await uploads.click();
  await expect(uploads).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByText(/^Paused:/)).toBeVisible();

  await page.goto(photos);
  await expect(card(page, 'Family Portraits')).toContainText('Uploads paused');
});

test('an event album keeps its ceremony’s name', async ({ page }) => {
  await ownerAtPhotos(page);
  await card(page, 'Haldi')
    .getByRole('link', { name: /View album/ })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Haldi' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Rename' })).toHaveCount(0);
  await expect(page.getByText(/rename the ceremony on the Events page/)).toBeVisible();
});

/** A small real JPEG (64×48). */
const JPEG = Buffer.from(
  '/9j/2wBDAA0JCgsKCA0LCgsODg0PEyAVExISEyccHhcgLikxMC4pLSwzOko+MzZGNywtQFdBRkxOUlNSMj5aYVpQYEpRUk//2wBDAQ4ODhMREyYVFSZPNS01T09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0//wAARCAAwAEADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAH/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCAJSsAAAAAAAAAAAAAAAAAAAAAA//Z',
  'base64',
);

test('adds the couple’s photos to an album, approved without review', async ({ page }) => {
  const { photos } = await ownerAtPhotos(page);
  await card(page, 'Mehendi')
    .getByRole('link', { name: /View album/ })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Mehendi' })).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles([
    { name: 'IMG_3892_mehendi.jpg', mimeType: 'image/jpeg', buffer: JPEG },
    { name: 'Family_portrait.jpg', mimeType: 'image/jpeg', buffer: JPEG },
    { name: 'DSC_9012_raw.cr2', mimeType: 'image/x-canon-cr2', buffer: Buffer.from('raw') },
  ]);
  const list = page.getByRole('list', { name: 'Photos being uploaded' });
  await expect(list.getByText('Received', { exact: true })).toHaveCount(2);
  await expect(list.getByRole('alert')).toContainText('This file type isn’t supported');
  await expect(page.getByText('2 of 3 photos received')).toBeVisible();

  // The worker checks each photo; the album shows them as they are ready,
  // approved: the couple's own photos need no review.
  await expect(page.getByRole('img', { name: /^Photo \d/ })).toHaveCount(2, { timeout: 20_000 });
  await expect(page.getByRole('img', { name: /approved$/ })).toHaveCount(2);
  await expect(page.getByText('2 approved · 0 waiting for review')).toBeVisible();

  await page.goto(photos);
  await expect(card(page, 'Mehendi')).toContainText('2 approved');
  await expect(card(page, 'Mehendi')).not.toContainText('pending review');
});

test('selects photos, or all of them, and deletes them together', async ({ page }) => {
  await ownerAtPhotos(page);
  await card(page, 'Haldi')
    .getByRole('link', { name: /View album/ })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Haldi' })).toBeVisible();
  await page
    .locator('input[type="file"]')
    .setInputFiles(
      ['a', 'b', 'c'].map((name) => ({
        name: `${name}.jpg`,
        mimeType: 'image/jpeg',
        buffer: JPEG,
      })),
    );
  await expect(page.getByRole('img', { name: /^Photo \d/ })).toHaveCount(3, { timeout: 20_000 });

  const remove = page.getByRole('button', { name: /^Delete selected/ });
  await expect(remove).toBeDisabled();
  await page.getByRole('checkbox', { name: 'Select photo 1' }).check();
  await page.getByRole('checkbox', { name: 'Select photo 3' }).check();
  await expect(page.getByText('2 photos selected')).toBeVisible();
  await expect(remove).toHaveText('Delete selected (2)');

  // Cancelling keeps everything.
  await remove.click();
  const confirm = page.getByRole('dialog', { name: 'Delete 2 photos?' });
  await expect(confirm).toBeVisible();
  await expectNoSeriousA11yIssues(page);
  await confirm.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('img', { name: /^Photo \d/ })).toHaveCount(3);

  await page.getByRole('checkbox', { name: 'Select all (3)' }).check();
  await expect(remove).toHaveText('Delete selected (3)');
  await remove.click();
  await page
    .getByRole('dialog', { name: 'Delete 3 photos?' })
    .getByRole('button', { name: 'Delete 3 photos' })
    .click();
  await expect(page.getByText('No photos in this album yet')).toBeVisible();
});

test('a guest uploads through an album’s QR link, and the couple approves', async ({
  page,
  browser,
}) => {
  const { photos } = await ownerAtPhotos(page);
  await card(page, 'Mehendi').getByRole('button', { name: 'QR & link for Mehendi' }).click();
  const share = page.getByRole('dialog', { name: 'Share QR & upload link' });
  await expect(
    share.getByRole('img', { name: 'QR code to upload photos to Mehendi' }),
  ).toBeVisible();
  const link = await share.getByLabel('Upload link').inputValue();
  expect(link).toMatch(/\/u#t=[A-Za-z0-9_-]{43}$/);
  await expect(share.getByRole('link', { name: 'Download QR' })).toBeVisible();
  await expectNoSeriousA11yIssues(page);
  await share.getByRole('button', { name: 'Done' }).click();

  const guest = await newVisitor(browser, {
    viewport: { width: PHONE.width, height: PHONE.height },
  });
  const phone = await guest.newPage();
  const errors = collectErrors(phone);
  await phone.goto(link);
  await expect(phone).toHaveURL(/\/u$/);
  await expect(phone.getByRole('heading', { level: 1, name: /’s Mehendi$/ })).toBeVisible();
  await expect(phone.getByText('Preselected')).toBeVisible();
  await expectNoSeriousA11yIssues(phone);
  await expectNoHorizontalScroll(phone);
  await phone
    .locator('input[type="file"]')
    .setInputFiles([{ name: 'candid.jpg', mimeType: 'image/jpeg', buffer: JPEG }]);
  await phone.getByLabel(/Your name/).fill('Priya D.');
  await phone.getByRole('button', { name: 'Upload 1 photo' }).click();
  await expect(phone.getByRole('heading', { name: 'Photos received!' })).toBeVisible();
  await expect(phone.getByText('Thank you, Priya D.!')).toBeVisible();
  expect(errors).toEqual([]);
  await guest.close();

  await page.goto(`${photos}?view=review`);
  const review = page.getByRole('listitem').filter({ hasText: 'Priya D.' });
  await expect(review).toContainText('Uploaded via QR link', { timeout: 20_000 });
  await expectNoSeriousA11yIssues(page);
  await review.getByRole('button', { name: 'Approve photo by Priya D.' }).click();
  await expect(page.getByRole('heading', { name: 'All caught up' })).toBeVisible();
  await page.goto(photos);
  await expect(card(page, 'Mehendi')).toContainText('1 approved');
});

test('a link that was turned off tells the guest so', async ({ page, browser }) => {
  await ownerAtPhotos(page);
  await page.getByRole('button', { name: 'Invite photo uploads' }).click();
  const share = page.getByRole('dialog', { name: 'Invite photo uploads' });
  const link = await share.getByLabel('Upload link').inputValue();
  await expect(share.getByRole('group', { name: 'Email the link to guests' })).toBeVisible();
  await share.getByRole('button', { name: 'Turn off link' }).click();
  await share.getByRole('button', { name: 'Turn off link' }).click();
  await expect(share.getByText('There is no upload link right now.')).toBeVisible();

  const guest = await newVisitor(browser);
  const phone = await guest.newPage();
  await phone.goto(link);
  await expect(
    phone.getByRole('heading', { name: 'This upload link no longer works' }),
  ).toBeVisible();
  await guest.close();
});

test('approved photos appear in the website gallery, the same in all three designs', async ({
  page,
  browser,
}) => {
  const { weddingPath } = await ownerAtPhotos(page);
  const api = (path: string) => `/api/v1${weddingPath}${path}`;
  await card(page, 'Mehendi')
    .getByRole('link', { name: /View album/ })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Mehendi' })).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles([
    { name: 'one.jpg', mimeType: 'image/jpeg', buffer: JPEG },
    { name: 'two.jpg', mimeType: 'image/jpeg', buffer: JPEG },
  ]);
  // Both are approved at once; a hidden one stays off the website.
  await expect(page.getByRole('img', { name: /approved$/ })).toHaveCount(2, { timeout: 20_000 });
  await page.getByRole('img', { name: /^Photo 1,/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Hide from website' }).click();
  await expect(page.getByRole('img', { name: /hidden$/ })).toHaveCount(1);
  await page.keyboard.press('Escape');

  let version = 0;
  const publishAs = async (templateId: string) => {
    const saved = await page.request.patch(api('/website'), {
      data: { templateId, content: { headline: 'Welcome', faq: [] }, contentVersion: version },
    });
    expect(saved.status(), await saved.text()).toBe(200);
    version = ((await saved.json()) as { data: { contentVersion: number } }).data.contentVersion;
    const published = await page.request.post(api('/website/publish'), {
      data: { contentVersion: version },
    });
    expect(published.status(), await published.text()).toBe(200);
    return ((await published.json()) as { data: { slug: string } }).data.slug;
  };

  const visitor = await newVisitor(browser);
  const site = await visitor.newPage();
  for (const design of ['traditional', 'modern', 'royal']) {
    const slug = await publishAs(design);
    await site.goto(`/w/${slug}#gallery`);
    const gallery = site.getByRole('region', { name: 'Gallery' });
    await expect(gallery).toBeVisible();
    await expect(gallery.getByRole('img', { name: /^Mehendi photo/ })).toHaveCount(1);
    await expect(site.getByRole('navigation', { name: 'Website sections' })).toContainText(
      'Gallery',
    );
    await expectNoSeriousA11yIssues(site);
    await gallery.getByRole('button', { name: 'Mehendi photo 1 of 1' }).click();
    await expect(site.getByRole('dialog', { name: 'Mehendi photo' })).toBeVisible();
    await site.keyboard.press('Escape');
  }
  await visitor.close();
});
