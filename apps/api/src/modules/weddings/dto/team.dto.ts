import { ApiProperty } from '@nestjs/swagger';
import { MEMBERSHIP_ROLES, type MembershipRole } from '../schemas/wedding-membership.schema.js';
import { MemberInviteDto } from './member-invite.dto.js';

/** A member as the team page shows them, to owners and admins only. */
export class TeamMemberDto {
  /** User ID: what removing or changing them names. */
  userId: string;

  displayName: string;

  email: string;

  @ApiProperty({ enum: MEMBERSHIP_ROLES })
  role: MembershipRole;

  label?: string;

  joinedAt: Date;

  /** Tasks assigned to them that are not done yet. */
  openTaskCount: number;

  /** The member viewing the page. */
  isYou: boolean;
}

/** The team page: members (owners first) and invitations, newest first. */
export class TeamDto {
  members: TeamMemberDto[];

  invites: MemberInviteDto[];

  /** The viewer's role, which decides what they may change. */
  @ApiProperty({ enum: MEMBERSHIP_ROLES })
  viewerRole: MembershipRole;
}
