'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

/** Faster navigations finish before the bar would show, so it never flickers. */
const SHOW_AFTER_MS = 150;
/** Never left running if a navigation is abandoned without a new address. */
const GIVE_UP_AFTER_MS = 15_000;

type Phase = 'idle' | 'loading' | 'done';

/**
 * A same-site page address the click would go to, or null for anything else.
 * Not judged by `defaultPrevented`: Next's <Link> cancels the browser's own
 * navigation to do its own.
 */
function destinationOf(event: MouseEvent): URL | null {
  if (event.button !== 0) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  const link = (event.target as Element | null)?.closest?.('a[href]');
  if (!(link instanceof HTMLAnchorElement)) return null;
  if (link.target && link.target !== '_self') return null;
  if (link.hasAttribute('download')) return null;
  const url = new URL(link.href, window.location.href);
  if (url.origin !== window.location.origin) return null;
  // The API's own routes (files, downloads) aren't pages.
  if (url.pathname.startsWith('/api/')) return null;
  return url;
}

/**
 * A thin bar across the top of the window while the next page loads, so a
 * click that takes a second or two never looks like nothing happened. The
 * App Router has no navigation events, so it starts on a click on a link
 * to another page of the site (or the browser's back and forward) and
 * finishes when the address changes. Purely visual: the pages announce
 * their own loading states to screen readers.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const address = `${pathname}?${search}`;
  const [phase, setPhase] = useState<Phase>('idle');
  const [shown, setShown] = useState(address);
  if (shown !== address) {
    // Adjusted while rendering, as React recommends for state that follows a prop.
    setShown(address);
    setPhase((now) => (now === 'loading' ? 'done' : 'idle'));
  }
  const showTimer = useRef<number | undefined>(undefined);
  const giveUpTimer = useRef<number | undefined>(undefined);
  useEffect(() => {
    function clearTimers() {
      window.clearTimeout(showTimer.current);
      window.clearTimeout(giveUpTimer.current);
    }
    function start() {
      clearTimers();
      showTimer.current = window.setTimeout(() => setPhase('loading'), SHOW_AFTER_MS);
      giveUpTimer.current = window.setTimeout(() => setPhase('idle'), GIVE_UP_AFTER_MS);
    }
    function onClick(event: MouseEvent) {
      const url = destinationOf(event);
      // A link to this same page, or only to a part of it (#…), loads nothing.
      if (!url) return;
      const here = window.location;
      if (url.pathname === here.pathname && url.search === here.search) return;
      start();
    }
    // On window, as the click finishes bubbling: one that something stopped
    // on the way (the Settings page's "leave without saving?" guard, when
    // you stay) never gets here, and nothing loads.
    window.addEventListener('click', onClick);
    window.addEventListener('popstate', start);
    return () => {
      clearTimers();
      window.removeEventListener('click', onClick);
      window.removeEventListener('popstate', start);
    };
  }, []);

  // The new page is here: stop a bar that hasn't shown yet…
  useEffect(() => {
    window.clearTimeout(showTimer.current);
    window.clearTimeout(giveUpTimer.current);
  }, [address]);
  // …and let one that has run to the end, then hide.
  useEffect(() => {
    if (phase !== 'done') return;
    const hide = window.setTimeout(() => setPhase('idle'), 400);
    return () => window.clearTimeout(hide);
  }, [phase]);

  return (
    <div
      aria-hidden="true"
      data-phase={phase}
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]"
    >
      <div
        className={`h-full origin-left bg-primary shadow-[0_0_8px] shadow-primary/40 ${
          phase === 'idle'
            ? 'scale-x-0 opacity-0 transition-none'
            : phase === 'loading'
              ? 'navigation-progress-run opacity-100'
              : 'scale-x-100 opacity-0 transition-[transform,opacity] duration-300 ease-out'
        }`}
      />
    </div>
  );
}
