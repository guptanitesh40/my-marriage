import type { components } from '@my-marriage/contracts';

type WeddingNames = Pick<components['schemas']['WeddingDto'], 'brideName' | 'groomName'>;
type WeddingPlace = Pick<components['schemas']['WeddingDto'], 'city' | 'state' | 'weddingDate'>;

/** "Ananya & Arjun". */
export function coupleName(wedding: WeddingNames): string {
  return `${wedding.brideName} & ${wedding.groomName}`;
}

/** "10 December 2027", for a calendar day (`YYYY-MM-DD`) or an instant, as in India. */
export function longDate(value: string): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00+05:30`)
    : new Date(value);
  return date.toLocaleDateString('en-IN', {
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
