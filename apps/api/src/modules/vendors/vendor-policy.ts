/**
 * Vendor rules shared by the DTOs and the service (decision 0013).
 */

/** The most vendors one list returns; it says when there are more. */
export const VENDOR_LIST_LIMIT = 500;

export const VENDOR_LIMITS = {
  name: 120,
  category: 60,
  contactName: 80,
  /** Digits in a phone number: E.164 allows at most 15; fewer than 6 is not a number. */
  phoneDigits: { min: 6, max: 15 },
  phone: 30,
  email: 254,
  address: 500,
  notes: 4000,
  /** Events one vendor can be linked to. */
  events: 50,
} as const;
