import { readFile } from 'node:fs/promises';
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
import { uniqueEmail, waitForEmail } from './support/mail';
import { newVisitor, test } from './support/visitor';

/** A verified owner with a wedding; returns the wedding's ID and Guests address. */
async function ownerAtGuests(page: Page) {
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
  const guests = `${weddingPath}/guests`;
  await page.goto(guests);
  await expect(page.getByRole('heading', { level: 1, name: 'Guests & RSVP' })).toBeVisible();
  return { weddingId, guests };
}

async function apiPost(page: Page, path: string, body: object) {
  const res = await page.request.post(`/api/v1${path}`, { data: body });
  expect(res.status(), await res.text()).toBe(201);
  return (await res.json()) as { data: Record<string, unknown> & { id?: string } };
}

/** The guest's link as a path on this site, with its secret after `#t=`. */
async function privateLink(page: Page, weddingId: string, guestId: string) {
  const res = await apiPost(page, `/weddings/${weddingId}/guests/${guestId}/invitation-links`, {});
  const url = new URL(String(res.data.secretUrl));
  return `${url.pathname}${url.hash}`;
}

for (const viewport of VIEWPORTS) {
  test(`guests, empty and with the drawer open, fit and are accessible at ${viewport.width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const errors = collectErrors(page);
    await ownerAtGuests(page);
    await expect(page.getByRole('heading', { name: 'Your guest list starts here' })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoSeriousA11yIssues(page);
    await page.getByRole('button', { name: 'Add your first guest' }).click();
    const drawer = page.getByRole('dialog', { name: 'Add guest' });
    await expect(drawer.getByLabel(/^Primary contact name/)).toBeFocused();
    await expectNoSeriousA11yIssues(page);
    await testInfo.attach(`guests-drawer-${viewport.width}`, {
      body: await page.screenshot(),
      contentType: 'image/png',
    });
    await page.keyboard.press('Escape');
    expect(errors).toEqual([]);
  });
}

test('a family is invited, answers per ceremony through its private link, and the totals follow', async ({
  page,
  browser,
}, testInfo) => {
  await page.setViewportSize({ width: DESKTOP.width, height: DESKTOP.height });
  const errors = collectErrors(page);
  const { weddingId, guests } = await ownerAtGuests(page);
  for (const [title, startDate] of [
    ['Haldi', '2031-02-18'],
    ['Wedding', '2031-02-20'],
    ['Reception', '2031-02-21'],
  ]) {
    await apiPost(page, `/weddings/${weddingId}/events`, { title, startDate });
  }
  await page.reload();

  // One contact for a family of five, invited to two of three ceremonies.
  await page.getByRole('button', { name: 'Add your first guest' }).click();
  const drawer = page.getByRole('dialog', { name: 'Add guest' });
  await drawer.getByRole('button', { name: 'Add guest' }).click();
  await expect(drawer.getByText('Enter the primary contact’s name.')).toBeVisible();
  await drawer.getByLabel(/^Primary contact name/).fill('Rajesh Sharma');
  for (let i = 0; i < 4; i++) await drawer.getByRole('button', { name: 'One more' }).click();
  await expect(drawer.getByLabel(/^Number of people invited/)).toHaveValue('5');
  await drawer.getByLabel(/^Email/).fill('rajesh@example.com');
  await drawer.getByRole('checkbox', { name: /^Haldi/ }).check();
  await drawer.getByRole('checkbox', { name: /^Wedding/ }).check();
  await drawer.getByRole('button', { name: 'Add guest' }).click();
  const details = page.getByRole('dialog', { name: 'Rajesh Sharma' });
  await expect(details.getByText('Invited ceremonies (2)')).toBeVisible();
  await expect(details.getByText('Not invited: Reception')).toBeVisible();
  await page.keyboard.press('Escape');

  const totals = page.getByRole('region', { name: 'Guest totals' });
  await expect(totals).toContainText('Guest contacts1');
  await expect(totals).toContainText('Invited people5');

  // The family opens its link on another phone: no account, only its ceremonies.
  const guestId = String(
    (
      (await (await page.request.get(`/api/v1/weddings/${weddingId}/guests`)).json()) as {
        data: { guests: { id: string }[] };
      }
    ).data.guests[0]?.id,
  );
  const link = await privateLink(page, weddingId, guestId);
  const family = await newVisitor(browser, {
    viewport: { width: PHONE.width, height: PHONE.height },
  });
  const phone = await family.newPage();
  await phone.goto(link);
  await expect(phone.getByRole('heading', { name: /Ananya & Arjun’s wedding/ })).toBeVisible();
  await expect(phone.getByText('Hello, Rajesh Sharma')).toBeVisible();
  // The secret is gone from the address at once.
  await expect(phone).toHaveURL(/\/invitation$/);
  // Their ceremonies, then the reminder-email choice (they have an email address).
  await expect(phone.getByRole('heading', { level: 2 })).toHaveText([
    'Haldi',
    'Wedding',
    'Reminder emails',
  ]);
  await expect(phone.getByText('Reception')).toHaveCount(0);
  await expectNoHorizontalScroll(phone);
  await expectNoSeriousA11yIssues(phone);

  // One answer for every ceremony, then one ceremony changed on its own.
  await phone
    .getByRole('group', { name: 'Will you attend all celebrations?' })
    .getByText('Attending', { exact: true })
    .click();
  await expect(phone.getByRole('region', { name: 'Wedding' })).toContainText('5 of 5 people');
  for (let i = 0; i < 2; i++) {
    await phone
      .getByRole('region', { name: 'Haldi' })
      .getByRole('button', { name: 'One fewer' })
      .click();
  }
  await expect(phone.getByRole('region', { name: 'Haldi' })).toContainText('3 of 5 people');
  await expect(phone.getByRole('region', { name: 'All celebrations' })).toContainText(
    'Different for each celebration',
  );
  await phone.getByRole('button', { name: 'Save my RSVP' }).click();
  await expect(phone.getByText('Your responses have been saved.')).toBeVisible();
  await testInfo.attach('guest-rsvp-390', {
    body: await phone.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });

  // A return visit, without the link, shows the saved answers.
  await phone.reload();
  await expect(phone.getByRole('region', { name: 'Haldi' })).toContainText('3 of 5 people');
  await expect(phone.getByRole('button', { name: 'Your RSVP is saved' })).toBeDisabled();

  // The organizer sees confirmed people per ceremony, the family counted once.
  await page.reload();
  await expect(totals).toContainText('Invited people5');
  await expect(totals).toContainText('Ceremony responses2 of 2');
  await expect(totals).toContainText('Haldi3 of 5');
  await expect(totals).toContainText('Wedding5 of 5');
  const row = page.getByRole('article', { name: 'Rajesh Sharma' });
  await expect(row).toContainText('3/5');
  await expect(row).toContainText('Link ready');
  await testInfo.attach('guests-list-1280', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });

  // Lowering the party size below an answer is refused, naming the ceremony.
  await row.getByRole('button', { name: /View details/ }).click();
  await page
    .getByRole('dialog', { name: 'Rajesh Sharma' })
    .getByRole('button', { name: 'Edit guest' })
    .click();
  const editing = page.getByRole('dialog', { name: 'Rajesh Sharma' });
  await editing.getByLabel(/^Number of people invited/).fill('3');
  await editing.getByRole('button', { name: 'Save changes' }).click();
  await expect(editing.getByRole('alert')).toContainText('Wedding: 5 attending');
  await editing.getByRole('button', { name: 'Cancel' }).click();

  // Replacing the link stops the old one, even on the phone already open.
  await editing.getByRole('button', { name: 'Replace link' }).click();
  await page
    .getByRole('dialog', { name: 'Replace this invitation link?' })
    .getByRole('button', { name: 'Replace link' })
    .click();
  await expect(
    page.getByRole('status').filter({ hasText: 'The old link no longer works' }),
  ).toBeAttached();
  await phone.reload();
  await expect(
    phone.getByRole('heading', { name: 'This invitation link is no longer available' }),
  ).toBeVisible();
  await phone.goto(link);
  await expect(
    phone.getByRole('heading', { name: 'This invitation link is no longer available' }),
  ).toBeVisible();
  await family.close();

  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(guests);
  await expectNoSeriousA11yIssues(page);
  expect(errors.filter((error) => !/^40[49] /.test(error))).toEqual([]);
});

test('a CSV guest list is previewed row by row, then imported', async ({ page }) => {
  await page.setViewportSize({ width: DESKTOP.width, height: DESKTOP.height });
  const { weddingId } = await ownerAtGuests(page);
  await apiPost(page, `/weddings/${weddingId}/events`, { title: 'Wedding' });
  await apiPost(page, `/weddings/${weddingId}/guests`, { name: 'Rajesh Sharma', partySize: 5 });
  await page.reload();

  await page.getByRole('button', { name: 'Import guests' }).click();
  const dialog = page.getByRole('dialog', { name: 'Import guests' });
  await dialog.locator('input[type=file]').setInputFiles({
    name: 'guest-list.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(
      'Name,Party size,Email,Ceremonies\n' +
        'Vikram Singhania,4,vikram@example.com,Wedding\n' +
        'Sunita Verma,0,,\n' +
        '"Sharma, Rajesh",5,,\n' +
        'Rajesh Sharma,5,,Wedding\n',
    ),
  });
  await expect(dialog).toContainText('2 ready');
  await expect(dialog).toContainText('1 with problems');
  await expect(dialog).toContainText('1 possible duplicates');
  await expect(dialog).toContainText('Party size must be a whole number of at least 1.');
  await expect(dialog).toContainText('Possible duplicate of Rajesh Sharma');
  await expectNoSeriousA11yIssues(page);
  await dialog.getByRole('button', { name: 'Import 2 guests' }).click();
  await expect(dialog.getByText('2 guests imported.')).toBeVisible();
  await dialog.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByRole('article')).toHaveCount(3);
  await expect(page.getByRole('article', { name: 'Vikram Singhania' })).toContainText('Wedding');
});

test('the import shows its format, and its sample file imports as it is', async ({ page }) => {
  await page.setViewportSize({ width: DESKTOP.width, height: DESKTOP.height });
  const { weddingId } = await ownerAtGuests(page);
  for (const title of ['Tilak', 'Haldi', 'Wedding']) {
    await apiPost(page, `/weddings/${weddingId}/events`, { title });
  }
  await page.reload();

  await page.getByRole('button', { name: 'Import guests' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Import guests' });
  const format = dialog.getByRole('table', { name: 'Columns the import reads' });
  await expect(format.getByRole('rowheader')).toHaveText([
    'Name *',
    'Party size *',
    'Email',
    'Phone',
    'Ceremonies',
    'Notes',
  ]);
  await expect(format).toContainText('Tilak; Haldi');
  await expectNoSeriousA11yIssues(page);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Download sample CSV' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('guest-list-sample.csv');
  // Playwright keeps downloads under a temporary name: give it back its own.
  await dialog.locator('input[type=file]').setInputFiles({
    name: download.suggestedFilename(),
    mimeType: 'text/csv',
    buffer: await readFile(await download.path()),
  });
  await expect(dialog).toContainText('3 ready');
  await expect(dialog).toContainText('0 with problems');
  await dialog.getByRole('button', { name: 'Import 3 guests' }).click();
  await expect(dialog.getByText('3 guests imported.')).toBeVisible();
  await dialog.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByRole('article', { name: 'Rajesh Sharma' })).toContainText('Tilak');
  await expect(page.getByRole('article', { name: 'Rajesh Sharma' })).toContainText(
    '+91 98200 11223',
  );
});

test('a browser that opened one family’s link shows the next link’s family, never the first', async ({
  page,
  browser,
}) => {
  const { weddingId } = await ownerAtGuests(page);
  const ids: Record<string, string> = {};
  for (const title of ['Haldi', 'Wedding', 'Reception']) {
    ids[title] = String((await apiPost(page, `/weddings/${weddingId}/events`, { title })).data.id);
  }
  const guest = async (name: string, titles: string[]) => {
    const created = await apiPost(page, `/weddings/${weddingId}/guests`, {
      name,
      partySize: 3,
      eventIds: titles.map((title) => ids[title]),
    });
    return privateLink(
      page,
      weddingId,
      String((created.data as { guest: { id: string } }).guest.id),
    );
  };
  const first = await guest('Geeta Devi', ['Haldi', 'Wedding', 'Reception']);
  const second = await guest('Rajesh Sharma', ['Wedding', 'Reception']);

  const family = await newVisitor(browser, {
    viewport: { width: PHONE.width, height: PHONE.height },
  });
  const phone = await family.newPage();
  await phone.goto(first);
  await expect(phone.getByText('Hello, Geeta Devi')).toBeVisible();
  await expect(phone.getByRole('heading', { level: 2 })).toHaveText([
    'Haldi',
    'Wedding',
    'Reception',
  ]);

  // The same browser opens another family's link, in a new tab as from an email…
  const tab = await family.newPage();
  await tab.goto(second);
  await expect(tab.getByText('Hello, Rajesh Sharma')).toBeVisible();
  await expect(tab.getByRole('heading', { level: 2 })).toHaveText(['Wedding', 'Reception']);
  await expect(tab.getByText('Geeta Devi')).toHaveCount(0);
  await tab.close();

  // …or pasted into the tab already open.
  await phone.goto(second);
  await expect(phone.getByText('Hello, Rajesh Sharma')).toBeVisible();
  await expect(phone.getByRole('heading', { level: 2 })).toHaveText(['Wedding', 'Reception']);
  await expect(phone.getByText('Geeta Devi')).toHaveCount(0);
  await expect(phone.getByRole('button', { name: 'Choose your answers above' })).toBeDisabled();
  await phone
    .getByRole('group', { name: 'Will you attend all celebrations?' })
    .getByText('Attending', { exact: true })
    .click();
  await phone.getByRole('button', { name: 'Save my RSVP' }).click();
  await expect(phone.getByText('Your responses have been saved.')).toBeVisible();
  await family.close();
});

test('another wedding’s guests are simply not found', async ({ page, browser }) => {
  const theirs = await ownerAtGuests(page);
  await apiPost(page, `/weddings/${theirs.weddingId}/guests`, {
    name: 'Private Guest',
    partySize: 2,
  });
  const otherContext = await newVisitor(browser);
  const other = await otherContext.newPage();
  await ownerAtGuests(other);
  await other.goto(theirs.guests);
  await expect(
    other.getByRole('heading', { level: 1, name: 'We couldn’t find that wedding' }),
  ).toBeVisible();
  await expect(other.locator('body')).not.toContainText('Private Guest');
  expect((await other.request.get(`/api/v1/weddings/${theirs.weddingId}/guests`)).status()).toBe(
    404,
  );
  // A visitor with no link sees nothing private at /invitation.
  await other.goto('/invitation');
  await expect(
    other.getByRole('heading', { name: 'This invitation link is no longer available' }),
  ).toBeVisible();
  await otherContext.close();
});

test('the couple reminds everyone with a note; a family turns reminders off from the email', async ({
  page,
  browser,
}, testInfo) => {
  await page.setViewportSize({ width: DESKTOP.width, height: DESKTOP.height });
  const errors = collectErrors(page);
  const { weddingId, guests } = await ownerAtGuests(page);
  const eventIds: string[] = [];
  for (const [title, startDate] of [
    ['Haldi', '2031-02-18'],
    ['Wedding', '2031-02-20'],
  ]) {
    eventIds.push(
      String((await apiPost(page, `/weddings/${weddingId}/events`, { title, startDate })).data.id),
    );
  }
  const rajeshEmail = uniqueEmail('rajesh');
  const add = async (body: object) =>
    String(
      (
        (await apiPost(page, `/weddings/${weddingId}/guests`, { partySize: 4, eventIds, ...body }))
          .data as { guest: { id: string } }
      ).guest.id,
    );
  const rajesh = await add({ name: 'Rajesh Sharma', email: rajeshEmail });
  await privateLink(page, weddingId, rajesh);
  await privateLink(page, weddingId, await add({ name: 'Kavya Iyer' }));
  await add({ name: 'Suresh Yadav', email: uniqueEmail('suresh') });
  await page.reload();

  // Who gets it, and who is left out and why, before anything is sent.
  await page.getByRole('button', { name: 'Send reminder' }).click();
  const dialog = page.getByRole('dialog', { name: 'Remind everyone invited' });
  await expect(dialog).toContainText('1 family');
  await dialog.getByText('No email address (1)').click();
  await expect(dialog).toContainText('Kavya Iyer');
  await dialog.getByText('Invitation not shared yet (1)').click();
  await expect(dialog).toContainText('Suresh Yadav');
  await dialog.getByLabel(/A note from you/).fill('Please reply by 25 January.');
  await expectNoSeriousA11yIssues(page);
  await testInfo.attach('remind-all-1280', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
  await dialog.getByRole('button', { name: 'Send 1 reminder' }).click();
  await expect(dialog.getByText('The reminder is on its way.')).toBeVisible();
  await dialog.getByRole('button', { name: 'Done' }).click();

  const email = await waitForEmail(rajeshEmail, /^Please RSVP: Ananya & Arjun’s wedding$/);
  expect(email.text).toContain('Please reply by 25 January.');
  expect(email.text).toContain('● Not answered yet');
  const turnOff = /http:\/\/localhost:\d+\/invitation#t=[A-Za-z0-9_-]+&reminders/.exec(
    email.text,
  )?.[0];
  expect(turnOff).toBeTruthy();

  // The family follows "Turn them off" on a phone.
  const family = await newVisitor(browser, {
    viewport: { width: PHONE.width, height: PHONE.height },
  });
  const phone = await family.newPage();
  const url = new URL(turnOff ?? '');
  await phone.goto(`${url.pathname}${url.hash}`);
  const choice = phone.getByRole('region', { name: 'Reminder emails' });
  await expect(choice).toBeVisible();
  await expect(phone).toHaveURL(/\/invitation$/);
  await choice.getByRole('button', { name: 'Stop reminder emails' }).click();
  await expect(choice).toContainText('You won’t get reminder emails any more.');
  await expectNoHorizontalScroll(phone);
  await family.close();

  // The couple sees it, and can no longer remind them.
  await page
    .getByRole('article', { name: 'Rajesh Sharma' })
    .getByRole('button', { name: /View details/ })
    .click();
  const details = page.getByRole('dialog', { name: 'Rajesh Sharma' });
  await expect(details).toContainText('This guest turned off reminder emails');
  await expect(details).toContainText(/Reminder (sent|queued)/);
  await expect(details.getByRole('button', { name: 'Send reminder' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(guests);

  // Automatic reminders: off until switched on.
  await page.getByRole('button', { name: 'Automatic reminders: Off' }).click();
  const settings = page.getByRole('dialog', { name: 'Automatic reminders' });
  await settings.getByLabel(/Send reminders before each ceremony/).check();
  await settings.getByLabel('7 days before').uncheck();
  await expectNoSeriousA11yIssues(page);
  await settings.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('button', { name: 'Automatic reminders: On' })).toBeVisible();
  expect(errors).toEqual([]);
});
