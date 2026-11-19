import { ApiProperty } from '@nestjs/swagger';
import { MEMBERSHIP_ROLES, type MembershipRole } from '../schemas/wedding-membership.schema.js';

/**
 * What the holder of an invitation link may see before accepting: enough to
 * know what they are accepting and which account to sign in with. The
 * holder already has all of it, in the email.
 */
export class InvitePreviewDto {
  brideName: string;

  groomName: string;

  city: string;

  state: string;

  /** The name of the owner who sent it, if their account still exists. */
  invitedByName?: string;

  /** Only the account with this address can accept. */
  email: string;

  @ApiProperty({ enum: MEMBERSHIP_ROLES })
  role: MembershipRole;

  @ApiProperty({ enum: ['pending', 'accepted'] })
  status: 'pending' | 'accepted';

  expiresAt: Date;
}
