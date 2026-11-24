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
import { test } from './support/visitor';

/** A verified owner with a wedding, on its Settings page, reached from the menu. */
async function ownerAtSettings(page: Page) {
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
  // The sidebar is for large screens; smaller ones open the sections from the Menu button.
  if ((page.viewportSize()?.width ?? 0) >= 1024) {
    await page
      .getByRole('navigation', { name: 'Workspace' })
      .getByRole('link', { name: 'Settings' })
      .click();
  } else {
    await page.getByRole('button', { name: 'Menu' }).click();
    await page
      .getByRole('dialog', { name: 'Menu' })
      .getByRole('link', { name: 'Settings' })
      .click();
  }
  await expect(page).toHaveURL(`${weddingPath}/settings`);
  await expect(page.getByRole('heading', { level: 1, name: 'Wedding settings' })).toBeVisible();
  return { weddingPath, settings: `${weddingPath}/settings` };
}

const details = (page: Page) => page.getByRole('form', { name: 'General information' });

for (const viewport of VIEWPORTS) {
  test(`settings fit and are accessible at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const errors = collectErrors(page);
    await ownerAtSettings(page);
    await expect(details(page)).toContainText('Ananya & Arjun’s Wedding');
    await expectNoHorizontalScroll(page);
    await expectNoSeriousA11yIssues(page);
    await page.getByRole('button', { name: 'Archive wedding' }).click();
    await expect(page.getByRole('dialog', { name: /Archive Ananya & Arjun/ })).toBeVisible();
    await expectNoSeriousA11yIssues(page);
    await expectNoHorizontalScroll(page);
    await testInfo.attach(`settings-${viewport.width}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
    expect(errors).toEqual([]);
  });
}

test('an owner saves the details, keeps what was typed after a refusal, and sees who saved', async ({
  page,
}) => {
  const { weddingPath } = await ownerAtSettings(page);
  // The bad map link is refused by the API on purpose (400).
  const errors = collectErrors(page, [`/api/v1${weddingPath}`]);
  const form = details(page);

  await form.getByLabel('Bride’s name').fill('Ananya R.');
  await expect(form).toContainText('Ananya R. & Arjun’s Wedding');
  await expect(page.getByRole('status').filter({ hasText: 'unsaved' })).toBeVisible();
  await form.getByLabel('Main venue').fill('Rambagh Palace');
  await form.getByLabel('Venue address').fill('Bhawani Singh Road, Jaipur');
  await form.getByLabel('Google Maps link').fill('https://example.com/not-a-map');
  await form.getByLabel('Description').fill('Two families, one celebration.');
  await expect(form).toContainText('30 / 500');
  await form.getByRole('button', { name: 'Save changes' }).click();

  await expect(form.getByText('Paste a Google Maps link')).toBeVisible();
  await expect(form.getByLabel('Main venue')).toHaveValue('Rambagh Palace');
  await expect(form.getByLabel('Description')).toHaveValue('Two families, one celebration.');

  await form.getByLabel('Google Maps link').fill('https://maps.app.goo.gl/AbCdEf123');
  await form.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Changes saved' })).toBeVisible();
  await expect(page.getByRole('main')).toContainText('Last saved by Ananya Sharma');
  await expect(page.getByRole('banner')).toContainText('Ananya R. & Arjun');

  await page.reload();
  await expect(details(page).getByLabel('Main venue')).toHaveValue('Rambagh Palace');
  await expect(details(page).getByRole('link', { name: 'Test link' })).toHaveAttribute(
    'href',
    'https://maps.app.goo.gl/AbCdEf123',
  );
  expect(errors).toEqual([]);
});

test('discard puts the saved details back', async ({ page }) => {
  await ownerAtSettings(page);
  const form = details(page);
  await form.getByLabel('City').fill('Udaipur');
  await form.getByRole('button', { name: 'Discard' }).click();
  await expect(form.getByLabel('City')).toHaveValue('Jaipur');
  await expect(form.getByRole('button', { name: 'Discard' })).toBeDisabled();
});

test('an owner archives on a phone after typing ARCHIVE, and the wedding becomes read-only', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: PHONE.width, height: PHONE.height });
  const { weddingPath } = await ownerAtSettings(page);

  await page.getByRole('button', { name: 'Archive wedding' }).click();
  const dialog = page.getByRole('dialog', { name: /Archive Ananya & Arjun/ });
  const confirm = dialog.getByRole('button', { name: 'Archive wedding' });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel(/Type ARCHIVE to confirm/).fill('archive');
  await confirm.click();
  await expect(dialog).toBeHidden();

  await expect(
    page.getByRole('heading', { name: 'This wedding is archived and read-only' }),
  ).toBeVisible();
  await expect(details(page).getByLabel('City')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Save changes' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Archive wedding' })).toHaveCount(0);
  await expect(page.getByRole('banner')).toContainText('Archived');
  await expectNoHorizontalScroll(page);
  await testInfo.attach('settings-archived-360', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });

  // Planning elsewhere is read-only too.
  await page.goto(`${weddingPath}/team`);
  await expect(page.getByRole('main')).toContainText('read-only');
});

test('a deletion request takes the wedding offline until an owner cancels it', async ({
  page,
}, testInfo) => {
  await ownerAtSettings(page);

  await page.getByRole('button', { name: 'Request deletion' }).click();
  const dialog = page.getByRole('dialog', { name: /Delete Ananya & Arjun/ });
  await expect(dialog).toContainText('Nothing is erased yet');
  await dialog.getByLabel(/Type DELETE to confirm/).fill('DELETE');
  await dialog.getByRole('button', { name: 'Request deletion' }).click();
  await expect(dialog).toBeHidden();

  await expect(
    page.getByRole('heading', { name: 'This wedding is waiting to be deleted' }),
  ).toBeVisible();
  await expect(page.getByRole('main')).toContainText('Requested by Ananya Sharma');
  await expect(details(page).getByLabel('City')).toBeDisabled();
  await expect(page.getByRole('banner')).toContainText('Deletion pending');
  await testInfo.attach('settings-deletion-pending', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });

  await page.getByRole('button', { name: 'Cancel deletion request' }).click();
  await expect(
    page.getByRole('heading', { name: 'This wedding is waiting to be deleted' }),
  ).toBeHidden();
  await expect(details(page).getByLabel('City')).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Request deletion' })).toBeVisible();
});
