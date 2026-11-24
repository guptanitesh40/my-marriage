/**
 * Words and numbers for the overview (decision 0022). Days are calendar
 * days (`YYYY-MM-DD`), compared as such, so the viewer's time zone never
 * moves them. Plain functions, unit tested.
 */

const DAY = 86_400_000;

/** Whole calendar days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY);
}

/** "1 day", "12 days". */
export function plural(count: number, one: string, many = `${one}s`): string {
  return `${new Intl.NumberFormat('en-IN').format(count)} ${count === 1 ? one : many}`;
}

export type Countdown =
  | { kind: 'unset' }
  | { kind: 'ahead'; days: number }
  | { kind: 'today' }
  | { kind: 'past'; days: number };

/**
 * Where the main wedding day stands from `today` (India): days to go, the
 * day itself, or days since. Never a negative count.
 */
export function countdown(weddingDate: string | undefined, today: string): Countdown {
  if (!weddingDate) return { kind: 'unset' };
  const days = daysBetween(today, weddingDate);
  if (days > 0) return { kind: 'ahead', days };
  if (days === 0) return { kind: 'today' };
  return { kind: 'past', days: -days };
}

/** How many days the wedding week lasts before the first ceremony: the overview's "approaching" state. */
export const WEDDING_WEEK_DAYS = 7;

/**
 * "3 days until the celebrations begin" when the first ceremony to come is
 * within the wedding week; "The celebrations begin today" on its day.
 * Nothing when it is further off, or there is none.
 */
export function weddingWeek(firstCeremony: string | undefined, today: string): string | undefined {
  if (!firstCeremony) return undefined;
  const days = daysBetween(today, firstCeremony);
  if (days < 0 || days > WEDDING_WEEK_DAYS) return undefined;
  if (days === 0) return 'The celebrations begin today';
  return `${plural(days, 'day')} until the celebrations begin`;
}

/** "Today", "Tomorrow", "In 5 days" for a day from `today` on. */
export function relativeDay(day: string, today: string): string {
  const days = daysBetween(today, day);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

/** "12" and "Feb" for a calendar day, for the date chips. */
export function dayChip(day: string): { day: string; month: string } {
  const date = new Date(`${day}T00:00:00Z`);
  const part = (options: Intl.DateTimeFormatOptions) =>
    date.toLocaleDateString('en-IN', { ...options, timeZone: 'UTC' });
  return { day: part({ day: 'numeric' }), month: part({ month: 'short' }) };
}

/** "12 Feb", with the year when it is not `today`'s. */
export function shortDay(day: string, today: string): string {
  const { day: number, month } = dayChip(day);
  return day.slice(0, 4) === today.slice(0, 4)
    ? `${number} ${month}`
    : `${number} ${month} ${day.slice(0, 4)}`;
}

/** "10:30 am" for a wall-clock time (`HH:mm`). */
export function clockTime(time: string): string {
  return new Date(`1970-01-01T${time}:00Z`).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

/** Paid and outstanding as shares of what is recorded, for the bar: whole percentages that add up to 100. */
export function paidSplit(
  paidPaise: number,
  outstandingPaise: number,
): { paid: number; due: number } {
  const whole = paidPaise + outstandingPaise;
  if (whole <= 0) return { paid: 0, due: 0 };
  const paid = Math.round((paidPaise / whole) * 100);
  return { paid, due: 100 - paid };
}

/** "2 owners · 1 admin · 3 managers": only the roles someone holds. */
export function teamLine(team: { owners: number; admins: number; managers: number }): string {
  return [
    team.owners > 0 ? plural(team.owners, 'owner') : '',
    team.admins > 0 ? plural(team.admins, 'admin') : '',
    team.managers > 0 ? plural(team.managers, 'manager') : '',
  ]
    .filter(Boolean)
    .join(' · ');
}
