import { expect } from '@playwright/test';
import {
  collectErrors,
  expectNoHorizontalScroll,
  expectNoSeriousA11yIssues,
  PHONE,
  VIEWPORTS,
} from './support/checks';
import {
  createWedding,
  expectRedirectBeforeRender,
  signUp,
  signUpVerified,
  WORKSPACE,
} from './support/journeys';
import { linkIn, uniqueEmail, waitForEmail } from './support/mail';
import { newVisitor, test } from './support/visitor';

for (const viewport of VIEWPORTS) {
  test(`onboarding steps are accessible and fit at ${viewport.width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await signUpVerified(page, uniqueEmail('onboarding'));
    const errors = collectErrors(page);

    await page.goto('/onboarding');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Let’s start your wedding' }),
    ).toBeVisible();
    await expect(page.getByText('Step 1 of 3 · Your wedding')).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoSeriousA11yIssues(page);
    await testInfo.attach(`onboarding-step-1-${viewport.width}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });

    await createWedding(page, {
      bride: 'Ananya',
      groom: 'Arjun',
      city: 'Jaipur',
      state: 'Rajasthan',
      date: '2099-12-10',
    });
    await expect(page.getByRole('status')).toContainText('Ananya & Arjun’s wedding is created.');
    await expect(page.getByRole('status')).toContainText('Jaipur, Rajasthan · 10 December 2099');
    await expect(page.getByRole('heading', { level: 1, name: 'Better together' })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoSeriousA11yIssues(page);
    await testInfo.attach(`onboarding-step-2-${viewport.width}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });

    await page.getByLabel('Partner’s email address').fill(uniqueEmail('partner'));
    await page.getByRole('button', { name: 'Send invitation' }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Invitation on its way' }),
    ).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoSeriousA11yIssues(page);
    await testInfo.attach(`onboarding-step-2-sent-${viewport.width}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
    expect(errors).toEqual([]);
  });
}

test('step 1 explains what is missing, beside each field, and refuses past dates', async ({
  page,
}) => {
  await page.setViewportSize({ width: PHONE.width, height: PHONE.height });
  await signUpVerified(page, uniqueEmail('missing'));
  await page.goto('/onboarding');

  await page.getByRole('button', { name: 'Create wedding workspace' }).click();
  const bride = page.getByLabel('Bride’s name');
  await expect(bride).toHaveAttribute('aria-invalid', 'true');
  await expect(bride).toBeFocused();
  for (const message of ["Enter the groom's name.", 'Enter the city.', 'Choose the state.']) {
    await expect(page.getByText(message)).toBeVisible();
  }
  // The date is optional.
  await expect(page.getByLabel('Wedding date')).not.toHaveAttribute('aria-invalid', 'true');
  await expect(page).toHaveURL('/onboarding');
  await expectNoSeriousA11yIssues(page);

  // Keyboard only: Tab through the fields, Enter submits.
  await bride.fill('Meera');
  await page.keyboard.press('Tab');
  await page.keyboard.type('Kabir');
  await page.keyboard.press('Tab');
  await page.keyboard.type('Kochi');
  await page.getByLabel('State').selectOption('Kerala');
  await page.getByLabel('Wedding date').fill('2025-02-14');
  await page.getByLabel('City').press('Enter');
  await expect(page.getByText('Choose today or a later date.')).toBeVisible();
  await page.getByLabel('Wedding date').fill('');
  await page.getByLabel('City').press('Enter');
  await expect(page).toHaveURL('/onboarding/partner');
});

test('going back edits the wedding, and never creates another', async ({ page }) => {
  await signUpVerified(page, uniqueEmail('again'));
  await page.goto('/onboarding');
  await createWedding(page, { bride: 'Isha', groom: 'Dev', city: 'Mapusa', state: 'Goa' });

  await page.getByRole('link', { name: 'Back to wedding details' }).click();
  await expect(page).toHaveURL('/onboarding');
  await expect(page.getByRole('heading', { level: 1, name: 'Your wedding details' })).toBeVisible();
  await expect(page.getByLabel('Bride’s name')).toHaveValue('Isha');
  await expect(page.getByLabel('State')).toHaveValue('Goa');
  await expect(page.getByRole('button', { name: 'Create wedding workspace' })).toHaveCount(0);
  await expectNoSeriousA11yIssues(page);

  await page.getByLabel('City').fill('Panaji');
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await expect(page).toHaveURL('/onboarding/partner');
  await expect(page.getByRole('status')).toContainText('Panaji, Goa');

  // A refresh shows the same: the API, not the browser, decides.
  await page.goto('/onboarding');
  await expect(page.getByLabel('City')).toHaveValue('Panaji');
  const weddings = await page.request.get('/api/v1/weddings');
  expect(((await weddings.json()) as { data: unknown[] }).data).toHaveLength(1);
});

