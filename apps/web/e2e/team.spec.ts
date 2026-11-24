import { expect, type Page } from '@playwright/test';
import {
  collectErrors,
  expectNoHorizontalScroll,
  expectNoSeriousA11yIssues,
  PHONE,
  VIEWPORTS,
} from './support/checks';
import { createWedding, signUp, signUpVerified, WORKSPACE } from './support/journeys';
import { linkIn, uniqueEmail, waitForEmail } from './support/mail';
import { newVisitor, test } from './support/visitor';

/** A verified owner with a wedding, on its Team & Family page. */
async function ownerAtTeam(page: Page) {
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
  const nav = page.getByRole('navigation', { name: 'Workspace' });
  // The section menu is in the sidebar, on wide screens only.
  if (await nav.isVisible()) await nav.getByRole('link', { name: 'Team & Family' }).click();
  else await page.goto(`${weddingPath}/team`);
  await expect(page).toHaveURL(`${weddingPath}/team`);
  await expect(page.getByRole('heading', { level: 1, name: 'Your team' })).toBeVisible();
  return { weddingPath, team: `${weddingPath}/team` };
}

async function invite(page: Page, email: string, role: 'Admin' | 'Manager', label?: string) {
  await page.getByRole('button', { name: 'Invite someone' }).first().click();
  const drawer = page.getByRole('dialog', { name: 'Invite someone' });
  await drawer.getByLabel('Email address').fill(email);
  await drawer.getByRole('radio', { name: new RegExp(`^${role}`) }).check();
  if (label) await drawer.getByLabel(/Label/).fill(label);
  await drawer.getByRole('button', { name: 'Send invitation' }).click();
  await expect(drawer).toBeHidden();
}

for (const viewport of VIEWPORTS) {
  test(`team page fits and is accessible at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await ownerAtTeam(page);
    await expect(page.getByText('No helpers yet')).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoSeriousA11yIssues(page);
    await page.getByRole('button', { name: 'Invite someone' }).first().click();
    await expect(page.getByRole('dialog', { name: 'Invite someone' })).toBeVisible();
    await expectNoSeriousA11yIssues(page);
    await testInfo.attach(`team-${viewport.width}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
  });
}

test('the couple make a parent an admin, who joins, and can be changed or removed', async ({
  page,
  browser,
}) => {
  const { weddingPath, team } = await ownerAtTeam(page);
  // The second invitation to the same address is refused on purpose (409).
  const errors = collectErrors(page, [`/api/v1${weddingPath}/member-invites`]);
  const fatherEmail = uniqueEmail('father');
  await invite(page, fatherEmail, 'Admin', 'Bride’s father');
  const pending = page.getByRole('article').filter({ hasText: fatherEmail });
  await expect(pending).toContainText('Admin');
  await expect(pending).toContainText('Bride’s father');
  await expect(pending).toContainText('Pending acceptance');
  await expect(pending).toContainText('Invited by Ananya Sharma');

  // The same address again is refused, with a reason.
  await page.getByRole('button', { name: 'Invite someone' }).first().click();
  const drawer = page.getByRole('dialog', { name: 'Invite someone' });
  await drawer.getByLabel('Email address').fill(fatherEmail);
  await drawer.getByRole('button', { name: 'Send invitation' }).click();
  await expect(drawer.getByRole('alert')).toContainText('already been invited');
  await drawer.getByRole('button', { name: 'Cancel' }).click();

  // The father opens the email on his phone, signs up and accepts.
  const invitation = await waitForEmail(fatherEmail, /invited you to help plan/);
  const fatherContext = await newVisitor(browser, {
    viewport: { width: PHONE.width, height: PHONE.height },
  });
  const father = await fatherContext.newPage();
  const fatherErrors = collectErrors(father, ['/api/v1/auth/me']);
  await father.goto(linkIn(invitation));
  await expect(
    father.getByRole('heading', { level: 1, name: 'Help plan Ananya & Arjun’s wedding' }),
  ).toBeVisible();
  await expect(father.getByRole('main')).toContainText('What you can do');
  await expectNoSeriousA11yIssues(father);
  await father.getByRole('link', { name: 'Create an account' }).click();
  await signUp(father, fatherEmail, 'Rajesh Sharma');
  await father.goto(linkIn(await waitForEmail(fatherEmail, /Verify your email/)));
  await father.getByRole('link', { name: 'Accept your invitation' }).click();
  await father.getByRole('button', { name: 'Accept invitation & open workspace' }).click();
  await expect(father.getByRole('main')).toContainText('You’re now an admin');
  await father.getByRole('link', { name: 'Open the wedding workspace' }).click();
  await expect(father).toHaveURL(weddingPath);

  // As an admin he sees the team, with the couple protected.
  await father.goto(team);
  await expect(father.getByRole('heading', { level: 1, name: 'Your team' })).toBeVisible();
  await expect(father.getByRole('main')).toContainText('Protected');
  await expectNoHorizontalScroll(father);

  // The bride sees him, and makes him a manager.
  await page.reload();
  const row = page.getByRole('listitem').filter({ hasText: 'Rajesh Sharma' });
  await expect(row).toContainText('Admin');
  await expect(row).toContainText('Bride’s father');
  await row.getByRole('button', { name: 'Actions for Rajesh Sharma' }).click();
  await row.getByRole('button', { name: 'Make manager' }).click();
  await expect(row).toContainText('Manager');

  // A manager never manages the team.
  await father.goto(team);
  await expect(
    father.getByRole('heading', { level: 1, name: 'The team is managed by the couple' }),
  ).toBeVisible();

  // Removed, he loses the wedding at once.
  await row.getByRole('button', { name: 'Actions for Rajesh Sharma' }).click();
  await row.getByRole('button', { name: 'Remove access' }).click();
  const confirm = page.getByRole('dialog', { name: 'Remove Rajesh Sharma?' });
  await expectNoSeriousA11yIssues(page);
  await confirm.getByRole('button', { name: 'Remove access' }).click();
  await expect(page.getByText('No helpers yet')).toBeVisible();
  await father.goto(weddingPath);
  await expect(
    father.getByRole('heading', { level: 1, name: 'We couldn’t find that wedding' }),
  ).toBeVisible();

  expect(errors).toEqual([]);
  expect(fatherErrors).toEqual([]);
  await fatherContext.close();
});

