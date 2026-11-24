import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsObject, IsOptional, ValidateBy, ValidateIf, ValidateNested } from 'class-validator';
import { OptionalLinkField, OptionalTextBlockField } from '../../events/dto/fields.js';
import { googleMapsUrl } from '../../events/event-links.js';
import { DESCRIPTION_MAX, VENUE_ADDRESS_MAX, VENUE_NAME_MAX } from '../schemas/wedding.schema.js';
import { isValidSlug, SLUG_MESSAGE, SLUG_PATTERN } from '../slug.js';
import { OptionalDateField, TextLineField } from './fields.js';

/** The main venue. Leave out what is not known yet. */
export class WeddingVenueInputDto {
  @TextLineField({
    maxLength: VENUE_NAME_MAX,
    empty: 'Enter the venue’s name, or leave it out.',
    example: 'Rambagh Palace',
    optional: true,
  })
  name?: string;

  @TextLineField({
    maxLength: VENUE_ADDRESS_MAX,
    empty: 'Enter the address, or leave it out.',
    example: 'Bhawani Singh Road, Jaipur',
    optional: true,
  })
  address?: string;

  /** A Google Maps link to the venue. */
  @OptionalLinkField({
    check: googleMapsUrl,
    message: 'Paste a Google Maps link, like https://maps.app.goo.gl/…',
    example: 'https://maps.app.goo.gl/AbCdEf123',
  })
  mapsUrl?: string;
}

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

  /** Replaces the whole main venue; `null` removes it. Private to the team. */
  @ApiProperty({ type: WeddingVenueInputDto, required: false, nullable: true })
  @IsOptional()
  @IsObject({ message: 'Enter the venue’s details.' })
  @ValidateNested()
  @Type(() => WeddingVenueInputDto)
  mainVenue?: WeddingVenueInputDto | null;

  /** A short introduction; `null` or empty removes it. Private to the team. */
  @OptionalTextBlockField({
    maxLength: DESCRIPTION_MAX,
    example: 'Two families, one celebration in the Pink City.',
    nullable: true,
  })
  description?: string | null;
}
