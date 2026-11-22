import type { Site } from '@/lib/website/site';

export type SectionId = 'story' | 'celebrations' | 'rsvp' | 'faq';

/**
 * The sections a website has, in order. Celebrations and RSVP always show
 * (an empty list says they are coming; RSVP tells visitors how to answer);
 * the story and questions only when the couple wrote them, so no design
 * shows an empty heading.
 */
export function sectionsOf(site: Pick<Site, 'story' | 'faq'>): SectionId[] {
  return [
    ...(site.story?.trim() ? (['story'] as const) : []),
    'celebrations',
    'rsvp',
    ...(site.faq.length > 0 ? (['faq'] as const) : []),
  ];
}

/** The same anchors in every design, so a shared link opens the same section. */
export const SECTION_ANCHORS: Record<SectionId, string> = {
  story: 'story',
  celebrations: 'celebrations',
  rsvp: 'rsvp',
  faq: 'faq',
};

export const NO_CELEBRATIONS = 'The couple will share their celebrations here soon.';

export const PRIVATE_REPLY_NOTE = 'Your private invitation link opens your RSVP here.';

export const RSVP_CTA = 'RSVP for celebrations';
