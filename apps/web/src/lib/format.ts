const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/** ₹1,20,000 — Indian digit grouping, no paise. */
export function formatRupees(rupees: number): string {
  return inr.format(rupees);
}
