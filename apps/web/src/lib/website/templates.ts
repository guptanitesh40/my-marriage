import type { components } from '@my-marriage/contracts';

export type TemplateId = components['schemas']['WebsiteDto']['templateId'];

/**
 * The three templates (PRD SITE-02), named and described as the builder's
 * "Appearance & Styles" tab shows them (Stitch "Wedding Website Builder &
 * Management").
 */
export const TEMPLATES: readonly {
  id: TemplateId;
  label: string;
  description: string;
  /** The dot beside the name. */
  dot: string;
  tags: readonly string[];
}[] = [
  {
    id: 'traditional',
    label: 'Traditional Serene',
    description:
      'Warm ivory canvas, elegant Newsreader typography, classic archway motifs, and subtle floral borders.',
    dot: 'bg-secondary',
    tags: ['Warm Ivory', 'Gold Accent', 'Newsreader Serif'],
  },
  {
    id: 'modern',
    label: 'Modern Minimal',
    description:
      'Clean architectural grid, crisp Manrope sans typography, high contrast, and generous negative space.',
    dot: 'bg-outline',
    tags: ['Studio White', 'Deep Slate', 'Pure Grid'],
  },
  {
    id: 'royal',
    label: 'Royal Heritage',
    description:
      'Deep Jaipur forest green accents, regal gold foiled headers, symmetrical jali lattice banners, and majestic tone.',
    dot: 'bg-primary',
    tags: ['Forest Tint', 'Jaipur Emerald', 'Antique Gold'],
  },
];

export function templateLabel(id: TemplateId): string {
  return TEMPLATES.find((template) => template.id === id)?.label ?? id;
}
