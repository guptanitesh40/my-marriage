import { ApiProperty } from '@nestjs/swagger';
import { EVENT_STATES, type EventState } from '../schemas/event.schema.js';

export class EventVenueDto {
  name?: string;

  address?: string;

  /** Google Maps link for directions. */
  mapsUrl?: string;
}

/** A YouTube livestream: the video, and the page to watch it on. */
export class EventLivestreamDto {
  @ApiProperty({ enum: ['youtube'] })
  provider: 'youtube';

  videoId: string;

  url: string;
}

/** A ceremony as the wedding's owners and managers see it. */
export class EventDto {
  /** Event ID. */
  id: string;

  title: string;

  description?: string;

  /** The day (`YYYY-MM-DD`) where the ceremony happens; missing until known. */
  @ApiProperty({ required: false, format: 'date', example: '2027-12-13' })
  startDate?: string;

  /** The start time (`HH:mm`) on that day, where it happens; missing until known. */
  @ApiProperty({ required: false, example: '18:30' })
  startTime?: string;

  /** The start as an instant, when both the day and the time are known. */
  startAt?: Date;

  /** IANA time zone the day and time are read in. */
  @ApiProperty({ example: 'Asia/Kolkata' })
  timeZone: string;

  venue?: EventVenueDto;

  dressCode?: string;

  livestream?: EventLivestreamDto;

  @ApiProperty({ enum: EVENT_STATES })
  state: EventState;

  createdAt: Date;
}

/** A wedding's ceremonies in date order, those without a date last. */
export class EventListDto {
  events: EventDto[];

  /** True when the wedding has more events than the list returns. */
  truncated: boolean;
}
