'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api/browser';
import { networkFailure, toFailure } from '@/lib/api/errors';
import type { Album } from '@/lib/photos/albums';

/**
 * Opens or pauses guest uploads to one album (schema `isUploadEnabled`).
 * Pausing is the gentle way to stop uploads: links keep working once
 * reopened, whereas revoking a link ends it for good.
 */
export function AlbumUploadsSwitch({
  weddingId,
  album,
  writable,
}: {
  weddingId: string;
  album: Album;
  writable: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(album.isUploadEnabled);
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const labelId = `album-uploads-${album.id}`;

  async function toggle() {
    if (pending || !writable) return;
    const next = !open;
    setPending(true);
    setProblem(null);
    setOpen(next);
    try {
      const { data, error, response } = await api.PATCH(
        '/api/v1/weddings/{weddingId}/albums/{albumId}',
        {
          params: { path: { weddingId, albumId: album.id } },
          body: { isUploadEnabled: next },
        },
      );
      if (data) {
        setOpen(data.data.isUploadEnabled);
        router.refresh();
      } else {
        setOpen(!next);
        const failure = toFailure(response.status, error);
        setProblem(failure.message);
        if (failure.code === 'WEDDING_ARCHIVED') router.refresh();
      }
    } catch {
      setOpen(!next);
      setProblem(networkFailure().message);
    }
    setPending(false);
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-surface-container-low p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p id={labelId} className="text-title-sm text-on-surface">
            Guest uploads
          </p>
          <p className="text-body-sm text-on-surface-variant">
            {open
              ? 'Open: guests with this album’s upload link can add photos.'
              : 'Paused: this album’s upload links accept no photos until you reopen them.'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={open}
          aria-labelledby={labelId}
          disabled={!writable || pending}
          onClick={toggle}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container disabled:opacity-60 ${
            open ? 'bg-primary' : 'bg-outline-variant'
          }`}
        >
          <span
            aria-hidden="true"
            className={`inline-block size-5 rounded-full bg-surface-container-lowest shadow-sm transition-transform ${
              open ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
      {problem && (
        <p role="alert" className="text-body-sm text-error">
          {problem}
        </p>
      )}
    </div>
  );
}
