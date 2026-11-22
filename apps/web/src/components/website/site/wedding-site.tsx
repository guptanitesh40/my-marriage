import type { Site } from '@/lib/website/site';
import { ThemedSite } from './themed-site';

/**
 * A wedding website in its design. All three read the same content and
 * differ only in presentation (PRD SITE-02, decision 0017), so switching
 * designs can never lose or change a word.
 */
export function WeddingSite({ site }: { site: Site }) {
  // A new design starts fresh (questions closed, livestream not playing).
  return <ThemedSite key={site.templateId} site={site} />;
}
