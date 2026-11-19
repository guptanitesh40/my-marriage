import { ApiProperty } from '@nestjs/swagger';
import { MEMBERSHIP_ROLES, type MembershipRole } from '../schemas/wedding-membership.schema.js';

export const INVITE_VIEW_STATUSES = ['pending', 'accepted', 'revoked', 'expired'] as const;
export const INVITE_EMAIL_STATUSES = ['sending', 'sent', 'failed'] as const;

/** An invitation to a wedding, as its members see it. Never includes the link. */
export class MemberInviteDto {
  /** Invitation ID. */
  id: string;

  /** The address it was sent to. */
  email: string;

  @ApiProperty({ enum: MEMBERSHIP_ROLES })
  role: MembershipRole;

  /** `expired` once a pending invitation passes `expiresAt`. */
  @ApiProperty({ enum: INVITE_VIEW_STATUSES })
  status: (typeof INVITE_VIEW_STATUSES)[number];

  /**
   * Whether the latest email went out: `sent` means the provider accepted
   * it, never that it arrived. `failed` means it could not be sent; resend it.
   */
  @ApiProperty({ enum: INVITE_EMAIL_STATUSES })
  emailStatus: (typeof INVITE_EMAIL_STATUSES)[number];

  /** When the link stops working. */
  expiresAt: Date;

  createdAt: Date;
}
