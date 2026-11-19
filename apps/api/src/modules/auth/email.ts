/**
 * The one form of an email address used for sign-in, uniqueness and lookup
 * (`users.emailNormalized`): trimmed, Unicode-normalised and lower-cased.
 *
 * Provider-specific rewriting (dropping Gmail dots or `+tags`) is deliberately
 * not done: those are different addresses to every other provider, and
 * guessing wrong would merge or lock out real accounts.
 */
export function normalizeEmail(email: string): string {
  return email.trim().normalize('NFC').toLowerCase();
}
