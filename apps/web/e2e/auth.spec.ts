import { expect } from '@playwright/test';
import {
  collectErrors,
  DESKTOP,
  expectNoHorizontalScroll,
  expectNoSeriousA11yIssues,
  PHONE,
  VIEWPORTS,
} from './support/checks';
import {
  createWedding,
  expectHomeLeadsTo,
  expectRedirectBeforeRender,
  PASSWORD,
  signIn,
  signUp,
} from './support/journeys';
import { linkIn, uniqueEmail, waitForEmail } from './support/mail';
import { newVisitor, test } from './support/visitor';

const AUTH_PAGES = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/invitations/accept',
];
for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.name} (${viewport.width}px)`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const path of AUTH_PAGES) {
      test(`${path} is accessible and fits the screen`, async ({ page }, testInfo) => {
        const errors = collectErrors(page);
        await page.goto(path);
        await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
        // Pages that read a link from the URL settle into their final state.
        await expect(page.getByText(/^Checking your (link|invitation)/)).toHaveCount(0);
        await expectNoHorizontalScroll(page);
        await expectNoSeriousA11yIssues(page);
        expect(errors).toEqual([]);

        await testInfo.attach(`${path.slice(1)}-${viewport.width}`, {
          body: await page.screenshot({ fullPage: true }),
          contentType: 'image/png',
        });
      });
    }
  });
}

test('sign up, verify the email, create the wedding, use the dashboard, sign out and in', async ({
  page,
}) => {
  const errors = collectErrors(page, ['/api/v1/auth/me']);
  const email = uniqueEmail();

  await page.goto('/');
  await page.getByRole('banner').getByRole('link', { name: 'Log in' }).click();
  await expect(page).toHaveURL('/login');
  await page.getByRole('link', { name: 'Create an account' }).click();
  await signUp(page, email);
  await expect(page.getByRole('main')).toContainText(email);
  await expectNoSeriousA11yIssues(page);

  // Signed in but unverified, the sign-in pages lead back to verification.
  await expectRedirectBeforeRender(page, '/login', '/verify-email');
  await expectRedirectBeforeRender(page, '/signup', '/verify-email');
  await expectHomeLeadsTo(page, 'Verify your email', '/verify-email');

  // The dashboard waits for verification.
  await page.goto('/dashboard');
  await expect(page).toHaveURL('/verify-email');

  const verification = await waitForEmail(email, /Verify your email/);
  const link = linkIn(verification);
  expect(link).toMatch(/\/verify-email#token=[A-Za-z0-9_-]{43}$/);
  await page.goto(link);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Your email is verified' }),
  ).toBeVisible();
  // The secret does not stay in the address bar or history.
  expect(new URL(page.url()).hash).toBe('');

  // Verified, with no wedding yet: every way in leads to creating one.
  await expectHomeLeadsTo(page, 'Create your wedding', '/onboarding');
  await expectRedirectBeforeRender(page, '/dashboard', '/onboarding');
  await expectRedirectBeforeRender(page, '/login', '/onboarding');
  await page.goto(link);
  await page.getByRole('link', { name: 'Create your wedding' }).click();
  await expect(page).toHaveURL('/onboarding');
  await createWedding(page, {
    bride: 'Priya',
    groom: 'Rahul',
    city: 'Udaipur',
    state: 'Rajasthan',
  });
  await page.getByRole('link', { name: 'I’ll do this later' }).click();

  await expect(page).toHaveURL('/dashboard');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Welcome, Priya Sharma' }),
  ).toBeVisible();
  await expect(page.getByRole('main')).toContainText(email);
  await expect(page.getByRole('main')).toContainText('Priya & Rahul, Udaipur, Rajasthan');
  await expectNoSeriousA11yIssues(page);

  // Signed in, "Log in" goes straight to the dashboard.
  await expectRedirectBeforeRender(page, '/login', '/dashboard');
  await expectRedirectBeforeRender(page, '/signup', '/dashboard');
  // …or where a sign-in link asked to return to, as the login form would,
  // but never to another site.
  await page.goto('/login?next=%2Fdashboard%3Ftab%3Dguests');
  await expect(page).toHaveURL('/dashboard?tab=guests');
  await page.goto('/login?next=%2F%2Fevil.example');
  await expect(page).toHaveURL('/dashboard');
  // The homepage header leads back in instead of offering to sign in.
  await expectHomeLeadsTo(page, 'Go to dashboard', '/dashboard');
  await page.getByRole('banner').getByRole('link', { name: 'Go to dashboard' }).click();
  await expect(page).toHaveURL('/dashboard');

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('banner').getByRole('link', { name: 'Log in' })).toBeVisible();
  await page.goto('/dashboard');
  await expect(page).toHaveURL('/login?next=%2Fdashboard');

  await signIn(page, email, PASSWORD);
  await expect(page).toHaveURL('/dashboard');
  expect(errors).toEqual([]);
});

test('an expired session cookie shows the sign-in page, and is removed', async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([
    { name: 'mm_session', value: 'expiredSessionTokenAAAAAAAAAAAAAAAAAAAAAAA', url: baseURL },
  ]);
  const errors = collectErrors(page);
  await page.goto('/login');
  await expect(page.getByRole('heading', { level: 1, name: 'Welcome back' })).toBeVisible();
  expect((await context.cookies()).map((cookie) => cookie.name)).not.toContain('mm_session');
  expect(errors).toEqual([]);
});

test('sign-in problems are explained, beside the field or in one alert', async ({ page }) => {
  await page.setViewportSize({ width: PHONE.width, height: PHONE.height });
  await page.goto('/login');

  await page.getByRole('button', { name: 'Sign in' }).click();
  const email = page.getByLabel('Email address');
  await expect(email).toHaveAttribute('aria-invalid', 'true');
  await expect(email).toBeFocused();
  await expect(page.getByText('Enter your password.')).toBeVisible();
  await expectNoSeriousA11yIssues(page);

  await signIn(page, uniqueEmail('nobody'), 'not the right password');
  // Inside the page: Next.js has its own (empty) role="alert" route announcer.
  const alert = page.getByRole('main').getByRole('alert');
  await expect(alert).toContainText('Unable to sign in');
  await expect(alert).toContainText('Incorrect email or password');
  await expect(alert).toBeFocused();
  await expectNoHorizontalScroll(page);
  await expectNoSeriousA11yIssues(page);
});

test('the password can be shown, and hidden again', async ({ page }) => {
  await page.goto('/login');
  const password = page.getByLabel('Password', { exact: true });
  await password.fill('secret words here');
  const toggle = page.getByRole('button', { name: 'Show password' });
  await toggle.click();
  await expect(password).toHaveAttribute('type', 'text');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await toggle.click();
  await expect(password).toHaveAttribute('type', 'password');
});

test('reset a forgotten password; every other device is signed out', async ({ browser }) => {
  const email = uniqueEmail('reset');
  const laptop = await newVisitor(browser);
  const laptopPage = await laptop.newPage();
  await signUp(laptopPage, email);

  const phone = await newVisitor(browser, {
    viewport: { width: PHONE.width, height: PHONE.height },
  });
  const page = await phone.newPage();
  // The weak password below is refused (400) on purpose.
  const errors = collectErrors(page, ['/api/v1/auth/password/reset']);
  await page.goto('/login');
  await page.getByRole('link', { name: 'Forgot password?' }).click();
  await expect(page).toHaveURL('/forgot-password');
  await page.getByLabel('Email address').fill(email);
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByRole('status')).toContainText('Check your email');
  await expectNoSeriousA11yIssues(page);

  const link = linkIn(await waitForEmail(email, /Reset your/));
  await page.goto(link);
  await expect(page).toHaveURL('/reset-password');
  const field = page.getByLabel('New password', { exact: true });
  const confirm = page.getByLabel('Confirm new password');
  await field.fill('Password@123');
  await confirm.fill('Password@123');
  await page.getByRole('button', { name: 'Save new password' }).click();
  await expect(page.getByText(/too easy to guess/)).toBeVisible();
  await expect(field).toBeFocused();

  await field.fill('sangeet in the ballroom');
  await confirm.fill('sangeet in the ballroom');
  await page.getByRole('button', { name: 'Save new password' }).click();
  await expect(page.getByRole('status')).toContainText('Your password is changed');
  await expectNoSeriousA11yIssues(page);

  await page.getByRole('link', { name: 'Sign in', exact: true }).click();
  await signIn(page, email, 'sangeet in the ballroom');
  // Completing the reset proved the inbox, so the account is now verified,
  // and with no wedding yet it goes on to create one.
  await expect(page).toHaveURL('/onboarding');
  expect(errors).toEqual([]);

  // The laptop's session ended with the reset.
  expect((await laptopPage.request.get('/api/v1/auth/me')).status()).toBe(401);
  await waitForEmail(email, /password was changed/);

  await laptop.close();
  await phone.close();
});

test('every link on the account pages resolves', async ({ page, request }) => {
  await page.setViewportSize({ width: DESKTOP.width, height: DESKTOP.height });
  const checked = new Set<string>();
  for (const path of AUTH_PAGES) {
    await page.goto(path);
    await expect(page.getByText(/^Checking your (link|invitation)/)).toHaveCount(0);
    const hrefs = await page
      .locator('a[href]')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
    for (const href of hrefs) {
      expect(href, `external or empty link on ${path}`).toMatch(/^\/(?!\/)/);
      if (checked.has(href)) continue;
      checked.add(href);
      const response = await request.get(href);
      expect(response.status(), `${href} (linked from ${path})`).toBe(200);
    }
  }
});
