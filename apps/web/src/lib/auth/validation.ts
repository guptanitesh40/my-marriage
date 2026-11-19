/**
 * Checks run in the browser before a form is sent, so obvious mistakes are
 * shown at once. They mirror the API's rules and messages (apps/api
 * src/modules/auth/password-policy.ts and dto/fields.ts); the API checks
 * everything again and has the final word, including the common-password
 * check, which is not repeated here.
 */
export const PASSWORD_MIN_LENGTH = 10;
const PASSWORD_MAX_LENGTH = 128;

export const MESSAGES = {
  email: 'Enter a valid email address, like name@example.com.',
  password: 'Enter your password.',
  passwordTooShort: `Use at least ${PASSWORD_MIN_LENGTH} characters.`,
  passwordTooLong: `Use ${PASSWORD_MAX_LENGTH} characters or fewer.`,
  displayName: 'Enter your name.',
  passwordConfirm: 'Enter the same password again.',
  passwordMismatch: 'The passwords do not match.',
} as const;

export type FieldErrors = Record<string, string>;

export function emailError(email: string): string | undefined {
  // Deliberately loose: one @, something on both sides, a dot in the domain.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? undefined : MESSAGES.email;
}

export function newPasswordError(password: string): string | undefined {
  const length = [...password.normalize('NFKC')].length;
  if (length < PASSWORD_MIN_LENGTH) return MESSAGES.passwordTooShort;
  if (length > PASSWORD_MAX_LENGTH) return MESSAGES.passwordTooLong;
  return undefined;
}

/** The second "type it again" field, which only the browser checks. */
export function confirmPasswordError(password: string, confirm: string): string | undefined {
  if (confirm === '') return MESSAGES.passwordConfirm;
  return confirm === password ? undefined : MESSAGES.passwordMismatch;
}

/** Drops the entries without a message. */
export function collect(errors: Record<string, string | undefined>): FieldErrors {
  return Object.fromEntries(
    Object.entries(errors).filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
}
