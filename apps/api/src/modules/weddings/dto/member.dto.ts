import { ApiProperty } from '@nestjs/swagger';
import { MEMBERSHIP_ROLES, type MembershipRole } from '../schemas/wedding-membership.schema.js';

/** An active owner or manager of a wedding, as the other members see them. */
export class MemberDto {
  /** User ID; what a task's `assigneeId` names. */
  userId: string;

  displayName: string;

  @ApiProperty({ enum: MEMBERSHIP_ROLES })
  role: MembershipRole;
}

/** The wedding's active owners and managers: owners first, then by name. */
export class MemberListDto {
  members: MemberDto[];
}
