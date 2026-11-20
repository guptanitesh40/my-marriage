import { ApiProperty } from '@nestjs/swagger';
import { WEBSITE_TEMPLATES, type WebsiteTemplate } from '../website-policy.js';
import { WebsiteFaqDto } from './website.dto.js';

/**
 * A ceremony as anyone may see it (PRD SITE-05, EVT-07): an allowlist.
 * No IDs, no invitations, no managers, nothing private.
 */
export class PublicEventDto {
  title: string;

  description?: string;

  @ApiProperty({ required: false, format: 'date', example: '2027-02-12' })
  startDate?: string;

  @ApiProperty({ required: false, example: '10:30' })
  startTime?: string;

  @ApiProperty({ example: 'Asia/Kolkata' })
  timeZone: string;

  venueName?: string;

  venueAddress?: string;

  /** A checked Google Maps link. */
  mapsUrl?: string;

  dressCode?: string;

  /** A YouTube video ID; the site builds the embed and watch links. */
  livestreamVideoId?: string;

  cancelled: boolean;
}

export class PublicDateRangeDto {
  @ApiProperty({ format: 'date' })
  start: string;

  @ApiProperty({ format: 'date' })
  end: string;
}

/**
 * The wedding website's content, the same for every template (PRD SITE-02,
 * SITE-05): the published version for anyone, or the draft in an
 * organizer's preview.
 */
export class PublicWebsiteDto {
  /** The current address: different from the one asked for when it moved. */
  slug: string;

  @ApiProperty({ enum: WEBSITE_TEMPLATES })
  templateId: WebsiteTemplate;

  brideName: string;

  groomName: string;

  /** "Ananya & Arjun". */
  coupleName: string;

  city: string;

  state: string;

  headline?: string;

  /** Plain text; blank lines separate paragraphs. */
  story?: string;

  faq: WebsiteFaqDto[];

  /** The first and last day of the ceremonies with a date, cancelled ones left out. */
  dateRange?: PublicDateRangeDto;

  /** In date order, those without a date last. */
  events: PublicEventDto[];

  /** An organizer's preview of the draft, never shown to the public. */
  preview: boolean;
}

export class PublicEventListDto {
  events: PublicEventDto[];
}
