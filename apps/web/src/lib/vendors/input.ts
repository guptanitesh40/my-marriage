/**
 * Checks on a vendor before it is sent, so the form answers at once. The
 * same rules as the API's; the API decides in the end, and its field
 * errors are shown the same way.
 */

export const VENDOR_INPUT_LIMITS = {
  name: 120,
  category: 60,
  contactName: 80,
  phone: 30,
  email: 254,
  address: 500,
  notes: 4000,
} as const;

export interface VendorInput {
  name: string;
  category: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

function tooLong(value: string, limit: number): string | undefined {
  return [...value].length > limit ? `Use ${limit} characters or fewer.` : undefined;
}

export function isPhone(value: string): boolean {
  if (!/^\+?[\d\s().-]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, '').length;
  return digits >= 6 && digits <= 15;
}

/** Close to what the API accepts; the API has the last word. */
export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(value);
}

/** Field errors keyed as the API names the fields. */
export function vendorInputErrors(input: VendorInput): Record<string, string> {
  const errors: Record<string, string> = {};
  const set = (field: string, message: string | undefined) => {
    if (message) errors[field] = message;
  };
  set(
    'name',
    input.name === ''
      ? 'Enter the vendor or business name.'
      : tooLong(input.name, VENDOR_INPUT_LIMITS.name),
  );
  set(
    'category',
    input.category === ''
      ? 'Choose a service category.'
      : tooLong(input.category, VENDOR_INPUT_LIMITS.category),
  );
  set('contactName', tooLong(input.contactName, VENDOR_INPUT_LIMITS.contactName));
  set(
    'phone',
    input.phone && !isPhone(input.phone)
      ? 'Enter a phone number, like +91 98200 00000.'
      : undefined,
  );
  set(
    'email',
    input.email && (!isEmail(input.email) || input.email.length > VENDOR_INPUT_LIMITS.email)
      ? 'Enter a valid email address, like name@example.com.'
      : undefined,
  );
  set('address', tooLong(input.address, VENDOR_INPUT_LIMITS.address));
  set('notes', tooLong(input.notes, VENDOR_INPUT_LIMITS.notes));
  return errors;
}
