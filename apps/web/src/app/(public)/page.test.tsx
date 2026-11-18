import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SiteHeader } from '@/components/home/site-header';
import { homeSections, routes } from '@/lib/routes';
import HomePage from './page';

afterEach(cleanup);

function renderHome() {
  return render(
    <>
      <SiteHeader />
      <main>
        <HomePage />
      </main>
    </>,
  );
}

describe('homepage', () => {
  it('has exactly one h1, the product promise', () => {
    renderHome();
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]?.textContent).toMatch(/Every celebration\.\s*One beautiful plan\./);
  });

  it('renders the sections in the approved order', () => {
    renderHome();
    const titles = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(titles).toEqual([
      expect.stringMatching(/^One wedding\./),
      expect.stringMatching(/^All the details\./),
      expect.stringMatching(/^From “we’re getting married”/),
      expect.stringMatching(/^Your story deserves/),
      expect.stringMatching(/^Bring everyone together\./),
      expect.stringMatching(/^Everything you need to begin\./),
      expect.stringMatching(/^Your celebration starts/),
      'Frequently asked questions',
    ]);
  });

  it('gives every in-page link a target that exists', () => {
    const { container } = renderHome();
    const anchors = [...container.querySelectorAll<HTMLAnchorElement>('a[href*="#"]')];
    expect(anchors.length).toBeGreaterThan(0);
    for (const anchor of anchors) {
      const id = anchor.getAttribute('href')?.split('#')[1] ?? '';
      expect(id, anchor.outerHTML).not.toBe('');
      expect(container.querySelector(`#${id}`), `#${id}`).not.toBeNull();
    }
    for (const id of Object.values(homeSections)) {
      expect(container.querySelector(`#${id}`), `#${id}`).not.toBeNull();
    }
  });

  it('only links to known routes or homepage sections', () => {
    const { container } = renderHome();
    const allowed = new Set<string>(Object.values(routes));
    for (const anchor of container.querySelectorAll('a')) {
      const href = anchor.getAttribute('href') ?? '';
      const path = href.split('#')[0] ?? '';
      expect(href, anchor.outerHTML).not.toBe('#');
      expect(allowed.has(path) || path === '', href).toBe(true);
    }
  });

  it('sends every sign-up call to action to the login route', () => {
    renderHome();
    const ctas = screen.getAllByRole('link', { name: /start planning free|log in/i });
    expect(ctas.length).toBeGreaterThanOrEqual(4);
    for (const cta of ctas) expect(cta.getAttribute('href')).toBe(routes.login);
  });

  it('has no buttons except the preview tabs', () => {
    renderHome();
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    for (const button of document.querySelectorAll('button')) {
      expect(button.getAttribute('role'), button.outerHTML).toBe('tab');
    }
  });

  it('builds the FAQ from native, mutually exclusive disclosures', () => {
    const { container } = renderHome();
    const faq = container.querySelector(`#${homeSections.faq}`);
    expect(faq).not.toBeNull();
    const items = faq?.querySelectorAll('details') ?? [];
    expect(items.length).toBe(6);
    for (const item of items) {
      expect(item.getAttribute('name')).toBe('faq');
      expect(item.hasAttribute('open')).toBe(false);
    }
  });

  it('describes the mock-ups to screen readers instead of reading out sample numbers', () => {
    renderHome();
    expect(screen.getByRole('img', { name: /example planning dashboard/i })).toBeTruthy();
    expect(screen.getAllByRole('img', { name: /wedding website template/i })).toHaveLength(3);
  });

  // The Stitch design was AI-generated and promised features the PRD does
  // not include. These must not come back through a later copy edit.
  it.each([
    [/\bSMS\b/i, 'invitations are sent by email or shared on WhatsApp'],
    [/dietary/i, 'no dietary information is collected'],
    [/budget/i, 'expenses and payments only, no budgets'],
    [/uncompressed|raw (photo|candid)/i, 'originals are kept, not "raw" files'],
    [/role-based|without exposing/i, 'managers are not restricted per event or per budget'],
    [/ctrl\s*\+\s*k|live sync/i, 'not features'],
    [/stay guide/i, 'not a website page'],
    [/\/i\/[a-z]+-family/i, 'invitation links are random tokens, never names'],
    [/mymarriage\.com/i, 'no domain has been chosen'],
  ])('does not claim %s (%s)', (pattern) => {
    const { container } = renderHome();
    // Includes the content of every tab panel, hidden or not.
    expect(container.textContent).not.toMatch(pattern);
  });

  it('labels people and contacts distinctly in the guest preview', () => {
    renderHome();
    // The table lives in a tab panel that is hidden until its tab is chosen.
    const table = screen.getByRole('table', {
      name: /people invited and confirmed/i,
      hidden: true,
    });
    const headers = within(table)
      .getAllByRole('columnheader', { hidden: true })
      .map((th) => th.textContent);
    expect(headers).toEqual([
      'Ceremony',
      'People invited',
      'People coming',
      'Families yet to reply',
    ]);
  });
});
