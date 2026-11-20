import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsObject, IsOptional, ValidateIf, ValidateNested } from 'class-validator';
import { OptionalDateField, TextLineField } from '../../weddings/dto/fields.js';
import { EVENT_LIMITS } from '../event-policy.js';
import { EVENT_STATES, type EventState } from '../schemas/event.schema.js';
import { EventVenueInputDto } from './create-event.dto.js';
import { youtubeVideoId } from '../event-links.js';
import {
  OptionalLineField,
  OptionalLinkField,
  OptionalTextBlockField,
  OptionalTimeField,
  OptionalTimeZoneField,
} from './fields.js';

/**
 * Changes to a ceremony (PRD EVT-06). Fields left out stay as they are;
 * `null` clears an optional one. The day and time are as clocks show them
 * where the ceremony happens.
 */
export class UpdateEventDto {
  @TextLineField({
    maxLength: EVENT_LIMITS.title,
    empty: 'Enter the ceremony’s name.',
    example: 'Haldi',
    optional: true,
  })
  title?: string;

  /** Shown to guests once the wedding website is published; `null` removes it. */
  @OptionalTextBlockField({
    maxLength: EVENT_LIMITS.description,
    example: 'Turmeric and laughter by the pool.',
    nullable: true,
  })
  description?: string | null;

  /** The day; `null` removes it and the time with it. A new day must not be in the past. */
  @OptionalDateField({ nullable: true })
  startDate?: string | null;

  /** The start time (`HH:mm`, 24-hour); needs a day. `null` removes it. */
  @OptionalTimeField({ nullable: true })
  startTime?: string | null;

  /** IANA time zone of the venue. The day and time keep their clock reading in the new zone. */
  @OptionalTimeZoneField()
  timeZone?: string;

  /** Replaces the whole venue; `null` removes it. */
  @ApiProperty({ type: EventVenueInputDto, required: false, nullable: true })
  @IsOptional()
  @IsObject({ message: 'Enter the venue’s details.' })
  @ValidateNested()
  @Type(() => EventVenueInputDto)
  venue?: EventVenueInputDto | null;

  /** Suggested attire; `null` removes it. */
  @OptionalLineField({
    maxLength: EVENT_LIMITS.dressCode,
    example: 'Yellow hues & floral prints',
    nullable: true,
  })
  dressCode?: string | null;

  /** A YouTube link for the livestream; `null` or empty removes it. */
  @OptionalLinkField({
    check: youtubeVideoId,
    message: 'Paste a YouTube video or live link, like https://youtu.be/…',
    example: 'https://youtu.be/dQw4w9WgXcQ',
    nullable: true,
  })
  livestreamUrl?: string | null;

  /** Mark the ceremony completed or cancelled, or scheduled again. */
  @ApiProperty({ enum: EVENT_STATES, required: false })
  @ValidateIf((_: unknown, value: unknown) => value !== undefined)
  @IsIn(EVENT_STATES, { message: 'Choose scheduled, completed or cancelled.' })
  state?: EventState;
}