test('an invitation can be revoked, and its link stops working', async ({ page, browser }) => {
  await ownerAtTeam(page);
  const email = uniqueEmail('cousin');
  await invite(page, email, 'Manager');
  const invitation = await waitForEmail(email, /invited you to help plan/);

  const pending = page.getByRole('article').filter({ hasText: email });
  await pending.getByRole('button', { name: `Revoke the invitation to ${email}` }).click();
  const confirm = page.getByRole('dialog', { name: 'Revoke invitation link?' });
  await expect(confirm).toContainText(email);
  await confirm.getByRole('button', { name: 'Revoke link' }).click();
  await expect(page.getByText('No invitations are waiting.')).toBeVisible();

  const visitor = await newVisitor(browser);
  const cousin = await visitor.newPage();
  await cousin.goto(linkIn(invitation));
  await expect(
    cousin.getByRole('heading', { level: 1, name: 'This invitation cannot be used' }),
  ).toBeVisible();
  await visitor.close();
});

test('an owner hands over their ownership, confirmed, and stays on as an admin', async ({
  page,
  browser,
}) => {
  const { weddingPath, team } = await ownerAtTeam(page);
  const errors = collectErrors(page);
  const email = uniqueEmail('real-groom');

  const owners = page.getByRole('region', { name: 'Wedding owners' });
  const mine = owners.getByRole('article').filter({ hasText: 'Ananya Sharma' });
  await mine.getByRole('button', { name: 'Hand over my ownership' }).click();
  const drawer = page.getByRole('dialog', { name: 'Hand over ownership' });
  await expect(drawer.getByRole('radio', { name: /^Owner, in my place/ })).toBeChecked();
  await expect(drawer).toContainText('When they accept, you stop being an owner.');
  await expectNoSeriousA11yIssues(page);
  await drawer.getByLabel('Email address').fill(email);
  // Not without the confirmation.
  await drawer.getByRole('button', { name: 'Send hand-over invitation' }).click();
  await expect(drawer.getByRole('alert')).toContainText('Tick the box');
  await drawer.getByRole('checkbox', { name: /handing over my ownership/ }).check();
  await drawer.getByRole('button', { name: 'Send hand-over invitation' }).click();
  await expect(drawer).toBeHidden();

  const pending = page.getByRole('article').filter({ hasText: email });
  await expect(pending).toContainText('Owner hand-over');
  await expect(pending).toContainText('Becomes an owner in place of Ananya Sharma');
  // Nothing changes before they accept.
  await expect(mine).toContainText('Owner');

  const invitation = await waitForEmail(email, /invited you to own/);
  const groomContext = await newVisitor(browser, {
    viewport: { width: PHONE.width, height: PHONE.height },
  });
  const groom = await groomContext.newPage();
  const groomErrors = collectErrors(groom, ['/api/v1/auth/me']);
  await groom.goto(linkIn(invitation));
  await expect(
    groom.getByRole('heading', { level: 1, name: 'Take over as an owner' }),
  ).toBeVisible();
  await expect(groom.getByRole('main')).toContainText(
    'Ananya Sharma stays on the team as an admin',
  );
  await expectNoSeriousA11yIssues(groom);
  await expectNoHorizontalScroll(groom);
  await groom.getByRole('link', { name: 'Create an account' }).click();
  await signUp(groom, email, 'Arjun Mehta');
  await groom.goto(linkIn(await waitForEmail(email, /Verify your email/)));
  await groom.getByRole('link', { name: 'Accept your invitation' }).click();
  await groom.getByRole('button', { name: 'Accept and become an owner' }).click();
  await expect(groom.getByRole('main')).toContainText('You’re now an owner');
  await groom.goto(team);
  await expect(groom.getByRole('heading', { level: 1, name: 'Your team' })).toBeVisible();

  // The one who set it up is now an admin, and can no longer hand over.
  await page.reload();
  await expect(owners).toContainText('Arjun Mehta');
  await expect(owners).not.toContainText('Ananya Sharma');
  const helper = page.getByRole('listitem').filter({ hasText: 'Ananya Sharma' });
  await expect(helper).toContainText('Admin');
  await expect(helper).toContainText('You');
  await expect(page.getByRole('button', { name: 'Hand over my ownership' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Invite someone' }).first().click();
  await expect(
    page.getByRole('dialog', { name: 'Invite someone' }).getByRole('radio', { name: /^Owner/ }),
  ).toHaveCount(0);
  await expect(page).toHaveURL(team);
  expect(weddingPath).toBeTruthy();

  expect(errors).toEqual([]);
  expect(groomErrors).toEqual([]);
  await groomContext.close();
});

test('someone already on a team sees a new invitation in their workspace and answers it there', async ({
  page,
  browser,
}) => {
  // Hitesh already helps with Ananya & Arjun's wedding.
  await ownerAtTeam(page);
  const email = uniqueEmail('hitesh');
  await invite(page, email, 'Admin');
  const first = await waitForEmail(email, /invited you to help plan/);
  const hiteshContext = await newVisitor(browser, {
    viewport: { width: PHONE.width, height: PHONE.height },
  });
  const hitesh = await hiteshContext.newPage();
  const errors = collectErrors(hitesh, ['/api/v1/auth/me']);
  await hitesh.goto(linkIn(first));
  await hitesh.getByRole('link', { name: 'Create an account' }).click();
  await signUp(hitesh, email, 'Hitesh Gupta');
  await hitesh.goto(linkIn(await waitForEmail(email, /Verify your email/)));
  await hitesh.getByRole('link', { name: 'Accept your invitation' }).click();
  await hitesh.getByRole('button', { name: 'Accept invitation & open workspace' }).click();
  await expect(hitesh.getByRole('main')).toContainText('You’re now an admin');

  // Someone else sets up Divya & Hitesh's wedding and hands it over to him.
  const setterContext = await newVisitor(browser);
  const setter = await setterContext.newPage();
  await signUpVerified(setter, uniqueEmail('setter'), 'Nitesh Gupta');
  await setter.goto('/onboarding');
  await createWedding(setter, { bride: 'Divya', groom: 'Hitesh', city: 'Ara', state: 'Bihar' });
  await setter.goto('/dashboard');
  await expect(setter).toHaveURL(WORKSPACE);
  await setter.goto(`${new URL(setter.url()).pathname}/team`);
  await setter.getByRole('button', { name: 'Hand over my ownership' }).click();
  const drawer = setter.getByRole('dialog', { name: 'Hand over ownership' });
  await drawer.getByLabel('Email address').fill(email);
  await drawer.getByRole('checkbox', { name: /handing over my ownership/ }).check();
  await drawer.getByRole('button', { name: 'Send hand-over invitation' }).click();
  await expect(drawer).toBeHidden();

  // Signed in, he lands in the wedding he helps with, and is told.
  await hitesh.goto('/dashboard');
  await expect(hitesh).toHaveURL(WORKSPACE);
  const waiting = hitesh.getByRole('region', { name: 'Invitations waiting' });
  await expect(waiting).toContainText(
    'Nitesh Gupta invited you to take over as an owner of Divya & Hitesh’s wedding.',
  );
  await expectNoHorizontalScroll(hitesh);
  await waiting.getByRole('link', { name: 'Review invitation' }).click();
  await expect(hitesh).toHaveURL('/invitations');
  await expect(
    hitesh.getByRole('heading', { level: 1, name: 'Take over Divya & Hitesh’s wedding.' }),
  ).toBeVisible();
  await expect(hitesh.getByRole('link', { name: 'Back to my weddings' })).toBeVisible();
  await expectNoSeriousA11yIssues(hitesh);
  await hitesh.getByRole('button', { name: 'Accept and join' }).click();
  await expect(hitesh).toHaveURL(WORKSPACE);
  await expect(hitesh.getByRole('banner')).toContainText('Divya & Hitesh');
  await expect(hitesh.getByRole('region', { name: 'Invitations waiting' })).toHaveCount(0);

  expect(errors).toEqual([]);
  await hiteshContext.close();
  await setterContext.close();
});
