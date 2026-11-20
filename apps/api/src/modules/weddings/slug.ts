import { randomInt } from 'node:crypto';

/** The longest slug before a suffix: room for `-xxxx` within 60 characters. */
const BASE_MAX_LENGTH = 48;
const SUFFIX_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const SUFFIX_LENGTH = 4;
/** Used when neither name has any Latin letter or digit, e.g. names in Devanagari. */
const FALLBACK_BASE = 'wedding';

/** A valid slug: lowercase letters and digits in hyphen-separated words. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function toWords(name: string): string {
  return (
    name
      // "Aarav Mehtā" → "Aarav Mehta": split accented letters, drop the accents.
      .normalize('NFKD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  );
}

/**
 * The preferred slug for a couple: "Ananya", "Arjun" → "ananya-arjun".
 * Not necessarily free; see `withSuffix`.
 */
export function slugBase(brideName: string, groomName: string): string {
  const joined = [toWords(brideName), toWords(groomName)].filter(Boolean).join('-');
  const base = joined.slice(0, BASE_MAX_LENGTH).replace(/-+$/, '');
  return base || FALLBACK_BASE;
}

/** True for the shared fallback, which is never worth trying without a suffix. */
export function isFallbackBase(base: string): boolean {
  return base === FALLBACK_BASE;
}

/** "ananya-arjun" → "ananya-arjun-k7q2". Random, so the next couple cannot guess it. */
export function withSuffix(base: string, random: (max: number) => number = randomInt): string {
  let suffix = '';
  for (let i = 0; i < SUFFIX_LENGTH; i += 1) {
    suffix += SUFFIX_ALPHABET[random(SUFFIX_ALPHABET.length)];
  }
  return `${base}-${suffix}`;
}

/** A web address a couple may choose (decision 0017): 3 to 60 characters. */
export const SLUG_LIMITS = { min: 3, max: 60 } as const;

export const SLUG_MESSAGE =
  'Use 3 to 60 lowercase letters, numbers and single hyphens, like ananya-arjun.';

export function isValidSlug(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= SLUG_LIMITS.min &&
    value.length <= SLUG_LIMITS.max &&
    SLUG_PATTERN.test(value)
  );
}
