import { createHash, randomBytes } from 'node:crypto';

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
