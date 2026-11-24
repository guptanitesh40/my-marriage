import { ApiProperty } from '@nestjs/swagger';
import { MEMBERSHIP_ROLES, type MembershipRole } from '../schemas/wedding-membership.schema.js';
import { WEDDING_STATUSES, type WeddingStatus } from '../schemas/wedding.schema.js';

/** The main venue's known parts. */
export class WeddingVenueDto {
  name?: string;

  address?: string;

  mapsUrl?: string;
}

/** A wedding as one of its members sees it. */
export class WeddingDto {
  /** Wedding ID. */
  id: string;

  /** Address of the public website, once published. Chosen by the server. */
  slug: string;

  brideName: string;

  groomName: string;

  city: string;

  state: string;

  /** The wedding day (`YYYY-MM-DD`); missing until known. */
  @ApiProperty({ required: false, format: 'date', example: '2027-12-10' })
  weddingDate?: string;

  mainVenue?: WeddingVenueDto;

  description?: string;

  @ApiProperty({ enum: WEDDING_STATUSES })
  status: WeddingStatus;

  /** When an owner archived it. */
  @ApiProperty({ required: false, format: 'date-time' })
  archivedAt?: string;

  /** The signed-in user's role in this wedding. */
  @ApiProperty({ enum: MEMBERSHIP_ROLES })
  role: MembershipRole;
}

/** Who did something, and when. */
export class ActorStampDto {
  @ApiProperty({ format: 'date-time' })
  at: string;

  /** Missing when their account is gone. */
  byName?: string;
}

/** A waiting request to delete the wedding (decision 0021). */
export class DeletionRequestDto {
  @ApiProperty({ format: 'date-time' })
  requestedAt: string;

  byName?: string;
}

/**
 * The settings page (PRD WED-04 to WED-07): the wedding, who last saved
 * it, and its archive and deletion state.
 */
export class WeddingSettingsDto {
  wedding: WeddingDto;

  lastSaved?: ActorStampDto;

  archived?: ActorStampDto;

  deletionRequest?: DeletionRequestDto;
}
