import type { components } from '@my-marriage/contracts';

type Event = components['schemas']['EventDto'];

const INDIA = 'Asia/Kolkata';

/**
 * "Thu, 12 Dec 2027 · 10:00 am" as clocks show it where the event happens,
 * with the place named when that is not India ("· London time"); just the
 * day without a time. Nothing without a day.
 */
export function eventWhen(
  event: Pick<Event, 'startDate' | 'startTime' | 'timeZone'>,
): string | undefined {
  if (!event.startDate) return undefined;
  // The day and time are already wall-clock values: format them as UTC so
  // the viewer's own time zone never shifts them.
  const day = new Date(`${event.startDate}T${event.startTime ?? '00:00'}:00Z`);
  // Built from parts: locales differ on the commas ("12 Dec, 2027").
  const part = (options: Intl.DateTimeFormatOptions) =>
    day.toLocaleDateString('en-IN', { ...options, timeZone: 'UTC' });
  const date = `${part({ weekday: 'short' })}, ${part({ day: 'numeric' })} ${part({ month: 'short' })} ${part({ year: 'numeric' })}`;
  const parts = [date];
  if (event.startTime) {
    parts.push(
      day.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }),
    );
  }
  if (event.timeZone !== INDIA) parts.push(`${zonePlace(event.timeZone)} time`);
  return parts.join(' · ');
}

/** "Europe/London" → "London"; "America/Argentina/Buenos_Aires" → "Buenos Aires". */
export function zonePlace(timeZone: string): string {
  return (timeZone.split('/').pop() ?? timeZone).replace(/_/g, ' ');
}

/**
 * "Day 1", "Day 2"… for each dated event, counted in calendar days from the
 * earliest one, so events on the same day share a number.
 */
export function dayNumbers(
  events: readonly Pick<Event, 'id' | 'startDate'>[],
): Map<string, number> {
  const days = events.flatMap((event) => (event.startDate ? [event.startDate] : [])).sort();
  const first = days[0];
  const numbers = new Map<string, number>();
  if (!first) return numbers;
  const start = Date.parse(`${first}T00:00:00Z`);
  for (const event of events) {
    if (!event.startDate) continue;
    const offset = Math.round((Date.parse(`${event.startDate}T00:00:00Z`) - start) / 86_400_000);
    numbers.set(event.id, offset + 1);
  }
  return numbers;
}

/** What is still missing, for the "incomplete" chips (PRD EVT-02). */
export function missingDetails(event: Pick<Event, 'startDate' | 'startTime' | 'venue'>): string[] {
  const missing: string[] = [];
  if (!event.startDate) missing.push('Date not set');
  else if (!event.startTime) missing.push('Time not set');
  if (!event.venue?.name && !event.venue?.address) missing.push('Venue not set');
  return missing;
}

/** "Morning", "Afternoon", "Evening" or "Night" for a start time (`HH:mm`), as the design labels days. */
export function partOfDay(time: string | undefined): string | undefined {
  if (!time) return undefined;
  const hour = Number(time.slice(0, 2));
  if (hour < 12) return 'Morning';
  if (hour < 16) return 'Afternoon';
  if (hour < 20) return 'Evening';
  return 'Night';
}

function dayAndMonth(day: string, withYear: boolean): { day: string; month: string; year: string } {
  const date = new Date(`${day}T00:00:00Z`);
  const part = (options: Intl.DateTimeFormatOptions) =>
    date.toLocaleDateString('en-IN', { ...options, timeZone: 'UTC' });
  return {
    day: part({ day: 'numeric' }),
    month: part({ month: 'short' }),
    year: withYear ? part({ year: 'numeric' }) : '',
  };
}

/**
 * How many calendar days the dated ceremonies cover, and which: "10–16 Feb",
 * "28 Feb – 2 Mar", "30 Dec 2027 – 2 Jan 2028". Nothing without a dated one.
 */
export function eventSpan(
  events: readonly Pick<Event, 'startDate'>[],
): { days: number; label: string } | undefined {
  const days = events.flatMap((event) => (event.startDate ? [event.startDate] : [])).sort();
  const first = days[0];
  const last = days[days.length - 1];
  if (!first || !last) return undefined;
  const count = Math.round((Date.parse(last) - Date.parse(first)) / 86_400_000) + 1;
  const sameYear = first.slice(0, 4) === last.slice(0, 4);
  const a = dayAndMonth(first, !sameYear);
  const b = dayAndMonth(last, !sameYear);
  const label =
    first === last
      ? `${a.day} ${a.month}`
      : sameYear && a.month === b.month
        ? `${a.day}–${b.day} ${b.month}`
        : `${[a.day, a.month, a.year].filter(Boolean).join(' ')} – ${[b.day, b.month, b.year].filter(Boolean).join(' ')}`;
  return { days: count, label };
}

/** Scheduled, and on or after `today` (or with no day yet). */
export function isUpcoming(event: Pick<Event, 'state' | 'startDate'>, today: string): boolean {
  return event.state === 'scheduled' && (!event.startDate || event.startDate >= today);
}

/** The first scheduled ceremony from `today` on, and how many days away it is. */
export function nextEvent<T extends Pick<Event, 'state' | 'startDate'>>(
  events: readonly T[],
  today: string,
): { event: T; inDays: number } | undefined {
  const next = events
    .filter((event) => event.state === 'scheduled' && event.startDate && event.startDate >= today)
    .sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? ''))[0];
  if (!next?.startDate) return undefined;
  return {
    event: next,
    inDays: Math.round((Date.parse(next.startDate) - Date.parse(today)) / 86_400_000),
  };
}
