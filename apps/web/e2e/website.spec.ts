import { expect, type Page } from '@playwright/test';
import {
  collectErrors,
  expectNoHorizontalScroll,
  expectNoSeriousA11yIssues,
  VIEWPORTS,
} from './support/checks';
import { createWedding, signUpVerified, WORKSPACE } from './support/journeys';
import { uniqueEmail } from './support/mail';
import { newVisitor, test } from './support/visitor';

/** A verified owner with a wedding, on its Wedding Website page. */
async function ownerAtWebsite(page: Page) {
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
  await page.goto(`${weddingPath}/website`);
  await expect(page.getByRole('heading', { level: 1, name: 'Wedding Website' })).toBeVisible();
  return { weddingId, website: `${weddingPath}/website` };
}

for (const viewport of VIEWPORTS) {
  test(`the website page fits and is accessible at ${viewport.width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const errors = collectErrors(page);
    await ownerAtWebsite(page);
    await expect(page.getByText('Draft · Not published')).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoSeriousA11yIssues(page);
    await testInfo.attach(`website-${viewport.width}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
    expect(errors).toEqual([]);
  });
}

test('the builder saves a draft, shows it live, then publishes and unpublishes the site', async ({
  page,
  browser,
}) => {
  const errors = collectErrors(page);
  const { weddingId } = await ownerAtWebsite(page);
  await expect(page.getByText('Draft · Not published')).toBeVisible();
  const editor = page.getByRole('region', { name: 'Website editor' });
  const preview = page.getByRole('region', { name: 'Live preview' });
  await expect(editor.getByRole('tab')).toHaveText([
    'Basics',
    'Ceremonies',
    'FAQ',
    'Appearance & Styles',
  ]);
  await expect(editor.getByLabel('Public wedding URL')).toHaveValue(/^ananya-arjun/);
  const slug = await editor.getByLabel('Public wedding URL').inputValue();

  // Words typed show in the live preview before they are saved.
  await editor.getByLabel('Welcome headline').fill('We’re getting married in Jaipur');
  await editor.getByLabel('Our story').fill('It began in Mumbai.\n\nNow, Jaipur.');
  await expect(preview.getByText('We’re getting married in Jaipur')).toBeVisible();
  await expect(editor.getByText('Unsaved changes')).toBeVisible();

  await editor.getByRole('tab', { name: 'FAQ' }).click();
  await editor.getByRole('button', { name: 'Add FAQ' }).click();
  await editor.getByLabel('Question 1').fill('What should I wear?');
  await editor.getByLabel('Answer 1').fill('Festive Indian wear.');

  await editor.getByRole('tab', { name: 'Appearance & Styles' }).click();
  await editor.getByText('Royal Heritage').click();
  await expect(editor.getByRole('radio', { name: /Royal Heritage/ })).toBeChecked();
  await editor.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByText('Draft saved', { exact: true }).first()).toBeVisible();

  await page.reload();
  await expect(editor.getByLabel('Welcome headline')).toHaveValue(
    'We’re getting married in Jaipur',
  );
  await editor.getByRole('tab', { name: 'Appearance & Styles' }).click();
  await expect(editor.getByRole('radio', { name: /Royal Heritage/ })).toBeChecked();

  // Publishing needs a ceremony.
  await page.getByRole('button', { name: 'Publish website' }).click();
  const publish = page.getByRole('dialog', { name: 'Ready to share your wedding website?' });
  await expect(publish).toContainText('Add at least one ceremony on the Events page.');
  await expect(publish.getByRole('button', { name: 'Confirm & publish' })).toBeDisabled();
  await publish.getByRole('button', { name: 'Cancel' }).click();
  const res = await page.request.post(`/api/v1/weddings/${weddingId}/events`, {
    data: { title: 'Haldi', startDate: '2031-02-12' },
  });
  expect(res.status()).toBe(201);
  await page.reload();
  await editor.getByRole('tab', { name: 'Ceremonies' }).click();
  await expect(editor.getByText('Haldi')).toBeVisible();
  await page.getByRole('button', { name: 'Publish website' }).click();
  await expect(publish).toContainText('1 ceremony ready to display');
  await publish.getByRole('button', { name: 'Confirm & publish' }).click();
  await expect(page.getByText('Published · Live')).toBeVisible();
  await expect(page.getByText(/Website is live at/)).toBeVisible();

  // Anyone can open it now.
  const visitor = await newVisitor(browser);
  const tab = await visitor.newPage();
  await tab.goto(`/w/${slug}`);
  await expect(tab.getByRole('heading', { level: 1 })).toHaveText(/Ananya\s*&\s*Arjun/);
  await expect(tab.getByText('We’re getting married in Jaipur')).toBeVisible();

  await page.getByRole('button', { name: 'Unpublish' }).click();
  const unpublish = page.getByRole('dialog', { name: 'Unpublish website?' });
  await unpublish.getByRole('button', { name: 'Unpublish site' }).click();
  await expect(page.getByText('Draft · Not published')).toBeVisible();
  await tab.reload();
  await expect(
    tab.getByRole('heading', { level: 1, name: 'This wedding website isn’t available' }),
  ).toBeVisible();
  await visitor.close();
  expect(errors).toEqual([]);
});

