import { createHash, createHmac, randomBytes } from 'node:crypto';

/**
 * A new bearer secret (session cookie, email link): 32 random bytes — 256
 * bits — as URL-safe base64. Hand it to the user once; store only `sha256()`
 * of it.
 */
export function randomToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * One-way digest for looking up a high-entropy secret by its hash. A slow
 * password hash is not needed here: a 256-bit random token cannot be guessed
 * or brute-forced from its digest. Never use this for passwords.
 */
export function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/**
 * A secret derived from `key` and `subject` (HMAC-SHA-256, URL-safe base64):
 * the same inputs always give the same 256-bit value, and without the key
 * it cannot be computed. For links that must be shown again (guest
 * invitation links, decision 0015): store only `sha256()` of the result.
 */
export function derivedToken(key: string, subject: string): string {
  return createHmac('sha256', key).update(subject, 'utf8').digest('base64url');
}
