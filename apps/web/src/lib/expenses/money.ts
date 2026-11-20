/**
 * Money in the app is integer paise (₹80,000 is 8000000), as the API keeps
 * it. These turn it into "₹80,000" and back, without floating point.
 */

/** ₹100 crore, the API's limit. */
export const MAX_PAISE = 100_000_000_000;

/** "₹1,50,000", or "₹1,50,000.50" when there are paise; "−₹8,000" when negative. */
export function formatInr(paise: number): string {
  const sign = paise < 0 ? '−' : '';
  const whole = Math.abs(paise);
  const rupees = Math.trunc(whole / 100);
  const rest = whole % 100;
  const grouped = new Intl.NumberFormat('en-IN').format(rupees);
  return `${sign}₹${grouped}${rest ? `.${String(rest).padStart(2, '0')}` : ''}`;
}

/**
 * What someone typed, as paise: "80,000", "₹ 80000", "80000.5" or
 * "80000.50". Null when it is not an amount (letters, three decimals, a
 * minus sign).
 */
export function parseRupees(text: string): number | null {
  const plain = text.replace(/[₹,\s]/g, '');
  const match = /^(\d{1,12})(?:\.(\d{1,2}))?$/.exec(plain);
  if (!match) return null;
  const rupees = Number(match[1]);
  const paise = Number((match[2] ?? '').padEnd(2, '0'));
  return rupees * 100 + paise;
}

/** Paise as the form shows them to edit: "80000" or "80000.50". */
export function rupeesInput(paise: number): string {
  const rupees = Math.trunc(paise / 100);
  const rest = paise % 100;
  return rest ? `${rupees}.${String(rest).padStart(2, '0')}` : String(rupees);
}

/** The amount's problem, or nothing when it is fine. */
export function amountProblem(text: string, maximumPaise = MAX_PAISE): string | undefined {
  if (text.trim() === '') return 'Enter an amount greater than ₹0.';
  const paise = parseRupees(text);
  if (paise === null) return 'Enter an amount like 80,000 or 80,000.50.';
  if (paise === 0) return 'Enter an amount greater than ₹0.';
  if (paise > maximumPaise) return 'Enter a smaller amount.';
  return undefined;
}

/** `part` of `whole`, as a whole percentage for a progress bar (0 to 100). */
export function share(part: number, whole: number): number {
  if (whole <= 0) return part > 0 ? 100 : 0;
  return Math.min(100, Math.round((part / whole) * 100));
}
