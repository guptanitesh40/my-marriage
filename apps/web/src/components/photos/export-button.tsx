'use client';

import type { components } from '@my-marriage/contracts';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';
import { api } from '@/lib/api/browser';
import { networkFailure, toFailure } from '@/lib/api/errors';
import { formatBytes } from '@/lib/photos/format';

type Export = components['schemas']['MediaExportDto'];

const POLL_MS = 2000;

/**
 * "Export All" and "Download All" (Stitch "Photos & Albums Workspace"):
 * a ZIP of the originals, in a folder per album, made in the background
 * (PRD PHOTO-06). Approved photos only, or every photo, including those
 * waiting for review. The ZIP is kept for seven days.
 */
export function ExportButton({
  weddingId,
  albumId,
  children,
}: {
  weddingId: string;
  albumId?: string;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [scope, setScope] = useState<'approved' | 'all'>('approved');
  const [job, setJob] = useState<Export | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const titleId = `export-${albumId ?? 'wedding'}-title`;

  // While the ZIP is being made, look again every few seconds.
  useEffect(() => {
    if (!job || (job.state !== 'queued' && job.state !== 'processing')) return;
    const timer = window.setTimeout(() => {
      void api
        .GET('/api/v1/weddings/{weddingId}/media-exports/{exportId}', {
          params: { path: { weddingId, exportId: job.id } },
        })
        .then(({ data }) => {
          if (data) setJob(data.data);
        });
    }, POLL_MS);
    return () => window.clearTimeout(timer);
  }, [job, weddingId]);

  async function start() {
    setStarting(true);
    setProblem(null);
    try {
      const { data, error, response } = await api.POST(
        '/api/v1/weddings/{weddingId}/media-exports',
        { params: { path: { weddingId } }, body: { scope, ...(albumId ? { albumId } : {}) } },
      );
      if (data) setJob(data.data);
      else setProblem(toFailure(response.status, error).message);
    } catch {
      setProblem(networkFailure().message);
    }
    setStarting(false);
  }

  const making = job && (job.state === 'queued' || job.state === 'processing');

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-surface-container-lowest px-4 py-2.5 text-label-md font-semibold text-on-surface shadow-xs ring-1 ring-outline-variant/60 transition-colors hover:bg-surface-container-low"
      >
        <Icon name="download" className="size-4.5" />
        {children}
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onClose={() => {
          if (!making) setJob(null);
          setProblem(null);
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-surface-container-lowest p-6 text-on-surface shadow-xl backdrop:bg-on-surface/40"
      >
        <div className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-label-sm font-semibold tracking-widest text-secondary uppercase">
                Download
              </p>
              <h2 id={titleId} className="mt-1 font-serif text-headline-sm">
                {albumId ? 'Download this album' : 'Export all photos'}
              </h2>
              <p className="mt-1 text-body-sm text-on-surface-variant">
                A ZIP of the original photos, with a folder for each album.
              </p>
            </div>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="-m-1.5 rounded-full p-1.5 text-on-surface-variant hover:bg-surface-container"
            >
              <Icon name="close" className="size-5" label="Close" />
            </button>
          </div>

          {!job ? (
            <>
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-label-md font-semibold">Which photos?</legend>
                {(
                  [
                    ['approved', 'Approved photos', 'Those you have approved'],
                    ['all', 'All photos', 'Including those waiting for review and hidden ones'],
                  ] as const
                ).map(([value, label, hint]) => (
                  <label
                    key={value}
                    className="flex cursor-pointer items-start gap-3 rounded-xl bg-surface-container-low p-3"
                  >
                    <input
                      type="radio"
                      name={`${titleId}-scope`}
                      checked={scope === value}
                      onChange={() => setScope(value)}
                      className="mt-1 size-4 accent-primary"
                    />
                    <span>
                      <span className="block text-title-sm">{label}</span>
                      <span className="text-body-sm text-on-surface-variant">{hint}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
              {problem && (
                <p role="alert" className="text-body-sm text-error">
                  {problem}
                </p>
              )}
              <button
                type="button"
                onClick={start}
                disabled={starting}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary text-label-md font-semibold text-on-primary disabled:opacity-60"
              >
                {starting ? 'Starting…' : 'Prepare ZIP'}
              </button>
            </>
          ) : job.state === 'ready' ? (
            <div className="flex flex-col gap-3 rounded-xl bg-primary-fixed/40 p-4" role="status">
              <p className="flex items-center gap-2 text-title-sm text-on-surface">
                <Icon name="check-circle" className="size-5 text-primary" />
                Ready: {job.photoCount ?? 0} {job.photoCount === 1 ? 'photo' : 'photos'}
                {job.bytes ? `, ${formatBytes(job.bytes)}` : ''}
              </p>
              {job.photoCount === 0 ? (
                <p className="text-body-sm text-on-surface-variant">
                  There were no photos to include.
                </p>
              ) : (
                <a
                  href={job.downloadUrl}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary text-label-md font-semibold text-on-primary"
                >
                  <Icon name="download" className="size-5" />
                  Download ZIP
                </a>
              )}
              <p className="text-body-sm text-on-surface-variant">Available for seven days.</p>
            </div>
          ) : job.state === 'failed' || job.state === 'expired' ? (
            <div className="flex flex-col gap-3">
              <p role="alert" className="text-body-md text-error">
                {job.state === 'failed'
                  ? 'The ZIP couldn’t be made. Please try again.'
                  : 'This ZIP has expired. Prepare a new one.'}
              </p>
              <button
                type="button"
                onClick={() => setJob(null)}
                className="inline-flex min-h-10 items-center justify-center rounded-md bg-surface-container text-label-md font-semibold"
              >
                Try again
              </button>
            </div>
          ) : (
            <p
              role="status"
              className="flex items-center gap-2 rounded-xl bg-surface-container-low p-4 text-body-md"
            >
              <Icon name="sync" className="size-5 animate-spin text-secondary" />
              Preparing your ZIP… You can close this and come back.
            </p>
          )}
        </div>
      </dialog>
    </>
  );
}
