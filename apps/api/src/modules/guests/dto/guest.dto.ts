import { ApiProperty } from '@nestjs/swagger';
import {
  NOTIFICATION_STATES,
  type NotificationState,
} from '../../notifications/notification.schema.js';
import { RSVP_STATUSES, type RsvpStatus } from '../schemas/event-invitation.schema.js';

export class RsvpDto {
  @ApiProperty({ enum: RSVP_STATUSES })
  status: RsvpStatus;

  /** Attending: 1 to the party size; not attending: 0; maybe: optional; pending: none. */
  attendingCount?: number;

  respondedAt?: Date;

  responseVersion: number;
}

export class RsvpChangeDto {
  @ApiProperty({ enum: RSVP_STATUSES })
  status: RsvpStatus;

  attendingCount?: number;

  at: Date;
}

/** One ceremony a guest is invited to, as organizers see it. */
export class GuestInvitationDto {
  /** The event invitation's ID. */
  id: string;

  eventId: string;

  title: string;

  /** False once the event was deleted. */
  available: boolean;

  /** The ceremony was cancelled: its RSVP is closed; the last answer stays. */
  cancelled: boolean;

  rsvp: RsvpDto;
}

export const LINK_STATES = ['none', 'active', 'revoked'] as const;
export type LinkState = (typeof LINK_STATES)[number];

export class GuestLinkDto {
  /** none: never created; active: works; revoked: every link was revoked. */
  @ApiProperty({ enum: LINK_STATES })
  status: LinkState;

  /**
   * The private link; only on a single guest, never in lists. Named so that
   * request traces mask it: it is a bearer credential.
   */
  secretUrl?: string;

  createdAt?: Date;

  lastUsedAt?: Date;
}

export class GuestEmailDto {
  /** What became of the last invitation email; "sent" is never "delivered" (PRD INV-08). */
  @ApiProperty({ enum: NOTIFICATION_STATES })
  state: NotificationState;

  requestedAt: Date;
}

/** A guest contact as organizers see it. Private: never in a public or guest response. */
export class GuestDto {
  id: string;

  name: string;

  partySize: number;

  email?: string;

  phone?: string;

  organizerNotes?: string;

  /** The ceremonies they are invited to, in the wedding's order. */
  invitations: GuestInvitationDto[];

  link: GuestLinkDto;

  /** Missing if no invitation email was asked for. */
  lastEmail?: GuestEmailDto;

  /** The last reminder email, by hand or automatic; missing if none. */
  lastReminder?: GuestEmailDto;

  /** The guest turned reminder emails off from their invitation. */
  remindersOff: boolean;

  createdAt: Date;

  updatedAt: Date;
}

/** One ceremony's answers, counting people only where that makes sense. */
export class EventRsvpTotalsDto {
  eventId: string;

  title: string;

  /** Guest contacts invited. */
  invitedGuests: number;

  /** People invited: the sum of those contacts' party sizes. */
  invitedPeople: number;

  attending: number;

  notAttending: number;

  maybe: number;

  pending: number;

  /** People confirmed: attending counts only; maybe is not included. */
  confirmedPeople: number;
}

export class GuestTotalsDto {
  /** Guest contacts (families or groups). */
  contacts: number;

  /** People invited to at least one ceremony, each counted once across the wedding. */
  invitedPeople: number;

  /** Ceremony invitations answered (attending, not attending or maybe). */
  answered: number;

  /** Ceremony invitations not answered yet. */
  pending: number;

  /** Per ceremony, in the wedding's order. */
  events: EventRsvpTotalsDto[];
}

export class GuestListDto {
  /** By name, A to Z. */
  guests: GuestDto[];

  truncated: boolean;

  totals: GuestTotalsDto;
}

/** One guest with each answer's history, for the details view. */
export class GuestDetailInvitationDto extends GuestInvitationDto {
  /** Earlier answers, newest first. */
  history: RsvpChangeDto[];
}

export class GuestDetailDto {
  guest: GuestDto;

  invitations: GuestDetailInvitationDto[];
}

export class ImportRowResultDto {
  /** The row's position in the file's data rows, from 0. */
  index: number;

  @ApiProperty({ enum: ['ready', 'error', 'duplicate'] })
  status: 'ready' | 'error' | 'duplicate';

  /** What is wrong, field by field. */
  problems: { field: string; message: string }[];

  /** For a possible duplicate: the guest already on the list, or an earlier row. */
  duplicateOf?: string;
}

export class ImportPreviewResultDto {
  rows: ImportRowResultDto[];

  ready: number;

  errors: number;

  duplicates: number;
}

export class ImportCommitResultDto {
  created: number;

  skipped: number;

  /** Rows not imported because they have problems. */
  rejected: number;
}
