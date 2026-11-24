import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NavigationProgress } from './navigation-progress';

const address = vi.hoisted(() => ({ pathname: '/weddings/w1', search: '' }));
vi.mock('next/navigation', () => ({
  usePathname: () => address.pathname,
  useSearchParams: () => new URLSearchParams(address.search),
}));

beforeEach(() => {
  vi.useFakeTimers();
  address.pathname = '/weddings/w1';
  address.search = '';
  window.history.replaceState(null, '', '/weddings/w1');
});
afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  vi.useRealTimers();
});

function bar() {
  return document.querySelector('[data-phase]')?.getAttribute('data-phase');
}

function setup(links: string) {
  const view = render(
    <>
      <NavigationProgress />
      <div dangerouslySetInnerHTML={{ __html: links }} />
    </>,
  );
  return {
    click: (name: string) => {
      const link = [...document.querySelectorAll('a')].find((a) => a.textContent === name);
      if (!link) throw new Error(`No link ${name}`);
      // Stop jsdom navigating; the bar only reads the click.
      link.addEventListener('click', (event) => event.preventDefault(), { once: true });
      fireEvent.click(link);
    },
    arrive: (pathname: string) => {
      address.pathname = pathname;
      view.rerender(
        <>
          <NavigationProgress />
          <div dangerouslySetInnerHTML={{ __html: links }} />
        </>,
      );
    },
  };
}

describe('NavigationProgress', () => {
  it('shows while a slow page loads, and finishes when it arrives', () => {
    const page = setup('<a href="/weddings/w1/tasks">Tasks</a>');
    expect(bar()).toBe('idle');
    page.click('Tasks');
    act(() => vi.advanceTimersByTime(149));
    expect(bar()).toBe('idle');
    act(() => vi.advanceTimersByTime(1));
    expect(bar()).toBe('loading');

    page.arrive('/weddings/w1/tasks');
    expect(bar()).toBe('done');
    act(() => vi.advanceTimersByTime(400));
    expect(bar()).toBe('idle');
  });

  it('never shows for a page that arrives quickly', () => {
    const page = setup('<a href="/weddings/w1/tasks">Tasks</a>');
    page.click('Tasks');
    act(() => vi.advanceTimersByTime(80));
    page.arrive('/weddings/w1/tasks');
    act(() => vi.advanceTimersByTime(1000));
    expect(bar()).toBe('idle');
  });

  it('ignores links that load no new page', () => {
    setup(
      [
        '<a href="/weddings/w1">Same page</a>',
        '<a href="#main">Skip</a>',
        '<a href="https://example.com/">Elsewhere</a>',
        '<a href="/weddings/w1/tasks" target="_blank">New tab</a>',
        '<a href="/api/v1/weddings/w1/expense-files/f1" download>Receipt</a>',
      ].join(''),
    );
    for (const name of ['Same page', 'Skip', 'Elsewhere', 'New tab', 'Receipt']) {
      const link = [...document.querySelectorAll('a')].find((a) => a.textContent === name);
      link?.addEventListener('click', (event) => event.preventDefault(), { once: true });
      if (link) fireEvent.click(link);
    }
    act(() => vi.advanceTimersByTime(1000));
    expect(bar()).toBe('idle');
  });

  it('stays hidden when the click is stopped, as by "leave without saving?"', () => {
    setup('<a href="/weddings/w1/tasks">Tasks</a>');
    const guard = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };
    document.addEventListener('click', guard, true);
    const link = document.querySelector('a');
    if (link) fireEvent.click(link);
    document.removeEventListener('click', guard, true);
    act(() => vi.advanceTimersByTime(1000));
    expect(bar()).toBe('idle');
  });

  it('gives up if the page never arrives', () => {
    const page = setup('<a href="/weddings/w1/tasks">Tasks</a>');
    page.click('Tasks');
    act(() => vi.advanceTimersByTime(200));
    expect(bar()).toBe('loading');
    act(() => vi.advanceTimersByTime(15_000));
    expect(bar()).toBe('idle');
  });
});
