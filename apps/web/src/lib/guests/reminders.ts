import type { components } from '@my-marriage/contracts';

export type ReminderPreview = components['schemas']['ReminderPreviewDto'];
export type ReminderResult = components['schemas']['ReminderResultDto'];
export type ReminderSettings = components['schemas']['ReminderSettingsDto'];
export type SkipReason = keyof ReminderPreview['skipped'];

/** Why guests are left out of a reminder, and what to do about it. */
export const SKIP_TEXT: Record<SkipReason, { title: string; hint: string }> = {
  noEmail: {
    title: 'No email address',
    hint: 'Share their private link on WhatsApp instead.',
  },
  notShared: {
    title: 'Invitation not shared yet',
    hint: 'Send or share their invitation first.',
  },
  linkOff: {
    title: 'Link turned off',
    hint: 'Make a new link for them first.',
  },
  remindersOff: {
    title: 'Turned off reminder emails',
    hint: 'They chose this from their invitation.',
  },
};

export const SKIP_ORDER: readonly SkipReason[] = [
  'noEmail',
  'notShared',
  'linkOff',
  'remindersOff',
];

/** "30 days, 7 days and 3 days before". */
export function offsetsText(offsets: readonly number[]): string {
  const days = offsets.map((offset) => `${offset} days`);
  const list =
    days.length <= 1 ? (days[0] ?? '') : `${days.slice(0, -1).join(', ')} and ${days.at(-1) ?? ''}`;
  return `${list} before`;
}

/**
 * A ceremony a reminder can be about: scheduled, and not on a day already
 * past where it is held. The API decides; this only shapes the choices.
 */
export function isUpcoming(
  event: { state: string; startDate?: string; timeZone: string },
  now: Date = new Date(),
): boolean {
  if (event.state !== 'scheduled') return false;
  if (!event.startDate) return true;
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: event.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return event.startDate >= today;
}
