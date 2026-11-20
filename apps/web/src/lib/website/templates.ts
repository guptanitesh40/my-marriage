import type { components } from '@my-marriage/contracts';

export type TemplateId = components['schemas']['WebsiteDto']['templateId'];

/**
 * The three templates (PRD SITE-02), as the Appearance tab describes them
 * (Stitch "Wedding Website Builder"). Labels follow decision 0017.
 */
export const TEMPLATES: readonly {
  id: TemplateId;
  label: string;
  description: string;
  /** Colours of the design, for the small swatch: background, ink, accent. */
  swatch: readonly [string, string, string];
  tags: readonly string[];
}[] = [
  {
    id: 'traditional',
    label: 'Traditional',
    description: 'Warm ivory, elegant serif type, an arched welcome and fine floral dividers.',
    swatch: ['#fdf9f0', '#184539', '#b89a70'],
    tags: ['Warm ivory', 'Gold accents', 'Serif'],
  },
  {
    id: 'modern',
    label: 'Modern Minimal',
    description: 'A clean editorial grid, crisp type, high contrast and generous white space.',
    swatch: ['#ffffff', '#1f2a2e', '#184539'],
    tags: ['Studio white', 'Deep slate', 'Grid'],
  },
  {
    id: 'royal',
    label: 'Royal / Elegant',
    description:
      'Deep forest green and charcoal, restrained antique gold and a jali-framed welcome.',
    swatch: ['#13362d', '#fbf7ee', '#c9a86a'],
    tags: ['Forest green', 'Antique gold', 'Jali'],
  },
];

export function templateLabel(id: TemplateId): string {
  return TEMPLATES.find((template) => template.id === id)?.label ?? id;
}
