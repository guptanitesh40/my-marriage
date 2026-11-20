import { expect, type Page } from '@playwright/test';
import { linkIn, waitForEmail } from './mail';

export const PASSWORD = 'mehendi at the haveli';

/** A wedding's workspace, where `/dashboard` leads. */
export const WORKSPACE = /\/weddings\/[0-9a-f]{24}$/;

/** Signs up through the form and waits for the verification screen. */
export async function signUp(page: Page, email: string, name = 'Priya Sharma') {
  await page.goto('/signup');
  await page.getByLabel('Your name').fill(name);
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL('/verify-email');
  await expect(page.getByRole('heading', { level: 1, name: 'Check your inbox' })).toBeVisible();
}

/** Opens the emailed verification link and waits until the address is verified. */
export async function verifyFromEmail(page: Page, email: string) {
  await page.goto(linkIn(await waitForEmail(email, /Verify your email/)));
  await expect(
    page.getByRole('heading', { level: 1, name: 'Your email is verified' }),
  ).toBeVisible();
}

/** A new, verified, signed-in account with no wedding yet. */
export async function signUpVerified(page: Page, email: string, name?: string) {
  await signUp(page, email, name);
  await verifyFromEmail(page, email);
}

export async function signIn(page: Page, email: string, password: string) {
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  // Enter submits, as people expect.
  await page.getByLabel('Password', { exact: true }).press('Enter');
}

/** Fills onboarding step 1 and waits for step 2. */
export async function createWedding(
  page: Page,
  details: { bride: string; groom: string; city: string; state: string; date?: string },
) {
  await page.getByLabel('Bride’s name').fill(details.bride);
  await page.getByLabel('Groom’s name').fill(details.groom);
  await page.getByLabel('City').fill(details.city);
  await page.getByLabel('State').selectOption(details.state);
  if (details.date) await page.getByLabel('Wedding date').fill(details.date);
  await page.getByRole('button', { name: 'Create wedding workspace' }).click();
  await expect(page).toHaveURL('/onboarding/partner');
}

/**
 * Visits `from` and expects HTTP redirects (one or more) to `to`: the
 * browser never receives `from`, so nothing of it flashes on screen first.
 */
export async function expectRedirectBeforeRender(page: Page, from: string, to: string | RegExp) {
  const response = await page.goto(from);
  let first = response?.request();
  while (first?.redirectedFrom()) first = first.redirectedFrom() ?? undefined;
  expect(first && first !== response?.request(), `${from} redirects`).toBe(true);
  expect(first && new URL(first.url()).pathname + new URL(first.url()).search).toBe(from);
  await expect(page).toHaveURL(to);
}

/**
 * On the homepage, the header offers only `label`, and every "Start planning
 * free" button leads straight to `href`.
 */
export async function expectHomeLeadsTo(page: Page, label: string, href: string) {
  await page.goto('/');
  const header = page.getByRole('banner');
  await expect(header.getByRole('link', { name: label })).toHaveAttribute('href', href);
  await expect(header.getByRole('link', { name: 'Log in' })).toHaveCount(0);
  await expect(header.getByRole('link', { name: 'Start planning free' })).toHaveCount(0);
  const starts = page.getByRole('main').getByRole('link', { name: 'Start planning free' });
  await expect(starts).toHaveCount(2);
  for (const start of await starts.all()) await expect(start).toHaveAttribute('href', href);
}
