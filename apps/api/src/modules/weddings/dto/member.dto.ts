import { ApiProperty } from '@nestjs/swagger';
import { MEMBERSHIP_ROLES, type MembershipRole } from '../schemas/wedding-membership.schema.js';

/** An active member of a wedding, as the other members see them. */
export class MemberDto {
  /** User ID; what a task's `assigneeId` names. */
  userId: string;

  displayName: string;

  @ApiProperty({ enum: MEMBERSHIP_ROLES })
  role: MembershipRole;

  /** Their label on the team, e.g. "Bride's father". */
  label?: string;
}

/** The wedding's active members: owners first, then admins, then by name. */
export class MemberListDto {
  members: MemberDto[];
}
