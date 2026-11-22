/** Wedding website rules and limits, in one place for review (decision 0017). */

/** The three templates (PRD SITE-02); they share one content model. */
export const WEBSITE_TEMPLATES = ['traditional', 'modern', 'royal'] as const;
export type WebsiteTemplate = (typeof WEBSITE_TEMPLATES)[number];

export const DEFAULT_TEMPLATE: WebsiteTemplate = 'traditional';

export const WEBSITE_LIMITS = {
  headline: 120,
  story: 4000,
  faqItems: 20,
  question: 200,
  answer: 1500,
} as const;

/**
 * The website's cover photo (decision 0018). The browser shrinks photos
 * before uploading, so the limit is generous; the type is checked from
 * the file's own bytes, never the name or the declared type.
 */
export const COVER_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type CoverType = (typeof COVER_TYPES)[number];
export const COVER_MAX_BYTES = 10 * 1024 * 1024;
/** How long an upload form stays usable. */
export const UPLOAD_FORM_SECONDS = 10 * 60;
