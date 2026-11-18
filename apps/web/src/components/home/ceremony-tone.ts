import type { CeremonyTone } from '@/content/home/sample-wedding';

/**
 * The colour code for each ceremony. The hero and the ceremony cards both show
 * it, so it lives here once: a ceremony must not change colour between two
 * sections of the same page.
 */
export const CEREMONY_TONE: Record<CeremonyTone, { dot: string; ring: string }> = {
  turmeric: { dot: 'bg-secondary-fixed', ring: 'ring-secondary-fixed/30' },
  mint: { dot: 'bg-primary-fixed', ring: 'ring-primary-fixed/30' },
  gold: { dot: 'bg-secondary', ring: 'ring-secondary/30' },
  highlight: { dot: 'bg-secondary-fixed', ring: 'ring-secondary-fixed/40' },
  stone: { dot: 'bg-outline-variant', ring: 'ring-surface-variant' },
};
