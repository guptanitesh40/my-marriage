import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { MemberLabelField } from './member-label.js';

export const ASSIGNABLE_ROLES = ['admin', 'manager'] as const;

/** Change a member's role (never an owner's), or their label. */
export class UpdateMemberDto {
  @ApiProperty({ enum: ASSIGNABLE_ROLES, required: false })
  @IsOptional()
  @IsIn(ASSIGNABLE_ROLES, { message: 'Choose admin or manager.' })
  role?: (typeof ASSIGNABLE_ROLES)[number];

  /** `null` or empty clears it. */
  @MemberLabelField({ nullable: true })
  label?: string | null;
}
