import type { RateLimitRule } from '../../platform/rate-limit.js';

/**
 * Session and abuse-control settings approved for M2 (decision 0003). Kept
 * together so the whole policy can be reviewed in one place.
 */

/** A session ends 30 days after sign-in, however active it is. */
export const SESSION_ABSOLUTE_MS = 30 * 24 * 60 * 60 * 1000;
/** …or after 7 days without use. */
export const SESSION_IDLE_MS = 7 * 24 * 60 * 60 * 1000;
/** `lastSeenAt` is written at most this often, not on every request. */
export const SESSION_TOUCH_MS = 10 * 60 * 1000;

/** Email verification links work for 24 hours. */
export const VERIFY_EMAIL_TTL_MS = 24 * 60 * 60 * 1000;
/** Password reset links work for 1 hour. */
export const RESET_PASSWORD_TTL_MS = 60 * 60 * 1000;

const minutes = (count: number) => count * 60;
const hours = (count: number) => count * 60 * 60;

/**
 * Per-IP limits are generous: mobile carriers in India put many people behind
 * one address. Per-account limits are keyed on the email typed, whether or not
 * an account exists, so hitting one reveals nothing about who has an account.
 */
export const RATE_LIMITS = {
  /**
   * Failed sign-ins for one email. Each attempt is counted before its
   * password is checked and a success clears the count, so in effect only
   * failures add up. No permanent lockout: it would let anyone lock a family
   * member out.
   */
  loginFailuresPerAccount: { name: 'login-fail-account', limit: 5, windowSeconds: minutes(15) },
  loginPerIp: { name: 'login-ip', limit: 100, windowSeconds: minutes(15) },
  signupPerIp: { name: 'signup-ip', limit: 10, windowSeconds: hours(1) },
  /** Over this, the request is answered as usual but no email is sent. */
  verificationEmailPerAccountMinute: {
    name: 'verify-send-account-min',
    limit: 1,
    windowSeconds: minutes(1),
  },
  verificationEmailPerAccountDay: {
    name: 'verify-send-account-day',
    limit: 5,
    windowSeconds: hours(24),
  },
  verificationResendPerIp: { name: 'verify-resend-ip', limit: 20, windowSeconds: hours(1) },
  /** Over this, the request is answered as usual but no email is sent. */
  resetEmailPerAccount: { name: 'reset-send-account', limit: 3, windowSeconds: hours(1) },
  forgotPasswordPerIp: { name: 'forgot-ip', limit: 20, windowSeconds: hours(1) },
  /** Using a link from an email. Links are unguessable; this only stops floods. */
  tokenUsePerIp: { name: 'token-use-ip', limit: 30, windowSeconds: minutes(15) },
} as const satisfies Record<string, RateLimitRule>;
