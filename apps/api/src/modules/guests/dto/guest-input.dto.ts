import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  Allow,
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { OptionalTextBlockField } from '../../events/dto/fields.js';
import { EventIdsField, OptionalEmailField, OptionalPhoneField } from '../../vendors/dto/fields.js';
import { TextLineField } from '../../weddings/dto/fields.js';
import { GUEST_LIMITS } from '../guest-policy.js';
import { PartySizeField } from './fields.js';

const NAME_EMPTY = 'Enter the primary contact’s name.';

/**
 * A new guest contact (PRD GUEST-01, GUEST-02): one person responding for
 * their family or group. Only the name and party size are required.
 * `eventIds` invites them to those ceremonies at once (decision 0015).
 */
export class CreateGuestDto {
  @TextLineField({ maxLength: GUEST_LIMITS.name, empty: NAME_EMPTY, example: 'Rajesh Sharma' })
  name: string;

  @PartySizeField()
  partySize: number;

  /** Needed only to send the invitation by email. */
  @OptionalEmailField()
  email?: string;

  /** For sharing the link on WhatsApp by hand. */
  @OptionalPhoneField()
  phone?: string;

  /** Organizer-only. */
  @OptionalTextBlockField({ maxLength: GUEST_LIMITS.notes, example: 'Needs a ground-floor room.' })
  organizerNotes?: string;

  /** Ceremonies to invite them to; they can be invited later. */
  @EventIdsField()
  eventIds?: string[];
}

/**
 * Changes to a guest contact (PRD GUEST-06). Fields left out stay; `null`
 * or `""` clears an optional one. A party size below an answer already
 * given is refused (409 PARTY_SIZE_CONFLICT), never clamped.
 */
export class UpdateGuestDto {
  @TextLineField({
    maxLength: GUEST_LIMITS.name,
    empty: NAME_EMPTY,
    example: 'Rajesh Sharma',
    optional: true,
  })
  name?: string;

  @PartySizeField({ optional: true })
  partySize?: number;

  @OptionalEmailField({ nullable: true })
  email?: string | null;

  @OptionalPhoneField({ nullable: true })
  phone?: string | null;

  @OptionalTextBlockField({
    maxLength: GUEST_LIMITS.notes,
    example: 'Needs a ground-floor room.',
    nullable: true,
  })
  organizerNotes?: string | null;
}

/** The ceremonies a guest is invited to, replacing the previous choice (PRD INV-01, INV-05). */
export class InvitationSelectionDto {
  @ApiProperty({
    type: [String],
    maxItems: GUEST_LIMITS.events,
    example: ['6740a1b2c3d4e5f601234567'],
  })
  @EventIdsField()
  eventIds: string[];
}

/** Reissuing revokes the old link first, so it stops working (PRD INV-09). */
export class CreateLinkDto {
  @ApiProperty({ required: false, description: 'Revoke the current link and create a new one.' })
  @IsOptional()
  @IsBoolean({ message: 'Choose whether to replace the link.' })
  reissue?: boolean;
}

/**
 * One row of an import, as read from the file in the browser. Checked by
 * the preview, which reports problems per row instead of refusing the batch.
 */
export class ImportRowDto {
  @ApiProperty({ example: 'Rajesh Sharma' })
  @IsString({ message: 'Enter a name.' })
  @MaxLength(500)
  name: string;

  /** A whole number of 1 or more; checked per row. */
  @ApiProperty({ required: false, oneOf: [{ type: 'integer' }, { type: 'string' }], example: 5 })
  @Allow()
  partySize?: unknown;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  organizerNotes?: string;

  /** Ceremony names, matched to the wedding's events ignoring case (decision 0015). */
  @ApiProperty({ required: false, type: [String], example: ['Haldi', 'Wedding'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(GUEST_LIMITS.events)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  events?: string[];
}

export const IMPORT_MODES = ['csv', 'xlsx'] as const;

export class ImportPreviewDto {
  @ApiProperty({ example: 'guest-list.csv' })
  @IsString()
  @MaxLength(200)
  fileName: string;

  @ApiProperty({ enum: IMPORT_MODES })
  @IsIn(IMPORT_MODES, { message: 'Choose CSV or XLSX.' })
  mode: (typeof IMPORT_MODES)[number];

  @ApiProperty({ type: [ImportRowDto], maxItems: GUEST_LIMITS.importRows })
  @IsArray()
  @ArrayMaxSize(GUEST_LIMITS.importRows, {
    message: `Import at most ${GUEST_LIMITS.importRows} guests at a time.`,
  })
  @ValidateNested({ each: true })
  @Type(() => ImportRowDto)
  rows: ImportRowDto[];
}

export class ImportCommitDto {
  @ApiProperty({ type: [ImportRowDto], maxItems: GUEST_LIMITS.importRows })
  @IsArray()
  @ArrayMaxSize(GUEST_LIMITS.importRows, {
    message: `Import at most ${GUEST_LIMITS.importRows} guests at a time.`,
  })
  @ValidateNested({ each: true })
  @Type(() => ImportRowDto)
  rows: ImportRowDto[];

  /** Leave out rows that look like guests already on the list. */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  skipDuplicates?: boolean;

  @ApiProperty({ required: false, enum: IMPORT_MODES })
  @IsOptional()
  @IsIn(IMPORT_MODES)
  sourceFormat?: (typeof IMPORT_MODES)[number];
}
