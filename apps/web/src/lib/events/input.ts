/**
 * Checks on a new event before it is sent, so the form answers at once.
 * The same limits as the API's; the API decides in the end, and its field
 * errors are shown the same way.
 */

export const EVENT_INPUT_LIMITS = {
  title: 80,
  description: 2000,
  venueName: 120,
  venueAddress: 300,
} as const;

export interface EventInput {
  title: string;
  startDate: string;
  startTime: string;
  venueName: string;
  venueAddress: string;
  description: string;
}

function tooLong(value: string, limit: number): string | undefined {
  return [...value].length > limit ? `Use ${limit} characters or fewer.` : undefined;
}

/** Field errors keyed as the API names the fields (`venue.name`). */
export function eventInputErrors(input: EventInput): Record<string, string> {
  const errors: Record<string, string> = {};
  const set = (field: string, message: string | undefined) => {
    if (message) errors[field] = message;
  };
  set(
    'title',
    input.title === ''
      ? 'Enter the ceremony’s name.'
      : tooLong(input.title, EVENT_INPUT_LIMITS.title),
  );
  set(
    'startTime',
    input.startTime && !input.startDate ? 'Choose the day first, then the time.' : undefined,
  );
  set('venue.name', tooLong(input.venueName, EVENT_INPUT_LIMITS.venueName));
  set('venue.address', tooLong(input.venueAddress, EVENT_INPUT_LIMITS.venueAddress));
  set('description', tooLong(input.description, EVENT_INPUT_LIMITS.description));
  return errors;
}

/**
 * Every IANA time zone the browser knows, India first. Some browsers list
 * India under its old name (Asia/Calcutta); the current one is used instead.
 */
export function timeZoneChoices(): string[] {
  const all =
    typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
  const others = all.filter((zone) => zone !== 'Asia/Kolkata' && zone !== 'Asia/Calcutta');
  return ['Asia/Kolkata', ...others];
}
