import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { EmailField } from '../../auth/dto/fields.js';
import { MEMBERSHIP_ROLES, type MembershipRole } from '../schemas/wedding-membership.schema.js';
import { MemberLabelField } from './member-label.js';

/** Roles that can be invited: every role (decision 0020). */
export const INVITABLE_ROLES = MEMBERSHIP_ROLES;

/** Invite someone to the wedding. */
export class CreateMemberInviteDto {
  /** Where the invitation is sent; only the account with this address can accept it. */
  @EmailField()
  email: string;

  /**
   * `owner`: your partner, with the same rights as you (owners only).
   * `admin`: runs the team with you. `manager`: helps plan.
   */
  @ApiProperty({ enum: INVITABLE_ROLES })
  @IsIn(INVITABLE_ROLES, { message: 'Choose admin or manager.' })
  role: MembershipRole;

  /**
   * With `owner`: hand over your own place (decision 0025). Once they
   * accept they are an owner and you an admin; nothing changes before.
   * They may already be on the team as an admin or a manager.
   */
  @IsOptional()
  @IsBoolean()
  handOver?: boolean;

  /** Becomes their label on the team page once they join. */
  @MemberLabelField()
  label?: string;
}
