'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import type { Photo } from '@/lib/photos/albums';
import { moveMany, movePhoto, type PhotoMove } from '@/lib/photos/moderation';
import { addedBy, PhotoViewer } from './photo-viewer';

const STATE = {
  pending: {
    text: 'Pending review',
    className: 'bg-secondary-container text-on-secondary-container',
  },
  approved: { text: 'Approved', className: 'bg-primary-fixed text-on-primary-fixed-variant' },
  hidden: { text: 'Hidden', className: 'bg-surface-container-highest text-on-surface-variant' },
} as const;

function count(n: number): string {
  return `${n} ${n === 1 ? 'photo' : 'photos'}`;
}

/**
 * An album's photos (Stitch "Photos & Albums Workspace", album detail
 * grid): the small copies with their review state and who added them.
 * Opening one shows it large, with what can be done to it now. Several,
 * or all, can be selected and deleted together.
 */
export function PhotoGrid({
  weddingId,
  photos,
  writable,
  ownerSafety,
}: {
  weddingId: string;
  photos: readonly Photo[];
  writable: boolean;
  ownerSafety: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const confirm = useRef<HTMLDialogElement>(null);
  // Deleting is allowed while the wedding is active, and to owners once archived.
  const canDelete = writable || ownerSafety;
  // Only photos still shown count: deleted ones drop out after a refresh.
  const chosen = photos.filter((photo) => selected.has(photo.id));
  const allChosen = photos.length > 0 && chosen.length === photos.length;

  async function move(photo: Photo, change: PhotoMove) {
    setBusy(true);
    setProblem(null);
    const failure = await movePhoto(weddingId, photo.id, change);
    setBusy(false);
    if (failure) {
      setProblem(failure);
      return;
    }
    if (change === 'remove' || change === 'reject') setOpen(null);
    router.refresh();
  }

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function removeChosen() {
    setBusy(true);
    setProblem(null);
    const failure = await moveMany(
      weddingId,
      chosen.map((photo) => photo.id),
      'remove',
    );
    setBusy(false);
    confirm.current?.close();
    if (failure) {
      setProblem(failure);
      return;
    }
    setSelected(new Set());
    router.refresh();
  }

  return (
    <>
      {canDelete && photos.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-container-low px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <label className="flex min-h-9 cursor-pointer items-center gap-2 text-label-md text-on-surface">
              <input
                type="checkbox"
                checked={allChosen}
                onChange={() =>
                  setSelected(allChosen ? new Set() : new Set(photos.map((photo) => photo.id)))
                }
                className="size-4 accent-primary"
              />
              Select all ({photos.length})
            </label>
            {chosen.length > 0 && (
              <span className="flex items-center gap-3 text-label-md text-on-surface-variant">
                <span aria-live="polite">{count(chosen.length)} selected</span>
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  className="font-semibold text-primary hover:underline"
                >
                  Clear
                </button>
              </span>
            )}
          </div>
          <button
            type="button"
            disabled={busy || chosen.length === 0}
            onClick={() => confirm.current?.showModal()}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-md bg-error px-4 text-label-md font-semibold text-on-error hover:opacity-90 disabled:opacity-40"
          >
            <Icon name="delete" className="size-4.5" />
            Delete selected{chosen.length > 0 ? ` (${chosen.length})` : ''}
          </button>
        </div>
      )}

      {problem && (
        <p
          role="alert"
          className="rounded-xl bg-error-container/40 px-4 py-3 text-body-sm text-on-surface"
        >
          {problem}
        </p>
      )}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo, index) => {
          const state = STATE[photo.moderation as keyof typeof STATE] ?? STATE.pending;
          const isChosen = selected.has(photo.id);
          return (
            <li key={photo.id} className="min-w-0">
              <figure
                className={`group relative aspect-square overflow-hidden rounded-xl bg-surface-container shadow-xs ${isChosen ? 'ring-3 ring-primary' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => setOpen(index)}
                  className="absolute inset-0 focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-primary-container"
                >
                  <Image
                    src={photo.thumbUrl}
                    alt={`Photo ${index + 1}, added by ${addedBy(photo)}, ${state.text.toLowerCase()}`}
                    fill
                    unoptimized
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                    className="object-cover transition-transform group-hover:scale-[1.02]"
                  />
                </button>
                <span
                  className={`pointer-events-none absolute top-2 left-2 rounded-full px-2 py-0.5 text-label-sm font-semibold ${state.className}`}
                >
                  {state.text}
                </span>
                {canDelete && (
                  <label className="absolute top-2 right-2 flex size-8 cursor-pointer items-center justify-center rounded-md bg-surface-container-lowest/90 shadow-sm">
                    <input
                      type="checkbox"
                      checked={isChosen}
                      onChange={() => toggle(photo.id)}
                      className="size-4 accent-primary"
                    />
                    <span className="sr-only">Select photo {index + 1}</span>
                  </label>
                )}
                <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-1 bg-linear-to-t from-black/60 to-transparent px-2.5 pt-6 pb-2 text-label-sm text-white">
                  <Icon name="account-circle" className="size-3.5 shrink-0" />
                  <span className="truncate">{addedBy(photo)}</span>
                </figcaption>
              </figure>
            </li>
          );
        })}
      </ul>
      <PhotoViewer
        photos={photos}
        index={open}
        onIndex={setOpen}
        onClose={() => setOpen(null)}
        onMove={move}
        busy={busy}
        writable={writable}
        ownerSafety={ownerSafety}
      />

      <dialog
        ref={confirm}
        aria-labelledby="delete-photos-title"
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-surface-container-lowest p-6 text-on-surface shadow-xl backdrop:bg-on-surface/40"
      >
        <div className="flex flex-col gap-4">
          <h2 id="delete-photos-title" className="font-serif text-headline-sm">
            Delete {count(chosen.length)}?
          </h2>
          <p className="text-body-md text-on-surface-variant">
            They are removed for good: from this album, your website’s gallery and downloads. This
            can’t be undone.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => confirm.current?.close()}
              className="inline-flex min-h-10 items-center rounded-md bg-surface-container px-4 text-label-md font-semibold hover:bg-surface-container-high"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={removeChosen}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-md bg-error px-4 text-label-md font-semibold text-on-error disabled:opacity-60"
            >
              <Icon name="delete" className="size-4.5" />
              {busy ? 'Deleting…' : `Delete ${count(chosen.length)}`}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
