import type { components } from '@my-marriage/contracts';

type Album = components['schemas']['AlbumDto'];
type Quota = components['schemas']['QuotaDto'];

/** Decimal units, as the 5 GB allowance is counted (decision 0019). */
const GB = 1_000_000_000;
const MB = 1_000_000;

/** "1.6 GB", "350 MB", "0 GB": one decimal, trailing ".0" dropped. */
export function formatBytes(bytes: number): string {
  if (bytes > 0 && bytes < GB) {
    const mb = bytes / MB;
    return `${mb < 10 ? trim(mb.toFixed(1)) : Math.round(mb).toString()} MB`;
  }
  return `${trim((bytes / GB).toFixed(1))} GB`;
}

function trim(value: string): string {
  return value.endsWith('.0') ? value.slice(0, -2) : value;
}

export type StorageLevel = 'ok' | 'notice' | 'warning' | 'full';

/**
 * How full the storage is, counting uploads in progress: the percentage
 * shown (whole, never 100 until full) and the warning level at 70%, 90%
 * and 100% (PRD quota pressure).
 */
export function storageOf(quota: Quota): {
  taken: number;
  percent: number;
  available: number;
  level: StorageLevel;
} {
  const taken = quota.usedBytes + quota.reservedBytes;
  const ratio = quota.limitBytes > 0 ? taken / quota.limitBytes : 1;
  const full = taken >= quota.limitBytes;
  return {
    taken,
    percent: full ? 100 : Math.min(99, Math.floor(ratio * 100)),
    available: Math.max(0, quota.limitBytes - taken),
    level: full ? 'full' : ratio >= 0.9 ? 'warning' : ratio >= 0.7 ? 'notice' : 'ok',
  };
}

/** "12 Feb 2027 · Poolside Gardens" for an event album; what is known of it. */
export function albumWhere(album: Album): string | undefined {
  const event = album.event;
  if (!event) return undefined;
  const parts: string[] = [];
  if (event.startDate) {
    parts.push(
      new Date(`${event.startDate}T00:00:00Z`).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }),
    );
  }
  if (event.venueName) parts.push(event.venueName);
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

/** The kind of album, as its card's overline says it. */
export function albumKindLabel(album: Album): string {
  if (album.kind === 'event') return 'Ceremony album';
  if (album.kind === 'general') return 'General wedding collection';
  return 'Your album';
}

export const ALBUM_FILTERS = ['all', 'event', 'own'] as const;
export type AlbumFilter = (typeof ALBUM_FILTERS)[number];

export function readAlbumFilter(value: string | string[] | undefined): AlbumFilter {
  return ALBUM_FILTERS.find((filter) => filter === value) ?? 'all';
}

/** The albums a filter and a search keep, in their order. */
export function filterAlbums(
  albums: readonly Album[],
  filter: AlbumFilter,
  search: string,
): Album[] {
  const query = search.trim().toLocaleLowerCase('en-IN');
  return albums.filter(
    (album) =>
      (filter === 'all' || (filter === 'event') === (album.kind === 'event')) &&
      (!query || album.title.toLocaleLowerCase('en-IN').includes(query)),
  );
}