test('the partner is invited, signs up from the email, accepts and becomes an owner', async ({
  browser,
}) => {
  const ownerEmail = uniqueEmail('owner');
  const partnerEmail = uniqueEmail('partner');

  const ownerContext = await newVisitor(browser);
  const owner = await ownerContext.newPage();
  const ownerErrors = collectErrors(owner);
  await signUpVerified(owner, ownerEmail, 'Pushpa Kumari');
  await owner.goto('/onboarding');
  await createWedding(owner, { bride: 'Pushpa', groom: 'Nitesh', city: 'Ara', state: 'Bihar' });

  await owner.getByLabel('Partner’s email address').fill(partnerEmail);
  await owner.getByRole('button', { name: 'Send invitation' }).click();
  await expect(owner.getByText(`Invitation sent to ${partnerEmail}`)).toBeVisible();
  await expect(owner.getByText('Pending', { exact: true })).toBeVisible();
  // A refresh shows the pending invitation; resending replaces the link.
  await owner.reload();
  await expect(
    owner.getByRole('heading', { level: 1, name: 'Invitation on its way' }),
  ).toBeVisible();
  await waitForEmail(partnerEmail, /invited you/);
  await owner.getByRole('button', { name: 'Resend invitation' }).click();
  await expect(owner.getByRole('status')).toContainText('Earlier links no longer work');
  const invitation = await waitForEmail(partnerEmail, /invited you/, { count: 2 });
  expect(invitation.subject).toBe('Pushpa Kumari invited you to plan Pushpa & Nitesh’s wedding');

  // The partner opens the link in a browser where nobody is signed in.
  const partnerContext = await newVisitor(browser, {
    viewport: { width: PHONE.width, height: PHONE.height },
  });
  const partner = await partnerContext.newPage();
  const partnerErrors = collectErrors(partner, ['/api/v1/auth/me']);
  await partner.goto(linkIn(invitation));
  await expect(partner.getByRole('heading', { level: 1, name: 'You’re invited' })).toBeVisible();
  await expect(partner.getByRole('main')).toContainText(
    'Pushpa Kumari invited you to plan Pushpa & Nitesh’s wedding',
  );
  expect(new URL(partner.url()).hash).toBe('');
  await expectNoSeriousA11yIssues(partner);

  // No account yet: sign up and verify in this tab, then accept.
  await partner.getByRole('link', { name: 'Create an account' }).click();
  await signUp(partner, partnerEmail, 'Nitesh Gupta');
  await partner.goto(linkIn(await waitForEmail(partnerEmail, /Verify your email/)));
  await partner.getByRole('link', { name: 'Accept your invitation' }).click();
  await expect(partner).toHaveURL('/invitations/accept');
  await partner.getByRole('button', { name: 'Accept invitation' }).click();
  await expect(
    partner.getByRole('heading', { level: 1, name: 'Welcome to the wedding' }),
  ).toBeVisible();
  await partner.getByRole('link', { name: 'Go to your dashboard' }).click();
  await expect(partner).toHaveURL(WORKSPACE);
  await expect(partner.getByRole('main')).toContainText('Pushpa & Nitesh’s wedding · Ara, Bihar');

  // The owner sees that the partner has joined.
  await owner.goto('/onboarding/partner');
  await expect(owner.getByText('Your partner has joined')).toBeVisible();
  await expect(owner.getByRole('main')).toContainText(partnerEmail);

  expect(ownerErrors).toEqual([]);
  expect(partnerErrors).toEqual([]);
  await ownerContext.close();
  await partnerContext.close();
});

test('a partner who signs up without the link sees the invitation and joins in one click', async ({
  browser,
}) => {
  const ownerEmail = uniqueEmail('owner');
  const partnerEmail = uniqueEmail('partner');

  const ownerContext = await newVisitor(browser);
  const owner = await ownerContext.newPage();
  await signUpVerified(owner, ownerEmail, 'Arjun Mehta');
  await owner.goto('/onboarding');
  await createWedding(owner, {
    bride: 'Ananya',
    groom: 'Arjun',
    city: 'Jaipur',
    state: 'Rajasthan',
    date: '2031-02-14',
  });
  await owner.getByLabel('Partner’s email address').fill(partnerEmail);
  await owner.getByRole('button', { name: 'Send invitation' }).click();
  await waitForEmail(partnerEmail, /invited you/);

  // The partner never opens the invitation link: they sign up directly.
  const partnerContext = await newVisitor(browser, {
    viewport: { width: PHONE.width, height: PHONE.height },
  });
  const partner = await partnerContext.newPage();
  const errors = collectErrors(partner);
  await signUpVerified(partner, partnerEmail, 'Ananya Rao');
  await partner.getByRole('link', { name: 'See your invitation' }).click();

  await expect(partner).toHaveURL('/onboarding');
  await expect(
    partner.getByRole('heading', { level: 1, name: 'Join your wedding.' }),
  ).toBeVisible();
  const card = partner.getByRole('region', { name: 'Invitation to Ananya & Arjun’s wedding' });
  await expect(card).toContainText('Jaipur, Rajasthan');
  await expect(card).toContainText('Friday, 14 February 2031');
  await expect(card).toContainText('Arjun Mehta');
  await expect(card).toContainText(`Only you can accept one sent to ${partnerEmail}`);
  await expectNoSeriousA11yIssues(partner);
  await expectNoHorizontalScroll(partner);

  // Changing their mind about starting their own: asked first, then back.
  await partner.getByRole('button', { name: 'Start my own wedding instead' }).click();
  const dialog = partner.getByRole('dialog', { name: 'Start a separate wedding?' });
  await expect(dialog).toBeVisible();
  await expectNoSeriousA11yIssues(partner);
  await dialog.getByRole('button', { name: 'Go back to invitation' }).click();
  await expect(dialog).toBeHidden();

  await partner.getByRole('button', { name: 'Accept and join' }).click();
  await expect(partner).toHaveURL(WORKSPACE);
  await expect(partner.getByRole('main')).toContainText(
    'Ananya & Arjun’s wedding · Jaipur, Rajasthan',
  );

  await owner.goto('/onboarding/partner');
  await expect(owner.getByText('Your partner has joined')).toBeVisible();

  expect(errors).toEqual([]);
  await ownerContext.close();
  await partnerContext.close();
});

