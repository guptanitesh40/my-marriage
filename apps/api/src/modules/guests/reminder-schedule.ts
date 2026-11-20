import type { EventBrief } from '../events/events.service.js';
import { REMINDER_SEND_HOUR } from './guest-policy.js';

/**
 * When reminders apply (decision 0016). Pure functions over a ceremony's
 * local calendar day, so they can be tested without a clock.
 */

/** Today's date (`YYYY-MM-DD`) and hour in `timeZone`. */
export function localNow(now: Date, timeZone: string): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? '';
  return {
    date: `${part('year')}-${part('month')}-${part('day')}`,
    hour: Number(part('hour')),
  };
}

/** `YYYY-MM-DD` moved by `days` calendar days. */
export function addDays(date: string, days: number): string {
  const moved = new Date(`${date}T00:00:00Z`);
  moved.setUTCDate(moved.getUTCDate() + days);
  return moved.toISOString().slice(0, 10);
}

/**
 * A ceremony a reminder can be about: not deleted, cancelled or completed,
 * and not on a day already past where it is held. One without a date yet
 * counts: the reminder says the date is to be announced.
 */
export function isUpcoming(event: EventBrief, now: Date): boolean {
  if (event.deleted || event.cancelled || event.completed) return false;
  return !event.startDate || event.startDate >= localNow(now, event.timeZone).date;
}

/**
 * The offsets whose reminder is due for `event` at `now`: those falling on
 * the ceremony's local today, from REMINDER_SEND_HOUR. Only that day: a
 * reminder missed for a whole day is not sent late, and switching reminders
 * on a week before a ceremony does not send the 30-day one.
 */
export function dueOffsets(event: EventBrief, offsets: readonly number[], now: Date): number[] {
  if (!event.startDate || !isUpcoming(event, now)) return [];
  const today = localNow(now, event.timeZone);
  if (today.hour < REMINDER_SEND_HOUR) return [];
  const start = event.startDate;
  return offsets.filter((offset) => addDays(start, -offset) === today.date);
}
