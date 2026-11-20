/**
 * Checks on a guest before it is sent, so the form answers at once. The
 * same rules as the API's; the API decides in the end.
 */

export const GUEST_INPUT_LIMITS = {
  name: 120,
  partySize: 100,
  email: 254,
  phone: 30,
  notes: 2000,
} as const;

export interface GuestInput {
  name: string;
  partySize: string;
  email: string;
  phone: string;
  notes: string;
}

export function isPhone(value: string): boolean {
  if (!/^\+?[\d\s().-]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, '').length;
  return digits >= 6 && digits <= 15;
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(value);
}

export function guestInputErrors(input: GuestInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (input.name === '') errors.name = 'Enter the primary contact’s name.';
  else if ([...input.name].length > GUEST_INPUT_LIMITS.name) {
    errors.name = `Use ${GUEST_INPUT_LIMITS.name} characters or fewer.`;
  }
  const size = Number(input.partySize);
  if (!/^\d+$/.test(input.partySize) || size < 1 || size > GUEST_INPUT_LIMITS.partySize) {
    errors.partySize = `Enter how many people are invited, from 1 to ${GUEST_INPUT_LIMITS.partySize}.`;
  }
  if (input.email && !isEmail(input.email)) {
    errors.email = 'Enter a valid email address, like name@example.com.';
  }
  if (input.phone && !isPhone(input.phone)) {
    errors.phone = 'Enter a phone number, like +91 98200 00000.';
  }
  if ([...input.notes].length > GUEST_INPUT_LIMITS.notes) {
    errors.organizerNotes = `Use ${GUEST_INPUT_LIMITS.notes} characters or fewer.`;
  }
  return errors;
}
