'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { Icon } from '@/components/ui/icon';
import type { Photo } from '@/lib/photos/albums';
import { formatBytes } from '@/lib/photos/format';
import { timeAgo, type PhotoMove } from '@/lib/photos/moderation';

const ACTIONS: Record<
  string,
  { move: PhotoMove; label: string; tone: 'primary' | 'plain' | 'danger' }[]
> = {
  pending: [
    { move: 'reject', label: 'Reject', tone: 'plain' },
    { move: 'approve', label: 'Approve', tone: 'primary' },
  ],
  approved: [
    { move: 'hide', label: 'Hide from website', tone: 'plain' },
    { move: 'remove', label: 'Delete', tone: 'danger' },
  ],
  hidden: [
    { move: 'restore', label: 'Show on website', tone: 'primary' },
    { move: 'remove', label: 'Delete', tone: 'danger' },
  ],
};

/** Who added a photo, as the couple sees it. */
export function addedBy(photo: Photo): string {
  return (
    photo.uploaderName ??
    photo.uploadedByName ??
    (photo.source === 'link' ? 'A guest' : 'Your team')
  );
}

/**
 * A photo, large (Stitch moderation "zoom"), with what can be done to it
 * now: approve or reject while pending; hide, show again or delete once
 * reviewed. Arrow keys move to the previous or next photo; Escape closes.
 */
export function PhotoViewer({
  photos,
  index,
  onIndex,
  onClose,
  onMove,
  busy,
  writable,
  ownerSafety,
}: {
  photos: readonly Photo[];
  index: number | null;
  onIndex: (index: number) => void;
  onClose: () => void;
  onMove: (photo: Photo, move: PhotoMove) => void;
  busy: boolean;
  /** Changes are allowed (an active wedding). */
  writable: boolean;
  /** An archived wedding's owner may still hide and delete. */
  ownerSafety: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const photo = index === null ? undefined : photos[index];

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (photo && !element.open) element.showModal();
    if (!photo && element.open) element.close();
  }, [photo]);

  const actions = (photo ? (ACTIONS[photo.moderation] ?? []) : []).filter(
    (action) => writable || (ownerSafety && (action.move === 'hide' || action.move === 'remove')),
  );

  return (
    <dialog
      ref={dialog}
      aria-label={photo ? `Photo added by ${addedBy(photo)}` : 'Photo'}
      onClose={onClose}
      onKeyDown={(event) => {
        if (index === null) return;
        if (event.key === 'ArrowRight' && index < photos.length - 1) onIndex(index + 1);
        if (event.key === 'ArrowLeft' && index > 0) onIndex(index - 1);
      }}
      className="m-auto h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-5xl overflow-hidden rounded-2xl bg-inverse-surface p-0 text-inverse-on-surface shadow-xl backdrop:bg-black/70"
    >
      {photo && (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <p className="min-w-0 truncate text-label-md">
              {index !== null && `${index + 1} of ${photos.length} · `}
              {addedBy(photo)} · {timeAgo(photo.createdAt)}
            </p>
            <button
              type="button"
              autoFocus
              onClick={() => dialog.current?.close()}
              className="rounded-full p-2 hover:bg-white/10"
            >
              <Icon name="close" className="size-5" label="Close" />
            </button>
          </div>
          <div className="relative min-h-0 flex-1">
            <Image
              src={photo.displayUrl}
              alt={`Photo added by ${addedBy(photo)}`}
              fill
              unoptimized
              sizes="100vw"
              className="object-contain"
            />
            {index !== null && index > 0 && (
              <button
                type="button"
                onClick={() => onIndex(index - 1)}
                className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-black/50 p-2 hover:bg-black/70"
              >
                <Icon name="arrow-back" className="size-5" label="Previous photo" />
              </button>
            )}
            {index !== null && index < photos.length - 1 && (
              <button
                type="button"
                onClick={() => onIndex(index + 1)}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black/50 p-2 hover:bg-black/70"
              >
                <Icon name="arrow-forward" className="size-5" label="Next photo" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <p className="text-body-sm text-inverse-on-surface/80">
              {photo.originalName} · {photo.width}×{photo.height} · {formatBytes(photo.bytes)}
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href={photo.displayUrl.replace(/\/image\/display$/, '/original')}
                download
                className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-white/10 px-4 text-label-md font-semibold text-inverse-on-surface hover:bg-white/20"
              >
                <Icon name="download" className="size-4" />
                Download original
              </a>
              {actions.map((action) => (
                <button
                  key={action.move}
                  type="button"
                  disabled={busy}
                  onClick={() => onMove(photo, action.move)}
                  className={`inline-flex min-h-9 items-center rounded-md px-4 text-label-md font-semibold disabled:opacity-60 ${
                    action.tone === 'primary'
                      ? 'bg-primary-fixed text-on-primary-fixed'
                      : action.tone === 'danger'
                        ? 'bg-error text-on-error'
                        : 'bg-white/10 text-inverse-on-surface hover:bg-white/20'
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
