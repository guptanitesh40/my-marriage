import { ApiProperty } from '@nestjs/swagger';
import { WEBSITE_TEMPLATES, type WebsiteTemplate } from '../../website/website-policy.js';
import { RsvpDto } from './guest.dto.js';

/**
 * What a guest sees through their private link (PRD INV-02): only their
 * name, party size and the ceremonies they are invited to. Never notes,
 * contact details, other guests or anything financial.
 */
export class GuestViewEventDto {
  /** The event invitation's ID, used to answer it. */
  invitationId: string;

  title: string;

  @ApiProperty({ required: false, format: 'date', example: '2027-02-18' })
  startDate?: string;

  @ApiProperty({ required: false, example: '10:00' })
  startTime?: string;

  timeZone: string;

  venueName?: string;

  venueAddress?: string;

  dressCode?: string;

  /** Cancelled: its RSVP is closed; the last answer is shown. */
  cancelled: boolean;

  rsvp: RsvpDto;
}

export class GuestViewDto {
  /** "Ananya & Arjun". */
  coupleName: string;

  /** Where the wedding is: "Jaipur, Rajasthan". */
  place: string;

  /** The wedding website's address, so the website can tell the invitation is its own. */
  slug: string;

  guestName: string;

  partySize: number;

  /** False once the wedding is archived: answers can be seen, not changed. */
  writable: boolean;

  /** In the wedding's order. */
  events: GuestViewEventDto[];

  /**
   * Reminder emails: `on` or `off` (the guest's choice); missing when the
   * couple has no email address for them, so there is nothing to turn off.
   */
  @ApiProperty({ required: false, enum: ['on', 'off'] })
  reminderEmails?: 'on' | 'off';

  /**
   * The published wedding website's design, which the RSVP page follows;
   * the standard (Traditional) page while the website isn't published.
   */
  @ApiProperty({ enum: WEBSITE_TEMPLATES })
  templateId: WebsiteTemplate;

  /** The published website's cover photo, served by the API, when there is one. */
  coverUrl?: string;
}

/** The guest's choice about reminder emails. */
export class GuestReminderChoiceDto {
  @ApiProperty({ enum: ['on', 'off'] })
  reminderEmails: 'on' | 'off';
}
