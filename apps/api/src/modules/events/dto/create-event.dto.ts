import { Type } from 'class-transformer';
import { IsObject, IsOptional, ValidateNested } from 'class-validator';
import { OptionalDateField, TextLineField } from '../../weddings/dto/fields.js';
import { EVENT_LIMITS } from '../event-policy.js';
import { googleMapsUrl, youtubeVideoId } from '../event-links.js';
import {
  OptionalLineField,
  OptionalLinkField,
  OptionalTextBlockField,
  OptionalTimeField,
  OptionalTimeZoneField,
} from './fields.js';

/** Where it happens. Leave out what is not known yet. */
export class EventVenueInputDto {
  @TextLineField({
    maxLength: EVENT_LIMITS.venueName,
    empty: 'Enter the venue’s name, or leave it out.',
    example: 'Rambagh Palace',
    optional: true,
  })
  name?: string;

  @TextLineField({
    maxLength: EVENT_LIMITS.venueAddress,
    empty: 'Enter the address, or leave it out.',
    example: 'Bhawani Singh Road, Jaipur',
    optional: true,
  })
  address?: string;

  /** A Google Maps link, for "Get directions" on the wedding website. */
  @OptionalLinkField({
    check: googleMapsUrl,
    message: 'Paste a Google Maps link, like https://maps.app.goo.gl/…',
    example: 'https://maps.app.goo.gl/AbCdEf123',
  })
  mapsUrl?: string;
}

/**
 * A new ceremony (PRD EVT-01, EVT-02). Only the name is required: the day,
 * time and venue may follow later. The day and time are as clocks show them
 * where the ceremony happens; the server works out the instant.
 */
export class CreateEventDto {
  /** A preset such as Haldi or Sangeet, or any name. */
  @TextLineField({
    maxLength: EVENT_LIMITS.title,
    empty: 'Enter the ceremony’s name.',
    example: 'Haldi',
  })
  title: string;

  /** Shown to guests once the wedding website is published. */
  @OptionalTextBlockField({
    maxLength: EVENT_LIMITS.description,
    example: 'Turmeric and laughter by the pool.',
  })
  description?: string;

  /** The day, if known: today or later, where the ceremony happens. */
  @OptionalDateField()
  startDate?: string;

  /** The start time on that day (`HH:mm`, 24-hour); needs `startDate`. */
  @OptionalTimeField()
  startTime?: string;

  /** IANA time zone of the venue; Asia/Kolkata if left out. */
  @OptionalTimeZoneField()
  timeZone?: string;

  @IsOptional()
  @IsObject({ message: 'Enter the venue’s details.' })
  @ValidateNested()
  @Type(() => EventVenueInputDto)
  venue?: EventVenueInputDto;

  /** Suggested attire, shown on the wedding website. */
  @OptionalLineField({ maxLength: EVENT_LIMITS.dressCode, example: 'Yellow hues & floral prints' })
  dressCode?: string;

  /** A YouTube link for the livestream (PRD LIVE-01); only the video is kept. */
  @OptionalLinkField({
    check: youtubeVideoId,
    message: 'Paste a YouTube video or live link, like https://youtu.be/…',
    example: 'https://youtu.be/dQw4w9WgXcQ',
  })
  livestreamUrl?: string;
}
