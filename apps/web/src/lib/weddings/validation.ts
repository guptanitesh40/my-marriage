import { collect, type FieldErrors } from '@/lib/auth/validation';

/**
 * Checks run in the browser before the wedding form is sent, so obvious
 * mistakes show at once. They mirror the API's rules and messages
 * (apps/api src/modules/weddings/dto); the API checks everything again and
 * has the final word.
 */
export const WEDDING_MESSAGES = {
  brideName: "Enter the bride's name.",
  groomName: "Enter the groom's name.",
  city: 'Enter the city.',
  state: 'Choose the state.',
  weddingDate: 'Enter a real date, like 2027-12-10.',
  pastDate: 'Choose today or a later date.',
} as const;

/** Today (`YYYY-MM-DD`) in India, where the API decides what "the past" is. */
export function todayInIndia(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export const WEDDING_LIMITS = { brideName: 60, groomName: 60, city: 80, state: 60 } as const;

export interface WeddingInput {
  brideName: string;
  groomName: string;
  city: string;
  state: string;
  /** `YYYY-MM-DD`, as a date input gives it; empty when not known. */
  weddingDate: string;
}

/** Trims and joins runs of spaces, as the API does. */
export function tidy(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function lineError(value: string, field: keyof typeof WEDDING_LIMITS): string | undefined {
  if (value === '') return WEDDING_MESSAGES[field];
  if ([...value].length > WEDDING_LIMITS[field]) {
    return `Use ${WEDDING_LIMITS[field]} characters or fewer.`;
  }
  return undefined;
}

function dateError(value: string, storedDate?: string): string | undefined {
  if (value === '') return undefined;
  const date = new Date(`${value}T00:00:00Z`);
  const real =
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    date.getUTCFullYear() >= 2000 &&
    date.getUTCFullYear() <= 2100;
  if (!real) return WEDDING_MESSAGES.weddingDate;
  // A date saved earlier may have passed since; only a new date must not be past.
  if (value !== storedDate && value < todayInIndia()) return WEDDING_MESSAGES.pastDate;
  return undefined;
}

/** `storedDate`: the wedding's current date, when editing. */
export function weddingErrors(input: WeddingInput, storedDate?: string): FieldErrors {
  return collect({
    brideName: lineError(input.brideName, 'brideName'),
    groomName: lineError(input.groomName, 'groomName'),
    city: lineError(input.city, 'city'),
    state: lineError(input.state, 'state'),
    weddingDate: dateError(input.weddingDate, storedDate),
  });
}
