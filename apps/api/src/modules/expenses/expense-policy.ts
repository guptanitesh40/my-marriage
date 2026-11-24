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

/** Receipts and documents kept with expenses (decision 0023). */
export const RECEIPT_LIMITS = {
  /** 15 MB per file: a phone photo of a bill, or a scanned PDF. */
  bytes: 15 * 1024 * 1024,
  /** Files on one expense. */
  perExpense: 10,
  /** Files on one payment, discount, extra or reversal. */
  perEntry: 5,
  /** How long the browser has to upload a file once it asked to. */
  formSeconds: 10 * 60,
} as const;
