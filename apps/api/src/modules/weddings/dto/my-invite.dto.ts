import { ApiProperty } from '@nestjs/swagger';
import { MEMBERSHIP_ROLES, type MembershipRole } from '../schemas/wedding-membership.schema.js';

/**
 * A pending invitation sent to the signed-in account's own address: what
 * the invitee needs to decide whether to join. They could read all of it in
 * the invitation email.
 */
export class MyInviteDto {
  id: string;

  brideName: string;

  groomName: string;

  city: string;

  state: string;

  /** The wedding day (YYYY-MM-DD), when set. */
  weddingDate?: string;

  /** The name of the owner who sent it, if their account still exists. */
  invitedByName?: string;

  @ApiProperty({ enum: MEMBERSHIP_ROLES })
  role: MembershipRole;

  expiresAt: Date;
}
