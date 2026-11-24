'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef } from 'react';

/** The query parameter that asks a page to open its "add" form: `?new=1`. */
export const OPEN_NEW_PARAM = 'new';

function Opener({ open }: { open: () => void }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const wanted = params.get(OPEN_NEW_PARAM) === '1';
  const opened = useRef(false);
  // Read the latest `open` without making it a reason to run again.
  const latest = useRef(open);
  useEffect(() => {
    latest.current = open;
  });

  useEffect(() => {
    if (!wanted || opened.current) return;
    opened.current = true;
    // The dialog is in the page, so it can only open once the page is shown.
    latest.current();
    // Drop the parameter, so a refresh or the back button doesn't open it again.
    const rest = new URLSearchParams(params.toString());
    rest.delete(OPEN_NEW_PARAM);
    const search = rest.toString();
    router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
  }, [wanted, params, pathname, router]);

  return null;
}

/**
 * Opens a page's "add" drawer when the page was reached with `?new=1`, as
 * the overview's quick actions do (decision 0022). Renders nothing; does
 * nothing on a read-only page, where there is no form to open (`null`).
 */
export function OpenOnArrival({ open }: { open: (() => void) | null }) {
  if (!open) return null;
  return (
    <Suspense fallback={null}>
      <Opener open={open} />
    </Suspense>
  );
}
