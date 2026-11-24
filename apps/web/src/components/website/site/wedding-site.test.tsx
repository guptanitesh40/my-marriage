import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Site } from '@/lib/website/site';
import { WeddingSite } from './wedding-site';

afterEach(cleanup);

const site: Site = {
  slug: 'ananya-arjun',
  templateId: 'traditional',
  brideName: 'Ananya',
  groomName: 'Arjun',
  coupleName: 'Ananya & Arjun',
  city: 'Jaipur',
  state: 'Rajasthan',
  headline: 'We’re getting married in Jaipur',
  story: 'It began in Mumbai.\n\nNow, Jaipur.',
  faq: [{ question: 'What should I wear?', answer: 'Festive Indian wear.' }],
  dateRange: { start: '2027-02-12', end: '2027-02-14' },
  events: [
    {
      title: 'Haldi Rasam',
      startDate: '2027-02-12',
      startTime: '10:30',
      timeZone: 'Asia/Kolkata',
      venueName: 'Rajvilas Poolside Gardens',
      mapsUrl: 'https://maps.app.goo.gl/abc123',
      dressCode: 'Yellow hues',
      cancelled: false,
    },
    {
      title: 'Pheras',
      startDate: '2027-02-14',
      timeZone: 'Asia/Kolkata',
      livestreamVideoId: 'dQw4w9WgXcQ',
      cancelled: false,
    },
    { title: 'Mehendi', timeZone: 'Asia/Kolkata', cancelled: true },
  ],
  preview: true,
};

describe('WeddingSite', () => {
  for (const templateId of ['traditional', 'modern', 'royal'] as const) {
    it(`shows the main venue with directions in the ${templateId} design only when it is shared`, () => {
      const venue = {
        name: 'Rambagh Palace',
        address: 'Bhawani Singh Road, Jaipur',
        mapsUrl: 'https://maps.app.goo.gl/venue1',
      };
      render(<WeddingSite site={{ ...site, templateId, mainVenue: venue }} />);
      const card = screen.getByRole('region', { name: 'Rambagh Palace' });
      expect(within(card).getByText('Bhawani Singh Road, Jaipur')).toBeTruthy();
      expect(
        within(card)
          .getByRole('link', { name: /Get directions to the wedding venue/ })
          .getAttribute('href'),
      ).toBe('https://maps.app.goo.gl/venue1');
      cleanup();
      render(<WeddingSite site={{ ...site, templateId }} />);
      expect(screen.queryByText('The wedding venue')).toBeNull();
    });
  }

  for (const templateId of ['traditional', 'modern', 'royal'] as const) {
    it(`shows every part of the content in the ${templateId} design`, () => {
      render(<WeddingSite site={{ ...site, templateId }} />);
      expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Ananya\s*&\s*Arjun/);
      expect(screen.getByText('It began in Mumbai.')).toBeTruthy();
      expect(screen.getByText('Now, Jaipur.')).toBeTruthy();
      expect(screen.getByRole('heading', { name: 'Haldi Rasam' })).toBeTruthy();
      expect(screen.getByText('10:30 am IST')).toBeTruthy();
      expect(screen.getAllByText(/Yellow hues/).length).toBeGreaterThan(0);
      expect(
        screen.getByRole('link', { name: /Get directions to Haldi Rasam/ }).getAttribute('href'),
      ).toBe('https://maps.app.goo.gl/abc123');
      expect(screen.getByText('This celebration has been cancelled.')).toBeTruthy();
      expect(screen.getByText('Festive Indian wear.')).toBeTruthy();
      expect(screen.getByText(/Your private invitation link opens your RSVP/)).toBeTruthy();
      const nav = screen.getByRole('navigation', { name: 'Website sections' });
      expect(within(nav).getAllByRole('link')).toHaveLength(4);
      // The welcome card's button, and the phone's bar that stays on screen.
      const replies = screen.getAllByRole('link', { name: /RSVP for celebrations/ });
      expect(replies.map((link) => link.getAttribute('href'))).toEqual(['#rsvp', '#rsvp']);
      // Each day links to its first ceremony, from the day chips and "At a glance".
      const days = screen.getByRole('navigation', { name: 'Jump to a day' });
      expect(
        within(days)
          .getAllByRole('link')
          .map((link) => link.textContent),
      ).toEqual(['Day 1 · 12 Feb', 'Day 2 · 14 Feb']);
      expect(
        screen.getByRole('link', { name: /Day 2\s*Sun 14 Feb 2027/ }).getAttribute('href'),
      ).toBe('#celebrations-day-2');
      expect(document.getElementById('celebrations-day-2')?.textContent).toContain('Pheras');
      expect(screen.getByText('Guests answer here')).toBeTruthy();

      // The player loads only when asked.
      expect(document.querySelector('iframe')).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: /livestream of Pheras/ }));
      expect(document.querySelector('iframe')?.getAttribute('src')).toBe(
        'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0',
      );
    });
  }

  it('leaves out sections the couple has not written, and says ceremonies are coming', () => {
    render(
      <WeddingSite site={{ ...site, templateId: 'modern', story: '', faq: [], events: [] }} />,
    );
    const nav = screen.getByRole('navigation', { name: 'Website sections' });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Celebrations', 'RSVP']);
    expect(screen.getByText('The couple will share their celebrations here soon.')).toBeTruthy();
    expect(screen.queryByText('Questions')).toBeNull();
  });
});

describe('ceremony rows', () => {
  it('never leaves half a row empty', async () => {
    const { fullRows } = await import('./themed-site');
    const plain = { cancelled: false };
    const live = { cancelled: false, livestreamVideoId: 'dQw4w9WgXcQ' };
    // Two, two, then a lone last card that takes its row.
    expect(fullRows([plain, plain, plain, plain, plain])).toEqual([
      false,
      false,
      false,
      false,
      true,
    ]);
    // A card alone before a livestream takes its row too.
    expect(fullRows([plain, plain, plain, live, plain, plain])).toEqual([
      false,
      false,
      true,
      true,
      false,
      false,
    ]);
    expect(fullRows([])).toEqual([]);
  });
});
