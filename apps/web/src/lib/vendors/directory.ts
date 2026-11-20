import type { components } from '@my-marriage/contracts';

export type Vendor = components['schemas']['VendorDto'];

/**
 * The categories offered when adding a vendor, as in the approved Stitch
 * design. The API takes any category (decision 0013): "Other" lets people
 * name their own.
 */
export const VENDOR_CATEGORIES = [
  'Photography & Videography',
  'Catering',
  'Decoration',
  'Makeup & Styling',
  'Music & DJ',
  'Venue',
  'Transportation',
  'Mehendi Artist',
  'Event Coordination',
] as const;

/** The event filter's value for vendors with no ceremony. */
export const NOT_LINKED = 'none';

/** What the directory shows, kept in the address so it survives a reload and can be shared. */
export interface VendorFilters {
  q: string;
  /** A category exactly as stored, or empty for all. */
  category: string;
  /** An event ID, `none` for vendors with no event, or empty for all. */
  eventId: string;
}

export const NO_FILTERS: VendorFilters = { q: '', category: '', eventId: '' };

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

/** The filters in an address; anything unexpected is ignored. */
export function readFilters(params: SearchParams): VendorFilters {
  const eventId = first(params.eventId);
  return {
    q: first(params.q).slice(0, 100),
    category: first(params.category).slice(0, 60),
    eventId: eventId === NOT_LINKED || /^[a-f0-9]{24}$/i.test(eventId) ? eventId : '',
  };
}

/** The filters as a query string, leaving out those not set. */
export function filterParams(filters: VendorFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set('q', filters.q.trim());
  if (filters.category) params.set('category', filters.category);
  if (filters.eventId) params.set('eventId', filters.eventId);
  return params;
}

export function isNarrowed(filters: VendorFilters): boolean {
  return Boolean(filters.q.trim() || filters.category || filters.eventId);
}

/** Every word somewhere in the name, category, contact, phone or email, ignoring case. */
export function matches(vendor: Vendor, filters: VendorFilters): boolean {
  if (filters.category && vendor.category !== filters.category) return false;
  if (filters.eventId === NOT_LINKED && vendor.events.length > 0) return false;
  if (
    filters.eventId &&
    filters.eventId !== NOT_LINKED &&
    !vendor.events.some((event) => event.id === filters.eventId)
  ) {
    return false;
  }
  const words = filters.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const text = [vendor.name, vendor.category, vendor.contactName, vendor.phone, vendor.email]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  // Phone numbers match however they are spaced.
  const digits = vendor.phone?.replace(/\D/g, '') ?? '';
  return words.every(
    (word) =>
      text.includes(word) || (/^\+?\d+$/.test(word) && digits.includes(word.replace('+', ''))),
  );
}

/** The categories in use, A to Z, for the category filter. */
export function categoriesOf(vendors: readonly Vendor[]): string[] {
  return [...new Set(vendors.map((vendor) => vendor.category))].sort((a, b) =>
    a.localeCompare(b, 'en', { sensitivity: 'base' }),
  );
}

/** "MS" for The Marigold Studio: up to two initials, skipping "The". */
export function initials(name: string): string {
  const words = name
    .split(/\s+/)
    .filter((word) => /\p{L}|\p{N}/u.test(word))
    .filter((word, index, all) => !(index === 0 && all.length > 1 && /^the$/i.test(word)));
  const letters = words.map((word) => [...word.replace(/^[^\p{L}\p{N}]+/u, '')][0] ?? '');
  return letters.slice(0, 2).join('').toUpperCase() || '?';
}

/** The directory's figures, from all its vendors (not the filtered ones). */
export function directoryStats(vendors: readonly Vendor[]) {
  return {
    total: vendors.length,
    categories: new Set(vendors.map((vendor) => vendor.category)).size,
    multiEvent: vendors.filter((vendor) => vendor.events.length >= 2).length,
    reachable: vendors.filter((vendor) => vendor.phone && vendor.email).length,
    unlinked: vendors.filter((vendor) => vendor.events.length === 0).length,
  };
}