test('an unknown website address reveals nothing', async ({ page }) => {
  await page.goto('/w/no-such-wedding-here');
  await expect(
    page.getByRole('heading', { level: 1, name: 'This wedding website isn’t available' }),
  ).toBeVisible();
  await expectNoHorizontalScroll(page);
  await expectNoSeriousA11yIssues(page);
});

test('another wedding’s website page is simply not found', async ({ page, browser }) => {
  const theirs = await ownerAtWebsite(page);
  const other = await newVisitor(browser);
  const tab = await other.newPage();
  await ownerAtWebsite(tab);
  await tab.goto(theirs.website);
  await expect(
    tab.getByRole('heading', { level: 1, name: 'We couldn’t find that wedding' }),
  ).toBeVisible();
  expect((await tab.request.get(`/api/v1/weddings/${theirs.weddingId}/website`)).status()).toBe(
    404,
  );
  await other.close();
});

/**
 * A wedding whose website carries the Stitch designs' own sample content:
 * a two-paragraph story, four ceremonies (one without a time or venue, one
 * with a livestream), a cancelled one, and three questions.
 */
async function websiteWithContent(page: Page, weddingId: string) {
  const events = `/api/v1/weddings/${weddingId}/events`;
  const add = async (data: object) => {
    const res = await page.request.post(events, { data });
    expect(res.status(), await res.text()).toBe(201);
    return ((await res.json()) as { data: { id: string } }).data.id;
  };
  await add({
    title: 'Haldi Rasam',
    startDate: '2031-02-12',
    startTime: '10:30',
    venue: {
      name: 'Rajvilas Poolside Gardens',
      address: 'Jaipur',
      mapsUrl: 'https://maps.app.goo.gl/abc123',
    },
    dressCode: 'Yellow hues & floral prints',
  });
  await add({
    title: 'Sangeet & Musical Night',
    startDate: '2031-02-13',
    startTime: '19:00',
    venue: {
      name: 'Royal Haveli Courtyard',
      address: 'Jaipur',
      mapsUrl: 'https://maps.app.goo.gl/def456',
    },
    dressCode: 'Indo-western glam & sparkles',
  });
  await add({
    title: 'Pheras & Wedding Ceremony',
    startDate: '2031-02-14',
    startTime: '16:00',
    venue: {
      name: 'Temple Pavilion Lawn',
      address: 'Jaipur',
      mapsUrl: 'https://maps.app.goo.gl/ghi789',
    },
    dressCode: 'Regal traditional attire (sherwanis & lehengas)',
    livestreamUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  });
  await add({ title: 'Gala Reception', startDate: '2031-02-15', dressCode: 'Formal evening wear' });
  const mehendi = await add({ title: 'Mehendi Ceremony' });
  const cancel = await page.request.patch(`${events}/${mehendi}`, { data: { state: 'cancelled' } });
  expect(cancel.status()).toBe(200);
  const saved = await page.request.patch(`/api/v1/weddings/${weddingId}/website`, {
    data: {
      contentVersion: 0,
      content: {
        headline: 'We’re getting married in Jaipur',
        story:
          'It began in Mumbai with shared conversations tucked away in quiet coastal cafes and late evening walks along the curving sweep of Marine Drive. What started as kindred laughter quickly grew into a steadfast bond anchored by common dreams, enduring friendship, and an unmistakable sense of home in one another.\n\nNow, surrounded by the heritage pink stone walls, open starlit courtyards, and fragrant marigold arches of Jaipur, we look forward to uniting our families and traditions. We cannot wait to celebrate this milestone together with the people who have shaped our lives.',
        faq: [
          {
            question: 'What should I wear?',
            answer:
              'Jaipur in mid-February enjoys pleasant, sunny afternoons and brisk evenings. For daytime ceremonies like Haldi, light fabrics and festive florals are ideal; for the evening functions, rich silks and a shawl for after sunset.',
          },
          { question: 'Is there parking at the venues?', answer: 'Valet at every venue.' },
          {
            question: 'Will there be transport between venues?',
            answer: 'Shuttles run between the partner hotels and every venue.',
          },
        ],
      },
    },
  });
  expect(saved.status(), await saved.text()).toBe(200);
}

