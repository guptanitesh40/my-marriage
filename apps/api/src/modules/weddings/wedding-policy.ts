import type { RateLimitRule } from '../../platform/rate-limit.js';

/** Wedding rules and limits, in one place for review (decisions 0004 and 0005). */

/** At most two owners, equal in power (PRD 3.1, schema document §4.06). */
export const MAX_OWNERS = 2;

/** A partner invitation works for 7 days; resending starts the 7 days again. */
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Wedding dates are calendar days in India; "today" is today there. */
export const WEDDING_TIME_ZONE = 'Asia/Kolkata';

/** Today's date (`YYYY-MM-DD`) in India. */
export function todayInIndia(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: WEDDING_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

const minutes = (count: number) => count * 60;
const hours = (count: number) => count * 60 * 60;

export const WEDDING_RATE_LIMITS = {
  /** Invitation emails one wedding can send, first sends and resends together. */
  inviteEmailsPerWedding: { name: 'invite-wedding-day', limit: 10, windowSeconds: hours(24) },
  /** Resending one invitation; a minute is enough for the first email to arrive. */
  inviteResendPerInvite: { name: 'invite-resend-min', limit: 1, windowSeconds: minutes(1) },
  /** Using an invitation link. Links are unguessable; this only stops floods. */
  inviteTokenPerIp: { name: 'invite-token-ip', limit: 30, windowSeconds: minutes(15) },
} as const satisfies Record<string, RateLimitRule>;
