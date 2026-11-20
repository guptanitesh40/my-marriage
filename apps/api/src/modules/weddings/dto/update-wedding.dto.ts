import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ValidateBy, ValidateIf } from 'class-validator';
import { isValidSlug, SLUG_MESSAGE, SLUG_PATTERN } from '../slug.js';
import { OptionalDateField, TextLineField } from './fields.js';

/** Changes to a wedding's details (PRD WED-04). Fields left out stay as they are. */
export class UpdateWeddingDto {
  @TextLineField({
    maxLength: 60,
    empty: "Enter the bride's name.",
    example: 'Ananya',
    optional: true,
  })
  brideName?: string;

  @TextLineField({
    maxLength: 60,
    empty: "Enter the groom's name.",
    example: 'Arjun',
    optional: true,
  })
  groomName?: string;

  @TextLineField({ maxLength: 80, empty: 'Enter the city.', example: 'Jaipur', optional: true })
  city?: string;

  @TextLineField({
    maxLength: 60,
    empty: 'Choose the state.',
    example: 'Rajasthan',
    optional: true,
  })
  state?: string;

  /**
   * A new web address for the wedding website (decision 0017). The old one
   * stays reserved for this wedding and redirects to the new one.
   */
  @ApiProperty({ required: false, pattern: SLUG_PATTERN.source, example: 'ananya-arjun' })
  @ValidateIf((_: unknown, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @ValidateBy(
    { name: 'isValidSlug', validator: { validate: isValidSlug } },
    { message: SLUG_MESSAGE },
  )
  slug?: string;

  /** The wedding day; `null` removes it. A new date must not be in the past. */
  @OptionalDateField({ nullable: true })
  weddingDate?: string | null;
}
