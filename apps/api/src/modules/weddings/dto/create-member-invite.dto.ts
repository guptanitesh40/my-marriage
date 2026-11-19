import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { EmailField } from '../../auth/dto/fields.js';

/** Roles that can be invited so far: the partner. Managers come with PRD TEAM-01. */
export const INVITABLE_ROLES = ['owner'] as const;

/** Invite someone to the wedding. */
export class CreateMemberInviteDto {
  /** Where the invitation is sent; only the account with this address can accept it. */
  @EmailField()
  email: string;

  /** `owner`: your partner, with the same rights as you. */
  @ApiProperty({ enum: INVITABLE_ROLES })
  @IsIn(INVITABLE_ROLES, { message: 'Only your partner can be invited so far.' })
  role: (typeof INVITABLE_ROLES)[number];
}
