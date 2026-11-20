const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/** ₹1,20,000 — Indian digit grouping, no paise. */
export function formatRupees(rupees: number): string {
  return inr.format(rupees);
}

/** "Arjun Mehta" → "Arjun", for short sentences. */
export function firstName(name: string | undefined): string | undefined {
  return name?.trim().split(/\s+/)[0];
}

/** "Arjun Mehta" → "AM", for avatars. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/);
  const letters = words.length > 1 ? [words[0], words[words.length - 1]] : words;
  return letters
    .map((word) => word?.charAt(0) ?? '')
    .join('')
    .toUpperCase();
}
