import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { GUEST_LIMITS } from '../guest-policy.js';

/** The secret from a private invitation link, exchanged for a guest cookie. */
export class ExchangeTokenDto {
  @ApiProperty({ description: 'From the link, after `#t=`.' })
  @IsString({ message: 'This invitation link is not complete.' })
  @Matches(/^[A-Za-z0-9_-]{20,100}$/, { message: 'This invitation link is not complete.' })
  token: string;
}

export const GUEST_RSVP_CHOICES = ['attending', 'not_attending', 'maybe'] as const;
export type GuestRsvpChoice = (typeof GUEST_RSVP_CHOICES)[number];

/**
 * A guest's answer for one ceremony (PRD INV-03). Attending needs a count
 * from 1 to the party size; not attending is 0; maybe may give a count,
 * not counted as confirmed. `responseVersion` is the version the guest saw.
 */
export class RsvpPatchDto {
  @ApiProperty({ enum: GUEST_RSVP_CHOICES })
  @IsIn(GUEST_RSVP_CHOICES, { message: 'Choose attending, not attending or maybe.' })
  status: GuestRsvpChoice;

  @ApiProperty({ required: false, type: 'integer', minimum: 0, maximum: GUEST_LIMITS.partySize })
  @IsOptional()
  @IsInt({ message: 'Choose how many people will attend.' })
  @Min(0, { message: 'Choose how many people will attend.' })
  @Max(GUEST_LIMITS.partySize, { message: 'Choose how many people will attend.' })
  attendingCount?: number;

  @ApiProperty({ type: 'integer', minimum: 0 })
  @IsInt({ message: 'Refresh the page and try again.' })
  @Min(0, { message: 'Refresh the page and try again.' })
  responseVersion: number;
}
