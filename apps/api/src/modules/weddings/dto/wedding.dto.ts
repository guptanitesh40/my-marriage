import { ApiProperty } from '@nestjs/swagger';
import { MEMBERSHIP_ROLES, type MembershipRole } from '../schemas/wedding-membership.schema.js';
import { WEDDING_STATUSES, type WeddingStatus } from '../schemas/wedding.schema.js';

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

  @ApiProperty({ enum: WEDDING_STATUSES })
  status: WeddingStatus;

  /** The signed-in user's role in this wedding. */
  @ApiProperty({ enum: MEMBERSHIP_ROLES })
  role: MembershipRole;
}
