'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icon } from '@/components/ui/icon';
import type { Photo } from '@/lib/photos/albums';
import { formatBytes } from '@/lib/photos/format';
import { moveMany, movePhoto, timeAgo, type PhotoMove } from '@/lib/photos/moderation';
import { addedBy, PhotoViewer } from './photo-viewer';

const ALL = 'all';

/**
 * The moderation desk (Stitch "Photos & Albums Workspace", moderation
 * queue): every photo waiting for review, filtered by album, approved or
 * rejected one at a time, selected, or all at once. Approved photos may
 * appear on the published website; rejected ones are removed, and the
 * uploader is not told.
 */
export function ReviewQueue({
  weddingId,
  photos,
  total,
  albumTitles,
  initialAlbum,
  writable,
}: {
  weddingId: string;
  photos: readonly Photo[];
  total: number;
  /** Album names by ID, in the Albums page's order. */
  albumTitles: readonly (readonly [string, string])[];
  initialAlbum?: string;
  writable: boolean;
}) {
  const router = useRouter();
  const [album, setAlbum] = useState(initialAlbum ?? ALL);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  const titles = new Map(albumTitles);
  const shown = photos.filter((photo) => album === ALL || photo.albumId === album);
  const counts = new Map<string, number>();
  for (const photo of photos) counts.set(photo.albumId, (counts.get(photo.albumId) ?? 0) + 1);
  const chips = albumTitles.filter(([id]) => counts.has(id));
  const guests = new Set(
    photos.flatMap((photo) => (photo.uploaderName ? [photo.uploaderName] : [])),
  ).size;
  const chosen = shown.filter((photo) => selected.has(photo.id));
  const allChosen = shown.length > 0 && chosen.length === shown.length;

  async function run(work: () => Promise<string | null>) {
    setBusy(true);
    setProblem(null);
    const failure = await work();
    setBusy(false);
    if (failure) setProblem(failure);
    else {
      setSelected(new Set());
      router.refresh();
    }
  }

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (photos.length === 0) {
    return (
      <section className="flex flex-col items-center rounded-2xl bg-surface-container-lowest px-6 py-14 text-center shadow-xs">
        <span className="mb-4 flex size-16 items-center justify-center rounded-full bg-primary-fixed text-primary">
          <Icon name="done-all" className="size-8" />
        </span>
        <h2 className="font-serif text-headline-sm text-on-surface">All caught up</h2>
        <p className="mt-2 max-w-md text-body-md text-on-surface-variant">
          No photos are waiting for review. New photos from guests will appear here.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="review-heading" className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 rounded-2xl bg-surface-container-lowest p-5 shadow-xs ring-1 ring-outline-variant/30 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-secondary-container px-3 py-1 text-label-md font-semibold text-on-secondary-container">
              {total} {total === 1 ? 'photo' : 'photos'} pending
            </span>
            <span className="text-body-sm text-on-surface-variant">
              {guests > 0 ? `from ${guests} named ${guests === 1 ? 'guest' : 'guests'} ` : ''}across{' '}
              {chips.length} {chips.length === 1 ? 'album' : 'albums'}
            </span>
          </p>
          <h2 id="review-heading" className="font-serif text-headline-sm text-on-surface">
            Guest contribution review
          </h2>
          <p className="max-w-2xl text-body-sm text-on-surface-variant">
            Approved photos can appear in your published website’s gallery. Rejected photos are
            removed without telling whoever uploaded them.
          </p>
        </div>
        {writable && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || chosen.length === 0}
              onClick={() =>
                run(() =>
                  moveMany(
                    weddingId,
                    chosen.map((photo) => photo.id),
                    'reject',
                  ),
                )
              }
              className="inline-flex min-h-10 items-center rounded-md bg-surface-container px-4 text-label-md font-semibold text-on-surface hover:bg-surface-container-high disabled:opacity-50"
            >
              Reject selected{chosen.length > 0 ? ` (${chosen.length})` : ''}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                run(() =>
                  moveMany(
                    weddingId,
                    (chosen.length > 0 ? chosen : shown).map((photo) => photo.id),
                    'approve',
                  ),
                )
              }
              className="inline-flex min-h-10 items-center gap-1.5 rounded-md bg-primary px-4 text-label-md font-semibold text-on-primary hover:bg-primary-container disabled:opacity-50"
            >
              <Icon name="verified" className="size-4.5" />
              {chosen.length > 0
                ? `Approve selected (${chosen.length})`
                : `Approve all (${shown.length})`}
            </button>
          </div>
        )}
      </div>

      {problem && (
        <p
          role="alert"
          className="rounded-xl bg-error-container/40 px-4 py-3 text-body-sm text-on-surface"
        >
          {problem}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {writable ? (
          <label className="flex min-h-8 items-center gap-2 text-label-md text-on-surface">
            <input
              type="checkbox"
              checked={allChosen}
              onChange={() =>
                setSelected(allChosen ? new Set() : new Set(shown.map((photo) => photo.id)))
              }
              className="size-4 accent-primary"
            />
            Select all ({shown.length} {shown.length === 1 ? 'photo' : 'photos'})
          </label>
        ) : (
          <span />
        )}
        <div
          role="group"
          aria-label="Filter by album"
          className="flex flex-wrap items-center gap-1.5"
        >
          <FilterChip active={album === ALL} onClick={() => setAlbum(ALL)}>
            All ({photos.length})
          </FilterChip>
          {chips.map(([id, title]) => (
            <FilterChip key={id} active={album === id} onClick={() => setAlbum(id)}>
              {title} ({counts.get(id)})
            </FilterChip>
          ))}
        </div>
      </div>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((photo, index) => (
          <li key={photo.id} className="min-w-0">
            <article className="flex h-full flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-xs ring-1 ring-outline-variant/30">
              <div className="relative aspect-4/3 bg-surface-container">
                <Image
                  src={photo.thumbUrl}
                  alt={`Photo added by ${addedBy(photo)} to ${titles.get(photo.albumId) ?? 'an album'}`}
                  fill
                  unoptimized
                  sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover"
                />
                {writable && (
                  <label className="absolute top-3 left-3 flex size-8 cursor-pointer items-center justify-center rounded-md bg-surface-container-lowest/90 shadow-sm">
                    <input
                      type="checkbox"
                      checked={selected.has(photo.id)}
                      onChange={() => toggle(photo.id)}
                      className="size-4 accent-primary"
                    />
                    <span className="sr-only">Select photo by {addedBy(photo)}</span>
                  </label>
                )}
                <span className="absolute bottom-3 left-3 rounded-full bg-surface-container-lowest/90 px-2.5 py-1 text-label-sm font-semibold text-on-surface">
                  {titles.get(photo.albumId) ?? 'Album'}
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(index)}
                  className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-full bg-surface-container-lowest/90 text-on-surface shadow-sm hover:bg-surface-container-lowest"
                >
                  <Icon
                    name="zoom-in"
                    className="size-5"
                    label={`View photo by ${addedBy(photo)} large`}
                  />
                </button>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div>
                  <p className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-title-sm text-on-surface">{addedBy(photo)}</span>
                    <span className="shrink-0 text-label-sm text-on-surface-variant">
                      {timeAgo(photo.createdAt)}
                    </span>
                  </p>
                  <p className="text-body-sm text-on-surface-variant">
                    {photo.source === 'link' ? 'Uploaded via QR link' : 'Added by your team'} ·{' '}
                    {formatBytes(photo.bytes)}
                  </p>
                </div>
                {writable && (
                  <div className="mt-auto grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => run(() => movePhoto(weddingId, photo.id, 'reject'))}
                      className="inline-flex min-h-9 items-center justify-center gap-1 rounded-md bg-surface-container px-3 text-label-md font-semibold text-on-surface hover:bg-surface-container-high disabled:opacity-60"
                    >
                      <Icon name="close" className="size-4" />
                      Reject<span className="sr-only"> photo by {addedBy(photo)}</span>
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => run(() => movePhoto(weddingId, photo.id, 'approve'))}
                      className="inline-flex min-h-9 items-center justify-center gap-1 rounded-md bg-primary px-3 text-label-md font-semibold text-on-primary hover:bg-primary-container disabled:opacity-60"
                    >
                      <Icon name="check" className="size-4" />
                      Approve<span className="sr-only"> photo by {addedBy(photo)}</span>
                    </button>
                  </div>
                )}
              </div>
            </article>
          </li>
        ))}
      </ul>

      <PhotoViewer
        photos={shown}
        index={open}
        onIndex={setOpen}
        onClose={() => setOpen(null)}
        onMove={(photo: Photo, move: PhotoMove) =>
          void run(() => movePhoto(weddingId, photo.id, move)).then(() => setOpen(null))
        }
        busy={busy}
        writable={writable}
        ownerSafety={false}
      />
    </section>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-h-8 items-center rounded-full px-3 text-label-md font-semibold transition-colors ${
        active
          ? 'bg-primary text-on-primary'
          : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
      }`}
    >
      {children}
    </button>
  );
}
