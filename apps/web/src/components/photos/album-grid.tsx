'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { dayNumbers } from '@/lib/events/format';
import type { Album, UploadLink } from '@/lib/photos/albums';
import { albumKindLabel, albumWhere, filterAlbums, type AlbumFilter } from '@/lib/photos/format';
import { albumPath, photosPath } from '@/lib/routes';
import { ShareUploadsButton } from './share-upload-dialog';

const PILL =
  'inline-flex min-h-9 items-center rounded-full px-4 text-label-md font-semibold whitespace-nowrap transition-colors';

/**
 * The albums (Stitch "Photos & Albums Workspace", albums overview): kind
 * pills and a search, then a card per album. A wedding's albums are all
 * loaded, so this filters in the browser; the pill is kept in the address.
 */
export function AlbumGrid({
  weddingId,
  albums,
  links,
  writable,
  initialFilter,
}: {
  weddingId: string;
  albums: readonly Album[];
  /** Each album's current upload link, by album ID. */
  links: Readonly<Record<string, UploadLink>>;
  writable: boolean;
  initialFilter: AlbumFilter;
}) {
  const [filter, setFilter] = useState(initialFilter);
  const [search, setSearch] = useState('');
  const shown = filterAlbums(albums, filter, search);
  const days = dayNumbers(
    albums.map((album) => ({ id: album.id, startDate: album.event?.startDate })),
  );
  const counts: Record<AlbumFilter, number> = {
    all: albums.length,
    event: filterAlbums(albums, 'event', '').length,
    own: filterAlbums(albums, 'own', '').length,
  };
  const labels: Record<AlbumFilter, string> = {
    all: 'All albums',
    event: 'Ceremony albums',
    own: 'General & your own',
  };

  function choose(next: AlbumFilter) {
    setFilter(next);
    const query = next === 'all' ? undefined : new URLSearchParams({ show: next });
    window.history.replaceState(null, '', photosPath(weddingId, query));
  }

  return (
    <section aria-labelledby="albums-heading" className="flex flex-col gap-5">
      <h2 id="albums-heading" className="sr-only">
        Albums
      </h2>
      <div className="flex flex-col gap-3 rounded-2xl bg-surface-container-lowest p-3 shadow-xs lg:flex-row lg:items-center lg:justify-between">
        <div role="group" aria-label="Show" className="flex gap-1.5 overflow-x-auto">
          {(['all', 'event', 'own'] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={filter === option}
              onClick={() => choose(option)}
              className={`${PILL} ${
                filter === option
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              {labels[option]} ({counts[option]})
            </button>
          ))}
        </div>
        <label className="relative block lg:w-72">
          <span className="sr-only">Search albums</span>
          <Icon
            name="search"
            className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-on-surface-variant"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search albums…"
            className="w-full rounded-lg bg-surface-container-low py-2 pr-3 pl-10 text-body-md text-on-surface placeholder:text-on-surface-variant/80 focus-visible:outline-2 focus-visible:outline-primary-container"
          />
        </label>
      </div>

      {shown.length === 0 ? (
        <p
          role="status"
          className="rounded-2xl bg-surface-container-lowest p-8 text-center text-body-md text-on-surface-variant shadow-xs"
        >
          No albums match. Try another name or show all albums.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((album) => (
            <li key={album.id} className="min-w-0">
              <AlbumCard
                weddingId={weddingId}
                album={album}
                day={days.get(album.id)}
                link={links[album.id]}
                writable={writable}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AlbumCard({
  weddingId,
  album,
  day,
  link,
  writable,
}: {
  weddingId: string;
  album: Album;
  day: number | undefined;
  link: UploadLink | undefined;
  writable: boolean;
}) {
  const where = albumWhere(album);
  const overline =
    album.kind === 'event'
      ? day
        ? `Day ${day} · Ceremony`
        : 'Ceremony'
      : album.kind === 'general'
        ? 'Whole wedding'
        : 'Your album';
  const status = album.event?.cancelled
    ? 'Cancelled'
    : !album.isUploadEnabled
      ? 'Uploads paused'
      : album.counts.pending > 0
        ? `${album.counts.pending} pending`
        : album.counts.total > 0
          ? 'All cleared'
          : undefined;
  const cover = album.coverUrl;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-xs ring-1 ring-outline-variant/30 transition-shadow hover:shadow-md">
      <div
        className={`relative flex h-48 flex-col justify-end p-4 ${
          cover
            ? 'bg-surface-container-high'
            : 'bg-linear-to-br from-surface-container to-surface-container-high'
        }`}
      >
        {cover ? (
          <>
            <Image
              src={cover}
              alt=""
              fill
              unoptimized
              sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
            <span
              aria-hidden="true"
              className="absolute inset-0 bg-linear-to-t from-black/70 via-black/15 to-transparent"
            />
          </>
        ) : (
          <span
            aria-hidden="true"
            className="absolute top-1/2 left-1/2 flex size-14 -translate-x-1/2 -translate-y-[70%] items-center justify-center rounded-full bg-surface-container-lowest/80 text-secondary"
          >
            <Icon
              name={album.kind === 'event' ? 'event-upcoming' : 'photo-library'}
              className="size-7"
            />
          </span>
        )}
        <span className="absolute top-3 left-3 rounded-full bg-surface-container-lowest/90 px-2.5 py-1 text-label-sm font-semibold text-on-surface">
          {overline}
        </span>
        {status && (
          <span
            className={`absolute top-3 right-3 rounded-full px-2.5 py-1 text-label-sm font-semibold ${
              status === 'All cleared'
                ? 'bg-primary text-on-primary'
                : 'bg-secondary-container text-on-secondary-container'
            }`}
          >
            {status}
          </span>
        )}
        <p
          className={`relative truncate text-label-sm tracking-wider uppercase ${
            cover ? 'text-white/85' : 'text-on-surface-variant'
          }`}
        >
          {where ?? albumKindLabel(album)}
        </p>
        <h3
          className={`relative font-serif text-headline-sm wrap-break-word ${
            cover ? 'text-white' : 'text-on-surface'
          }`}
        >
          {album.title}
        </h3>
      </div>
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-outline-variant/30 bg-surface-container-low/60 px-4 py-3">
        {album.counts.total === 0 ? (
          <span className="flex items-center gap-1.5 text-body-sm text-on-surface-variant">
            <Icon name="image" className="size-4.5 text-secondary" />
            No photos yet
          </span>
        ) : (
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm">
            <span className="flex items-center gap-1 font-semibold text-on-surface">
              <Icon name="check-circle" className="size-4.5 text-primary" />
              {album.counts.approved} approved
            </span>
            {album.counts.pending > 0 && (
              <span className="flex items-center gap-1 text-on-surface-variant">
                <Icon name="hourglass-top" className="size-4.5 text-secondary" />
                {album.counts.pending} pending review
              </span>
            )}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-4">
        <div className="flex flex-wrap gap-2">
          <ShareUploadsButton
            weddingId={weddingId}
            target={{ kind: 'album', albumId: album.id, albumTitle: album.title }}
            writable={writable}
            variant="quiet"
            {...(link ? { link } : {})}
          >
            QR & link<span className="sr-only"> for {album.title}</span>
          </ShareUploadsButton>
          {album.counts.pending > 0 && (
            <Link
              href={photosPath(weddingId, new URLSearchParams({ view: 'review', album: album.id }))}
              className="inline-flex min-h-8 items-center gap-1 rounded-md bg-secondary-container/60 px-3 text-label-md font-semibold text-on-secondary-container hover:bg-secondary-container"
            >
              Review ({album.counts.pending})<span className="sr-only"> in {album.title}</span>
              <Icon name="arrow-forward" className="size-4" />
            </Link>
          )}
        </div>
        <Link
          href={albumPath(weddingId, album.id)}
          className="inline-flex min-h-8 items-center gap-1 rounded-md px-2 text-label-md font-semibold text-primary transition-colors hover:bg-primary/5"
        >
          View album<span className="sr-only">: {album.title}</span>
          <Icon name="arrow-forward" className="size-4" />
        </Link>
      </div>
    </article>
  );
}
