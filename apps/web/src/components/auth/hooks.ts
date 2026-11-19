'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * The secret from an emailed link (`/reset-password#token=…`): undefined
 * until read, null when the link has none.
 *
 * It travels in the fragment, which browsers never send to a server. Once
 * read, it is removed from the address bar and from history, so it is not
 * left behind on a shared computer or in a screenshot.
 */
export function useLinkToken(): string | null | undefined {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    function take(): string | null {
      const { hash, pathname, search } = window.location;
      const match = /^#token=([A-Za-z0-9_-]{20,100})$/.exec(hash);
      if (hash) window.history.replaceState(window.history.state, '', `${pathname}${search}`);
      return match?.[1] ?? null;
    }
    // The fragment only exists in the browser, so it can only be read after
    // hydration; the first render shows the "checking" state. In development
    // React runs this effect twice, and the second run finds the fragment
    // already removed: keep what the first run took.
    const found = take();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToken((previous) => found ?? previous ?? null);
    // A link pasted into a tab already showing this page changes only the
    // fragment: no page load, so listen for it.
    const onHashChange = () => {
      const next = take();
      if (next) setToken(next);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  return token;
}

/**
 * After a failed submit, moves focus to the first invalid field, or else to
 * the form's alert, so keyboard and screen reader users land on the problem.
 * Call `focusProblem()` after setting the errors.
 */
export function useFocusFirstProblem(form: RefObject<HTMLFormElement | null>) {
  const [request, setRequest] = useState(0);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const target = form.current?.querySelector<HTMLElement>(
      '[aria-invalid="true"], [role="alert"]',
    );
    target?.focus();
  }, [form, request]);
  return () => setRequest((count) => count + 1);
}

/** Leaves the page with a full load, so the next page renders with the new session cookie. */
export function goTo(path: string): void {
  window.location.assign(path);
}
