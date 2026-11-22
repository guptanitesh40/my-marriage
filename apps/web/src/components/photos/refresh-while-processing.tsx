'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** How often to look again while photos are being processed, and for how long at most. */
const EVERY_MS = 2500;
const AT_MOST = 40;

/**
 * Reloads the album while received photos are still being checked, so each
 * appears when ready without the couple reloading. Stops once none are.
 */
export function RefreshWhileProcessing({ processing }: { processing: number }) {
  const router = useRouter();
  useEffect(() => {
    if (processing === 0) return;
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      if (tries > AT_MOST) window.clearInterval(timer);
      else router.refresh();
    }, EVERY_MS);
    return () => window.clearInterval(timer);
  }, [processing, router]);
  return null;
}