test('previews the saved draft full page in each design, with the same content', async ({
  page,
}, testInfo) => {
  const errors = collectErrors(page);
  const { weddingId } = await ownerAtWebsite(page);
  await websiteWithContent(page, weddingId);
  await page.reload();
  await expect(page.getByRole('link', { name: 'Preview website' })).toHaveAttribute(
    'href',
    `/weddings/${weddingId}/website/preview`,
  );
  await page.goto(`/weddings/${weddingId}/website/preview`);
  await expect(page.getByText('Preview of your saved draft.')).toBeVisible();
  // Outside the workspace: no organizer navigation around the site.
  await expect(page.getByRole('navigation', { name: 'Workspace' })).toHaveCount(0);

  for (const [id, label] of [
    ['traditional', 'Traditional Serene'],
    ['modern', 'Modern Minimal'],
    ['royal', 'Royal Heritage'],
  ] as const) {
    await page
      .getByRole('navigation', { name: 'Preview in another design' })
      .getByRole('link', { name: label })
      .click();
    await expect(page).toHaveURL(new RegExp(`template=${id}$`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Ananya\s*&\s*Arjun/);
    await expect(page.getByText('We’re getting married in Jaipur')).toBeVisible();
    await expect(page.getByText(/^It began in Mumbai/)).toBeVisible();
    await expect(page.getByText(/^Now, surrounded by the heritage/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Haldi Rasam' })).toBeVisible();
    await expect(page.getByText('Yellow hues & floral prints')).toBeVisible();
    await expect(page.getByText('10:30 am IST')).toBeVisible();
    await expect(page.getByRole('link', { name: /Get directions to Haldi Rasam/ })).toHaveAttribute(
      'href',
      'https://maps.app.goo.gl/abc123',
    );
    await expect(page.getByText('This celebration has been cancelled.')).toBeVisible();
    await expect(page.getByText(/^Jaipur in mid-February/)).toBeVisible();
    await expect(page.getByText('Valet at every venue.')).toBeHidden();
    await page.getByText('Is there parking at the venues?').click();
    await expect(page.getByText('Valet at every venue.')).toBeVisible();
    // Nothing loads from YouTube until a guest presses play.
    await expect(page.locator('iframe')).toHaveCount(0);

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await expectNoHorizontalScroll(page);
      await testInfo.attach(`preview-${id}-${viewport.width}`, {
        body: await page.screenshot({ fullPage: true, animations: 'disabled' }),
        contentType: 'image/png',
      });
    }
    await expectNoSeriousA11yIssues(page);
  }

  await page.getByRole('button', { name: /livestream of Pheras & Wedding Ceremony/ }).click();
  await expect(page.locator('iframe')).toHaveAttribute(
    'src',
    'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0',
  );
  expect(errors).toEqual([]);
});

test('the preview is for the wedding’s members only', async ({ page, browser }) => {
  const theirs = await ownerAtWebsite(page);
  const preview = `${theirs.website}/preview`;

  const stranger = await newVisitor(browser);
  const tab = await stranger.newPage();
  await tab.goto(preview);
  await expect(tab).toHaveURL(/\/login\?next=/);
  await ownerAtWebsite(tab);
  await tab.goto(preview);
  await expect(
    tab.getByRole('heading', { level: 1, name: 'We couldn’t find that wedding' }),
  ).toBeVisible();
  await expect(tab.getByText('Preview of your saved draft.')).toHaveCount(0);
  expect(
    (await tab.request.get(`/api/v1/weddings/${theirs.weddingId}/website/preview`)).status(),
  ).toBe(404);
  await stranger.close();
});

// A 4×4 PNG: small, but a real image the browser can read and shrink.
const PHOTO = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEUlEQVR4nGM4MS0FjhiI4wAA4dIcIR+QGUQAAAAASUVORK5CYII=',
  'base64',
);

test('a cover photo is uploaded in the builder, previewed, and shown to guests once published', async ({
  page,
  browser,
}) => {
  const errors = collectErrors(page);
  const { weddingId } = await ownerAtWebsite(page);
  const res = await page.request.post(`/api/v1/weddings/${weddingId}/events`, {
    data: { title: 'Haldi', startDate: '2031-02-12' },
  });
  expect(res.status()).toBe(201);
  await page.reload();
  const editor = page.getByRole('region', { name: 'Website editor' });
  await editor.getByText('Upload a cover photo').click();
  await editor
    .locator('input[type=file]')
    .setInputFiles({ name: 'us.png', mimeType: 'image/png', buffer: PHOTO });
  const cover = editor.getByRole('img', { name: 'Your website’s cover photo' });
  await expect(cover).toBeVisible();
  await expect
    .poll(() => cover.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
  const slug = await editor.getByLabel('Public wedding URL').inputValue();

  await page.getByRole('button', { name: 'Publish website' }).click();
  await page.getByRole('button', { name: 'Confirm & publish' }).click();
  await expect(page.getByText('Published · Live')).toBeVisible();

  const visitor = await newVisitor(browser);
  const tab = await visitor.newPage();
  await tab.goto(`/w/${slug}`);
  const hero = tab.locator(`img[src^="/api/v1/public/weddings/${slug}/cover"]`);
  await expect(hero).toHaveCount(1);
  await expect
    .poll(() => hero.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
  await visitor.close();

  // Taking it off, then publishing, removes it for guests.
  await editor.getByRole('button', { name: 'Remove' }).click();
  await editor.getByRole('button', { name: 'Save draft' }).click();
  await expect(editor.getByText('Upload a cover photo')).toBeVisible();
  expect(errors).toEqual([]);
});

test('the couple chooses to show the main venue and map, and guests see it once published', async ({
  page,
  browser,
}) => {
  const errors = collectErrors(page);
  const { weddingId, website } = await ownerAtWebsite(page);
  const editor = page.getByRole('region', { name: 'Website editor' });
  const preview = page.getByRole('region', { name: 'Live preview' });

  // No venue in Settings yet: the builder says where to add it.
  await expect(editor.getByText('No main venue yet.')).toBeVisible();
  await expect(editor.getByRole('link', { name: 'Add it in Settings' })).toBeVisible();

  const saved = await page.request.patch(`/api/v1/weddings/${weddingId}`, {
    data: {
      mainVenue: {
        name: 'Rambagh Palace',
        address: 'Bhawani Singh Road, Jaipur',
        mapsUrl: 'https://maps.app.goo.gl/AbCdEf123',
      },
      description: 'Private note for the team',
    },
  });
  expect(saved.status()).toBe(200);
  expect(
    (
      await page.request.post(`/api/v1/weddings/${weddingId}/events`, {
        data: { title: 'Haldi', startDate: '2031-02-12' },
      })
    ).status(),
  ).toBe(201);
  await page.goto(website);

  const choice = editor.getByRole('checkbox', {
    name: /Show the venue address and map on my website/,
  });
  await expect(choice).not.toBeChecked();
  await expect(editor).toContainText(
    'Rambagh Palace · Bhawani Singh Road, Jaipur · with a map link',
  );
  await expect(preview.getByText('The wedding venue')).toHaveCount(0);
  await choice.check();
  // Shown in the live preview before it is saved.
  await expect(preview.getByRole('heading', { name: 'Rambagh Palace' })).toBeVisible();

  await page.getByRole('button', { name: 'Publish website' }).click();
  await page.getByRole('button', { name: 'Confirm & publish' }).click();
  await expect(page.getByText('Published · Live')).toBeVisible();
  const slug = await editor.getByLabel('Public wedding URL').inputValue();

  const visitor = await newVisitor(browser);
  const tab = await visitor.newPage();
  await tab.goto(`/w/${slug}`);
  const venue = tab.getByRole('region', { name: 'Rambagh Palace' });
  await expect(venue).toContainText('Bhawani Singh Road, Jaipur');
  await expect(
    venue.getByRole('link', { name: /Get directions to the wedding venue/ }),
  ).toHaveAttribute('href', 'https://maps.app.goo.gl/AbCdEf123');
  await expect(tab.getByText('Private note for the team')).toHaveCount(0);
  await expectNoHorizontalScroll(tab);

  // Turned off and published again: gone.
  await choice.uncheck();
  await page.getByRole('button', { name: 'Update published site' }).click();
  await page.getByRole('button', { name: 'Confirm & update' }).click();
  await expect(page.getByText('Published · Live')).toBeVisible();
  await expect
    .poll(async () => {
      await tab.reload();
      return tab.getByText('The wedding venue').count();
    })
    .toBe(0);
  expect(errors).toEqual([]);
});

test('on a phone the website leads with RSVP one tap away and lets guests jump to a day; on a desktop neither shows', async ({
  page,
  browser,
}, testInfo) => {
  const { weddingId } = await ownerAtWebsite(page);
  for (const [title, startDate] of [
    ['Haldi', '2031-02-12'],
    ['Wedding', '2031-02-14'],
  ] as const) {
    const res = await page.request.post(`/api/v1/weddings/${weddingId}/events`, {
      data: { title, startDate },
    });
    expect(res.status()).toBe(201);
  }
  const published = await page.request.post(`/api/v1/weddings/${weddingId}/website/publish`, {
    data: { contentVersion: 0 },
  });
  expect(published.status()).toBe(200);
  const slug = ((await published.json()) as { data: { slug: string } }).data.slug;

  const visitor = await newVisitor(browser);
  const phone = await visitor.newPage();
  await phone.setViewportSize({ width: 360, height: 780 });
  // A visitor without a private link: the RSVP section's check answers 401.
  const errors = collectErrors(phone, ['/api/v1/guest-access/invitation']);
  await phone.goto(`/w/${slug}`);
  const reply = phone.getByRole('link', { name: 'RSVP for celebrations' }).last();
  await expect(reply).toBeInViewport();
  const days = phone.getByRole('navigation', { name: 'Jump to a day' });
  await days.getByRole('link', { name: /Day 2/ }).click();
  await expect(phone).toHaveURL(/#celebrations-day-2$/);
  await expect(phone.getByRole('heading', { name: 'Wedding', exact: true })).toBeInViewport();
  // Replying stays one tap away while scrolling.
  await expect(reply).toBeInViewport();
  await expectNoHorizontalScroll(phone);
  await expectNoSeriousA11yIssues(phone);
  await testInfo.attach('website-phone', {
    body: await phone.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });

  await phone.setViewportSize({ width: 1280, height: 900 });
  await expect(days).toBeHidden();
  // Only the welcome card's button: the phone's bar is gone.
  await expect(phone.getByRole('link', { name: 'RSVP for celebrations' })).toHaveCount(1);
  expect(errors).toEqual([]);
});
