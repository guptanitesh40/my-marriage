import type { components } from '@my-marriage/contracts';
import type { FieldErrors } from '@/lib/auth/validation';
import { tidy, weddingErrors, type WeddingInput } from './validation';

type UpdateWedding = components['schemas']['UpdateWeddingDto'];

/**
 * The settings page's details form (PRD WED-04): the onboarding details
 * plus the main venue and a description. The limits and messages mirror
 * the API's (apps/api src/modules/weddings/dto/update-wedding.dto.ts),
 * which checks everything again, including that the map link is Google
 * Maps.
 */
export const DETAILS_LIMITS = { venueName: 120, venueAddress: 300, description: 500 } as const;

export interface DetailsInput extends WeddingInput {
  venueName: string;
  venueAddress: string;
  mapsUrl: string;
  description: string;
}

/** "Ananya & Arjun’s Wedding": the title shown everywhere, from the couple's names. */
export function displayTitle(names: { brideName: string; groomName: string }): string {
  const bride = tidy(names.brideName);
  const groom = tidy(names.groomName);
  if (!bride && !groom) return 'Your wedding';
  return `${bride || '…'} & ${groom || '…'}’s Wedding`;
}

/** Paragraphs keep their line breaks; the ends are trimmed, as the API does. */
export function tidyParagraphs(value: string): string {
  return value.replace(/\r\n?/g, '\n').trim();
}

function tooLong(value: string, limit: number): string | undefined {
  return [...value].length > limit ? `Use ${limit} characters or fewer.` : undefined;
}

/** `storedDate`: the wedding's current date, which may have passed since it was set. */
export function detailsErrors(input: DetailsInput, storedDate?: string): FieldErrors {
  const errors: FieldErrors = { ...weddingErrors(input, storedDate) };
  const checks: [string, string | undefined][] = [
    ['mainVenue.name', tooLong(input.venueName, DETAILS_LIMITS.venueName)],
    ['mainVenue.address', tooLong(input.venueAddress, DETAILS_LIMITS.venueAddress)],
    [
      'mainVenue.mapsUrl',
      input.mapsUrl && !/^https?:\/\//i.test(input.mapsUrl)
        ? 'Paste a Google Maps link, like https://maps.app.goo.gl/…'
        : undefined,
    ],
    ['description', tooLong(input.description, DETAILS_LIMITS.description)],
  ];
  for (const [field, message] of checks) if (message) errors[field] = message;
  return errors;
}

/** The whole form as one change: an emptied optional field removes it. */
export function detailsBody(input: DetailsInput): UpdateWedding {
  const venue = {
    ...(input.venueName ? { name: input.venueName } : {}),
    ...(input.venueAddress ? { address: input.venueAddress } : {}),
    ...(input.mapsUrl ? { mapsUrl: input.mapsUrl } : {}),
  };
  return {
    brideName: input.brideName,
    groomName: input.groomName,
    city: input.city,
    state: input.state,
    weddingDate: input.weddingDate || null,
    mainVenue: Object.keys(venue).length > 0 ? venue : null,
    description: input.description || null,
  };
}

/** "10 Feb 2027, 4:15 pm", as in India: when something was saved or requested. */
export function stampTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });
}