test('an invitee may start their own wedding instead, and is asked again until they do', async ({
  browser,
}) => {
  const ownerContext = await newVisitor(browser);
  const owner = await ownerContext.newPage();
  await signUpVerified(owner, uniqueEmail('owner'), 'Kabir Sharma');
  await owner.goto('/onboarding');
  await createWedding(owner, {
    bride: 'Riya',
    groom: 'Kabir',
    city: 'Udaipur',
    state: 'Rajasthan',
  });
  const inviteeEmail = uniqueEmail('invitee');
  await owner.getByLabel('Partner’s email address').fill(inviteeEmail);
  await owner.getByRole('button', { name: 'Send invitation' }).click();
  await waitForEmail(inviteeEmail, /invited you/);

  const inviteeContext = await newVisitor(browser);
  const invitee = await inviteeContext.newPage();
  await signUpVerified(invitee, inviteeEmail);
  await invitee.goto('/onboarding');
  await invitee.getByRole('button', { name: 'Start my own wedding instead' }).click();
  await invitee
    .getByRole('dialog', { name: 'Start a separate wedding?' })
    .getByRole('link', { name: 'Start my own wedding' })
    .click();
  await expect(invitee).toHaveURL('/onboarding?start=own');
  await expect(
    invitee.getByRole('heading', { level: 1, name: 'Let’s start your wedding' }),
  ).toBeVisible();

  // Left without creating one: the invitation is still offered next time.
  await invitee.goto('/onboarding');
  await expect(
    invitee.getByRole('heading', { level: 1, name: 'Join your wedding.' }),
  ).toBeVisible();

  // Once they own a wedding, the invitation is not offered again.
  await invitee.goto('/onboarding?start=own');
  await createWedding(invitee, {
    bride: 'Meera',
    groom: 'Dev',
    city: 'Pune',
    state: 'Maharashtra',
  });
  await invitee.goto('/onboarding');
  await expect(
    invitee.getByRole('heading', { level: 1, name: 'Your wedding details' }),
  ).toBeVisible();

  await ownerContext.close();
  await inviteeContext.close();
});

test('an invitation for someone else is not accepted by whoever is signed in', async ({
  browser,
}) => {
  const ownerContext = await newVisitor(browser);
  const owner = await ownerContext.newPage();
  await signUpVerified(owner, uniqueEmail('owner'));
  await owner.goto('/onboarding');
  await createWedding(owner, { bride: 'Riya', groom: 'Kunal', city: 'Pune', state: 'Maharashtra' });
  const partnerEmail = uniqueEmail('intended');
  await owner.getByLabel('Partner’s email address').fill(partnerEmail);
  await owner.getByRole('button', { name: 'Send invitation' }).click();
  await expect(owner.getByText(`Invitation sent to ${partnerEmail}`)).toBeVisible();

  const otherContext = await newVisitor(browser);
  const other = await otherContext.newPage();
  await signUpVerified(other, uniqueEmail('other'));
  await other.goto(linkIn(await waitForEmail(partnerEmail, /invited you/)));
  await expect(other.getByRole('main').getByRole('alert')).toContainText(
    `This invitation is for ${partnerEmail}`,
  );
  await expect(other.getByRole('button', { name: 'Accept invitation' })).toHaveCount(0);
  await ownerContext.close();
  await otherContext.close();
});

test('onboarding needs a signed-in, verified account, and step 2 a wedding', async ({ page }) => {
  await expectRedirectBeforeRender(page, '/onboarding', '/login?next=%2Fonboarding');
  await expectRedirectBeforeRender(
    page,
    '/onboarding/partner',
    '/login?next=%2Fonboarding%2Fpartner',
  );

  await signUp(page, uniqueEmail('unverified'));
  await page.goto('/onboarding');
  await expect(page).toHaveURL('/verify-email');
});

test('step 2 without a wedding goes back to step 1', async ({ page }) => {
  await signUpVerified(page, uniqueEmail('nowedding'));
  await page.goto('/onboarding/partner');
  await expect(page).toHaveURL('/onboarding');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Let’s start your wedding' }),
  ).toBeVisible();
});
