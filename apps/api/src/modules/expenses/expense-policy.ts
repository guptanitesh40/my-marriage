/**
 * Expense rules shared by the DTOs and the service (decision 0014).
 */

/** Days are read in India time, like tasks. */
export const EXPENSE_TIME_ZONE = 'Asia/Kolkata';

/** The most expenses one list returns; it says when there are more. */
export const EXPENSE_LIST_LIMIT = 500;

/** ₹100 crore: far above any wedding cost, far below unsafe integers. */
export const MAX_PAISE = 100_000_000_000;

export const EXPENSE_LIMITS = {
  title: 120,
  category: 60,
  notes: 4000,
  note: 500,
} as const;

/** "₹1,50,000" or "₹1,50,000.50": Indian grouping, paise only when there are any. */
export function inr(paise: number): string {
  const rupees = Math.trunc(paise / 100);
  const rest = Math.abs(paise % 100);
  const grouped = new Intl.NumberFormat('en-IN').format(rupees);
  return `₹${grouped}${rest ? `.${String(rest).padStart(2, '0')}` : ''}`;
}
