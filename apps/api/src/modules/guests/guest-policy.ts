import type { RateLimitRule } from '../../platform/rate-limit.js';

/** Guest rules shared by the DTOs and the services (decision 0015). */

export const GUEST_LIMITS = {
  name: 120,
  partySize: 100,
  phone: 30,
  email: 254,
  notes: 2000,
  events: 50,
  importRows: 1000,
} as const;

/** The most guests one list returns; it says when there are more. */
export const GUEST_LIST_LIMIT = 2000;

/** How long a guest's browser stays signed in to their invitation after opening the link. */
export const GUEST_SESSION_DAYS = 30;

/** Used in development and tests when GUEST_LINK_SECRET is not set. Public: never for production. */
export const DEVELOPMENT_LINK_SECRET = 'development-only-guest-link-secret-not-for-production';

const minutes = (n: number) => n * 60;
const hours = (n: number) => n * 3600;

export const GUEST_RATE_LIMITS = {
  /** Invitation and reminder emails one wedding can send in a day; Gmail allows about 500. */
  inviteEmailsPerWedding: { name: 'guest-email-wedding-day', limit: 300, windowSeconds: hours(24) },
  /** Resending to one guest. */
  inviteEmailPerGuest: { name: 'guest-email-guest-min', limit: 1, windowSeconds: minutes(1) },
  /** Opening invitation links. Links are unguessable; this only stops floods. */
  exchangePerIp: { name: 'guest-exchange-ip', limit: 60, windowSeconds: minutes(15) },
  /** RSVP changes from one guest browser. */
  rsvpPerSession: { name: 'guest-rsvp-session', limit: 60, windowSeconds: minutes(15) },
} as const satisfies Record<string, RateLimitRule>;

/** Automatic reminders: days before a ceremony (PRD INV-07). */
export const REMINDER_OFFSETS = [30, 7, 3] as const;
export type ReminderOffset = (typeof REMINDER_OFFSETS)[number];

/** Local hour, in the ceremony's time zone, from which a day's reminders go out (PRD §5.10). */
export const REMINDER_SEND_HOUR = 9;

/** How often the worker checks for reminders that are due. */
export const REMINDER_CHECK_MINUTES = 15;

/** The couple's optional note on a reminder. */
export const REMINDER_NOTE_LIMIT = 500;

/** Guests named per reason in a reminder preview; the count is always complete. */
export const REMINDER_PREVIEW_NAMES = 50;
