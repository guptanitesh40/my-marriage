import { describe, expect, it } from 'vitest';
import { albumWhere, filterAlbums, formatBytes, readAlbumFilter, storageOf } from './format';

const album = (over: Record<string, unknown>) => ({
  id: 'a',
  kind: 'custom' as const,
  title: 'Album',
  isUploadEnabled: true,
  counts: { pending: 0, approved: 0, total: 0 },
  createdAt: '2026-11-22T00:00:00Z',
  updatedAt: '2026-11-22T00:00:00Z',
  ...over,
});

describe('formatBytes', () => {
  it('counts in decimal units', () => {
    expect(formatBytes(0)).toBe('0 GB');
    expect(formatBytes(1_600_000_000)).toBe('1.6 GB');
    expect(formatBytes(5_000_000_000)).toBe('5 GB');
    expect(formatBytes(350_000_000)).toBe('350 MB');
    expect(formatBytes(4_200_000)).toBe('4.2 MB');
  });
});

describe('storageOf', () => {
  const quota = (used: number, reserved = 0) => ({
    limitBytes: 5_000_000_000,
    usedBytes: used,
    reservedBytes: reserved,
  });

  it('counts uploads in progress and warns at 70, 90 and 100 percent', () => {
    expect(storageOf(quota(1_600_000_000))).toEqual({
      taken: 1_600_000_000,
      percent: 32,
      available: 3_400_000_000,
      level: 'ok',
    });
    expect(storageOf(quota(3_000_000_000, 500_000_000)).level).toBe('notice');
    expect(storageOf(quota(4_600_000_000)).level).toBe('warning');
    expect(storageOf(quota(4_999_999_999)).percent).toBe(99);
    expect(storageOf(quota(5_000_000_000))).toMatchObject({
      percent: 100,
      level: 'full',
      available: 0,
    });
  });
});

describe('albumWhere', () => {
  it('gives the ceremony’s day and venue, whichever are known', () => {
    const event = { id: 'e', title: 'Haldi', cancelled: false, completed: false };
    expect(
      albumWhere(
        album({
          kind: 'event',
          event: { ...event, startDate: '2027-02-12', venueName: 'Poolside Gardens' },
        }),
      ),
    ).toBe('12 Feb 2027 · Poolside Gardens');
    expect(
      albumWhere(album({ kind: 'event', event: { ...event, venueName: 'Haveli Lawn' } })),
    ).toBe('Haveli Lawn');
    expect(albumWhere(album({ kind: 'event', event }))).toBeUndefined();
    expect(albumWhere(album({}))).toBeUndefined();
  });
});

describe('filterAlbums', () => {
  const albums = [
    album({ id: '1', kind: 'event', title: 'Haldi' }),
    album({ id: '2', kind: 'general', title: 'General Collection' }),
    album({ id: '3', kind: 'custom', title: 'Pre-Wedding Shoot' }),
  ];

  it('keeps ceremony albums or the couple’s own, and searches by name', () => {
    expect(filterAlbums(albums, 'all', '').map((a) => a.id)).toEqual(['1', '2', '3']);
    expect(filterAlbums(albums, 'event', '').map((a) => a.id)).toEqual(['1']);
    expect(filterAlbums(albums, 'own', '').map((a) => a.id)).toEqual(['2', '3']);
    expect(filterAlbums(albums, 'all', '  WEDDING ').map((a) => a.id)).toEqual(['3']);
  });

  it('reads an unknown filter as all', () => {
    expect(readAlbumFilter('event')).toBe('event');
    expect(readAlbumFilter('vip')).toBe('all');
    expect(readAlbumFilter(undefined)).toBe('all');
  });
});
