import type { components } from '@my-marriage/contracts';
import { zonePlace } from '@/lib/events/format';

/** A wedding website's content, the same for all three designs (decision 0017). */
export type Site = components['schemas']['PublicWebsiteDto'];
export type SiteEvent = components['schemas']['PublicEventDto'];

const INDIA = 'Asia/Kolkata';

/** Formats a `YYYY-MM-DD` day: it is already a calendar day, so as UTC, never shifted. */
function dayPart(day: string, options: Intl.DateTimeFormatOptions): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-IN', { ...options, timeZone: 'UTC' });
}

/** "A & A": the couple's initials, for the small monograms. */
export function monogram(site: Pick<Site, 'brideName' | 'groomName'>): [string, string] {
  const initial = (name: string) => Array.from(name.trim())[0]?.toUpperCase() ?? '';
  return [initial(site.brideName), initial(site.groomName)];
}

/**
 * "12 – 15 February 2027", "28 February – 2 March 2027",
 * "30 December 2027 – 2 January 2028", or one day.
 */
export function dateRangeLabel(range: Site['dateRange']): string | undefined {
  if (!range) return undefined;
  const { start, end } = range;
  const day = (d: string) => dayPart(d, { day: 'numeric' });
  const month = (d: string) => dayPart(d, { month: 'long' });
  const year = (d: string) => dayPart(d, { year: 'numeric' });
  if (start === end) return `${day(start)} ${month(start)} ${year(start)}`;
  if (year(start) !== year(end)) {
    return `${day(start)} ${month(start)} ${year(start)} – ${day(end)} ${month(end)} ${year(end)}`;
  }
  if (month(start) !== month(end)) {
    return `${day(start)} ${month(start)} – ${day(end)} ${month(end)} ${year(end)}`;
  }
  return `${day(start)} – ${day(end)} ${month(end)} ${year(end)}`;
}

/** "Feb 2027", from the first day of the celebrations. */
export function monthYear(range: Site['dateRange']): string | undefined {
  return range ? dayPart(range.start, { month: 'short', year: 'numeric' }) : undefined;
}

/** "Jaipur, Rajasthan". */
export function placeLabel(site: Pick<Site, 'city' | 'state'>): string {
  return [site.city, site.state].filter(Boolean).join(', ');
}

export interface EventDay {
  /** "12" */
  day: string;
  /** "Feb" */
  month: string;
  /** "Friday" */
  weekday: string;
  /** "Fri 12 Feb 2027" */
  short: string;
}

export function eventDay(event: Pick<SiteEvent, 'startDate'>): EventDay | undefined {
  const date = event.startDate;
  if (!date) return undefined;
  const part = (options: Intl.DateTimeFormatOptions) => dayPart(date, options);
  return {
    day: part({ day: 'numeric' }),
    month: part({ month: 'short' }),
    weekday: part({ weekday: 'long' }),
    short: `${part({ weekday: 'short' })} ${part({ day: 'numeric' })} ${part({ month: 'short' })} ${part({ year: 'numeric' })}`,
  };
}

/**
 * "10:30 am IST", or "7:00 pm London time" for a ceremony abroad: the time
 * as clocks show it where the ceremony happens.
 */
export function eventTime(event: Pick<SiteEvent, 'startTime' | 'timeZone'>): string | undefined {
  if (!event.startTime) return undefined;
  const time = new Date(`2000-01-01T${event.startTime}:00Z`).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  });
  return event.timeZone === INDIA ? `${time} IST` : `${time} ${zonePlace(event.timeZone)} time`;
}

/** "Rajvilas Poolside Gardens, Jaipur": the venue's name and address, whichever are known. */
export function venueLabel(
  event: Pick<SiteEvent, 'venueName' | 'venueAddress'>,
): string | undefined {
  return [event.venueName, event.venueAddress].filter(Boolean).join(', ') || undefined;
}

/** The story is plain text: blank lines separate paragraphs (decision 0017, D10). */
export function storyParagraphs(story: string | undefined): string[] {
  return (story ?? '')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

/** Ceremonies still taking place, for "4 Celebrations". */
export function celebrationCount(events: readonly Pick<SiteEvent, 'cancelled'>[]): number {
  return events.filter((event) => !event.cancelled).length;
}

/**
 * The API stores only a checked 11-character video ID. The player is the
 * privacy-enhanced one, loaded only when a guest presses play.
 */
export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0`;
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}
