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
