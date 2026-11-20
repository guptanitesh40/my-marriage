import type { components } from '@my-marriage/contracts';

type WeddingNames = Pick<components['schemas']['WeddingDto'], 'brideName' | 'groomName'>;
type WeddingPlace = Pick<components['schemas']['WeddingDto'], 'city' | 'state' | 'weddingDate'>;

/** "Ananya & Arjun". */
export function coupleName(wedding: WeddingNames): string {
  return `${wedding.brideName} & ${wedding.groomName}`;
}

/**
 * "10 December 2027", or with `weekday` "Friday, 10 December 2027", for a
 * calendar day (`YYYY-MM-DD`) or an instant, as in India.
 */
export function longDate(value: string, { weekday = false } = {}): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00+05:30`)
    : new Date(value);
  return date.toLocaleDateString('en-IN', {
    ...(weekday ? { weekday: 'long' as const } : {}),
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

/** "Jaipur, Rajasthan · 10 December 2027". */
export function whereAndWhen(wedding: WeddingPlace): string {
  const place = `${wedding.city}, ${wedding.state}`;
  return wedding.weddingDate ? `${place} · ${longDate(wedding.weddingDate)}` : place;
}

type Membership = Pick<components['schemas']['WeddingDto'], 'role' | 'status'>;

/** "Owner" or "Manager": the visitor's role in a wedding. */
export function roleLabel(role: Membership['role']): string {
  return role === 'owner' ? 'Owner' : 'Manager';
}

/** "Archived" or "Deletion pending"; nothing for an active wedding. */
export function statusLabel(status: Membership['status']): string | undefined {
  if (status === 'archived') return 'Archived';
  if (status === 'deletion_pending') return 'Deletion pending';
  return undefined;
}

/** "Jaipur 2027", or just the city without a date: names the wedding in the header. */
export function placeAndYear(wedding: Pick<WeddingPlace, 'city' | 'weddingDate'>): string {
  return wedding.weddingDate ? `${wedding.city} ${wedding.weddingDate.slice(0, 4)}` : wedding.city;
}
