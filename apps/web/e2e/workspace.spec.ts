import { expect } from '@playwright/test';
import {
  collectErrors,
  expectNoHorizontalScroll,
  expectNoSeriousA11yIssues,
  VIEWPORTS,
} from './support/checks';
import { createWedding, signUpVerified, WORKSPACE } from './support/journeys';
import { uniqueEmail } from './support/mail';
import { newVisitor, test } from './support/visitor';

/** Signs up a verified owner with a wedding, and returns its workspace path. */
async function ownerWithWedding(page: import('@playwright/test').Page, name: string) {
  await signUpVerified(page, uniqueEmail('owner'), name);
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
  return new URL(page.url()).pathname;
}

for (const viewport of VIEWPORTS) {
  test(`the workspace fits and is accessible at ${viewport.width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const errors = collectErrors(page);
    await ownerWithWedding(page, 'Ananya Sharma');

    await expect(page.getByRole('heading', { level: 1, name: 'Welcome, Ananya.' })).toBeVisible();
    await expect(page.getByRole('main')).toContainText(
      'Ananya & Arjun’s wedding · Jaipur, Rajasthan · 10 December 2031',
    );
    await expect(page.getByRole('banner')).toContainText('Ananya & Arjun');
    // The sidebar is for large screens; smaller ones keep sign-out in the top bar.
    const sidebar = page.getByRole('navigation', { name: 'Workspace' });
    if (viewport.width >= 1024) {
      await expect(sidebar.getByRole('link', { name: 'Overview' })).toHaveAttribute(
        'aria-current',
        'page',
      );
      await expect(sidebar.getByRole('link')).toHaveText([
        'Overview',
        'Events',
        'Tasks',
        'Guests & RSVP',
        'Expenses & Budget',
        'Vendors',
        'Wedding Website',
        'Photos & QR Drive',
      ]);
      await expect(page.getByRole('complementary')).toContainText('Owner');
    } else {
      await expect(sidebar).toBeHidden();
    }
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoSeriousA11yIssues(page);
    expect(errors).toEqual([]);

    await testInfo.attach(`workspace-${viewport.width}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
  });
}

test('another wedding’s workspace, or an address that is not one, is simply not found', async ({
  page,
  browser,
}) => {
  const theirs = await ownerWithWedding(page, 'Ananya Sharma');

  const otherContext = await newVisitor(browser);
  const other = await otherContext.newPage();
  const mine = await ownerWithWedding(other, 'Riya Kapoor');
  expect(mine).not.toBe(theirs);

  for (const path of [theirs, '/weddings/not-a-wedding', '/weddings/000000000000000000000000']) {
    await other.goto(path);
    await expect(
      other.getByRole('heading', { level: 1, name: 'We couldn’t find that wedding' }),
    ).toBeVisible();
    await expect(other.getByRole('main')).not.toContainText('Ananya');
  }
  await expectNoSeriousA11yIssues(other);
  await other.getByRole('link', { name: 'Go to your dashboard' }).click();
  await expect(other).toHaveURL(mine);
  await otherContext.close();
});

test('signed out, a workspace address asks to sign in and comes back', async ({ page }) => {
  await page.goto('/weddings/6740a1b2c3d4e5f601234567');
  await expect(page).toHaveURL('/login?next=%2Fweddings%2F6740a1b2c3d4e5f601234567');
});
