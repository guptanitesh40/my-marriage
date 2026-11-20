import { ApiProperty } from '@nestjs/swagger';
import { WEBSITE_TEMPLATES, type WebsiteTemplate } from '../website-policy.js';

export class WebsiteFaqDto {
  question: string;

  answer: string;
}

export class WebsiteContentDto {
  headline?: string;

  story?: string;

  faq: WebsiteFaqDto[];
}

export const READINESS_KEYS = ['names', 'address', 'ceremonies'] as const;
export type ReadinessKey = (typeof READINESS_KEYS)[number];

/** One thing publishing needs (PRD SITE-04). */
export class ReadinessCheckDto {
  @ApiProperty({ enum: READINESS_KEYS })
  key: ReadinessKey;

  ok: boolean;

  /** What is there, or what to do. */
  message: string;
}

export class WebsiteReadinessDto {
  ready: boolean;

  checks: ReadinessCheckDto[];
}

/** The website as its organizers edit it: the draft, and what is published. */
export class WebsiteDto {
  /** The draft's template. */
  @ApiProperty({ enum: WEBSITE_TEMPLATES })
  templateId: WebsiteTemplate;

  content: WebsiteContentDto;

  /** Send it back with the next edit or publication. */
  contentVersion: number;

  @ApiProperty({ enum: ['draft', 'published'] })
  status: 'draft' | 'published';

  /** The template the public sees, while published. */
  @ApiProperty({ enum: WEBSITE_TEMPLATES, required: false })
  publishedTemplateId?: WebsiteTemplate;

  publishedAt?: Date;

  /** Published, and the draft has changed since. */
  hasUnpublishedChanges: boolean;

  /** The wedding's web address; the public site is at `/w/{slug}`. */
  slug: string;

  readiness: WebsiteReadinessDto;

  /** False once the wedding is archived: nothing but unpublishing can change. */
  writable: boolean;

  /** Whether this member may unpublish now (owners only, once archived). */
  canUnpublish: boolean;

  updatedAt?: Date;
}

export class SlugAvailabilityDto {
  slug: string;

  /** A well-formed address. */
  valid: boolean;

  /** Free for this wedding: unused, or one of its own. */
  available: boolean;

  message?: string;
}
