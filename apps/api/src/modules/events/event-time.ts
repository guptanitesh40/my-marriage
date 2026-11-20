/**
 * Event dates and times. Organizers type a day and a wall-clock time where
 * the ceremony happens; the server, never the browser, turns that into a
 * UTC instant with the event's IANA time zone (schema document §3, PRD
 * NFR-12). Plain functions: no state, no I/O.
 */

/** PRD §2: events default to India time. */
export const DEFAULT_EVENT_TIME_ZONE = 'Asia/Kolkata';

/**
 * An IANA zone name such as `Asia/Kolkata` or `Europe/London`. Offsets
 * (`+05:30`) and abbreviations (`IST`) are refused: they do not follow
 * daylight saving, and abbreviations are ambiguous.
 */
export function isTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || !/^[A-Za-z]+(?:\/[A-Za-z0-9_+-]+)+$|^UTC$/.test(value)) {
    return false;
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** `HH:mm`, 24-hour, 00:00 to 23:59. */
export function isWallTime(value: unknown): value is string {
  return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function wallClockAt(instant: number, timeZone: string): WallClock {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  return {
    year: part('year'),
    month: part('month'),
    day: part('day'),
    hour: part('hour'),
    minute: part('minute'),
  };
}

/** How far the zone's clock is ahead of UTC at `instant`, in milliseconds. */
function offsetAt(instant: number, timeZone: string): number {
  const w = wallClockAt(instant, timeZone);
  return (
    Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute) - Math.floor(instant / 60000) * 60000
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The instant at which clocks in `timeZone` show `day` (`YYYY-MM-DD`) and
 * `time` (`HH:mm`). Around a daylight-saving change this follows the usual
 * rule (Temporal's "compatible"): a time that happens twice is the first of
 * the two; a time the clocks skip is moved later by the length of the jump.
 */
export function zonedInstant(day: string, time: string, timeZone: string): Date {
  const [year, month, date] = day.split('-').map(Number) as [number, number, number];
  const [hour, minute] = time.split(':').map(Number) as [number, number];
  const asUtc = Date.UTC(year, month - 1, date, hour, minute);
  // A zone changes its offset at most once within a day either side, so
  // the offsets a day before and after are the only candidates.
  const before = offsetAt(asUtc - DAY_MS, timeZone);
  const after = offsetAt(asUtc + DAY_MS, timeZone);
  const shows = (instant: number) => {
    const w = wallClockAt(instant, timeZone);
    return w.day === date && w.hour === hour && w.minute === minute;
  };
  const matching = [asUtc - before, asUtc - after].filter(shows);
  if (matching.length > 0) return new Date(Math.min(...matching));
  // Skipped: read the time with the offset from before the jump.
  return new Date(asUtc - before);
}

/** The day (`YYYY-MM-DD`) and time (`HH:mm`) clocks in `timeZone` show at `instant`. */
export function wallClock(instant: Date, timeZone: string): { day: string; time: string } {
  const w = wallClockAt(instant.getTime(), timeZone);
  const pad = (value: number) => String(value).padStart(2, '0');
  return {
    day: `${w.year}-${pad(w.month)}-${pad(w.day)}`,
    time: `${pad(w.hour)}:${pad(w.minute)}`,
  };
}

/** Today (`YYYY-MM-DD`) where the event happens. */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  return wallClock(now, timeZone).day;
}
