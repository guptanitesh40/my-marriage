'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { formatBytes } from '@/lib/photos/format';
import { PHOTO_BATCH, PHOTO_TYPES, photoProblem, uploadPhoto } from '@/lib/photos/upload';

/** Photos sent at the same time: quick on good connections, gentle on phones. */
const AT_ONCE = 3;

type Status = 'waiting' | 'uploading' | 'received' | 'failed';

interface Item {
  key: string;
  file: File;
  preview: string;
  status: Status;
  progress: number;
  error?: string;
  /** Whether trying again can help. */
  retry?: boolean;
}

/**
 * Adds photos to an album (Stitch "Guest Upload — Progress & Review",
 * used here for the couple): several at once, each with its own progress
 * and error, failed ones retried on their own. Received photos are checked
 * on the server and then appear in the album, already approved: the
 * couple's and managers' own photos need no review (decision 0019).
 */
export function PhotoUploader({ albumId, albumTitle }: { albumId: string; albumTitle: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const running = useRef(0);
  const queue = useRef<string[]>([]);
  /** The chosen files by item, kept outside state for the upload loop. */
  const fileByKey = useRef(new Map<string, File>());
  /** Previews are local copies of the files: let them go when the page does. */
  const previews = useRef(new Set<string>());
  useEffect(() => {
    const made = previews.current;
    return () => {
      for (const preview of made) URL.revokeObjectURL(preview);
    };
  }, []);

  function update(key: string, change: Partial<Item>) {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...change } : item)),
    );
  }

  function pump() {
    while (running.current < AT_ONCE && queue.current.length > 0) {
      const key = queue.current.shift();
      const file = key ? fileByKey.current.get(key) : undefined;
      if (!key || !file) continue;
      running.current += 1;
      update(key, { status: 'uploading', progress: 0, error: undefined });
      void uploadPhoto(albumId, file, (progress) => update(key, { progress })).then((outcome) => {
        running.current -= 1;
        if (outcome.ok) update(key, { status: 'received', progress: 1 });
        else update(key, { status: 'failed', error: outcome.message, retry: outcome.retry });
        if (running.current === 0 && queue.current.length === 0) router.refresh();
        pump();
      });
    }
  }

  function choose(files: FileList | null) {
    if (!files || files.length === 0) return;
    const chosen = [...files];
    const room = PHOTO_BATCH - items.filter((item) => item.status !== 'received').length;
    setNotice(
      chosen.length > room
        ? `You can add up to ${PHOTO_BATCH} photos at a time; the first ${Math.max(room, 0)} were added.`
        : null,
    );
    const added: Item[] = chosen.slice(0, Math.max(room, 0)).map((file) => {
      const problem = photoProblem(file);
      return {
        key: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
        file,
        preview: problem ? '' : URL.createObjectURL(file),
        status: problem ? 'failed' : 'waiting',
        progress: 0,
        ...(problem ? { error: problem, retry: false } : {}),
      };
    });
    for (const item of added) {
      fileByKey.current.set(item.key, item.file);
      if (item.preview) previews.current.add(item.preview);
    }
    setItems((current) => [...current, ...added]);
    queue.current.push(
      ...added.filter((item) => item.status === 'waiting').map((item) => item.key),
    );
    pump();
  }

  function retry(keys: readonly string[]) {
    for (const key of keys) update(key, { status: 'waiting', error: undefined, progress: 0 });
    queue.current.push(...keys);
    pump();
  }

  function remove(key: string) {
    const item = items.find((candidate) => candidate.key === key);
    if (item?.preview) URL.revokeObjectURL(item.preview);
    setItems((current) => current.filter((candidate) => candidate.key !== key));
  }

  function clear() {
    for (const item of items) if (item.preview) URL.revokeObjectURL(item.preview);
    setItems([]);
    setNotice(null);
  }

  const received = items.filter((item) => item.status === 'received').length;
  const failed = items.filter((item) => item.status === 'failed');
  const retryable = failed.filter((item) => item.retry).map((item) => item.key);
  const busy = items.some((item) => item.status === 'waiting' || item.status === 'uploading');
  const totalBytes = items.reduce((sum, item) => sum + item.file.size, 0);
  const sentBytes = items.reduce(
    (sum, item) =>
      sum +
      (item.status === 'failed'
        ? 0
        : item.file.size * (item.status === 'received' ? 1 : item.progress)),
    0,
  );
  const percent = totalBytes > 0 ? Math.round((sentBytes / totalBytes) * 100) : 0;

  return (
    <section aria-labelledby="add-photos-heading" className="flex flex-col gap-4">
      <input
        ref={input}
        type="file"
        multiple
        accept={PHOTO_TYPES.join(',')}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          choose(event.target.files);
          event.target.value = '';
        }}
      />
      {items.length === 0 ? (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="group flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-outline-variant bg-surface-container-low/70 px-6 py-8 text-center transition-colors hover:border-primary-container hover:bg-surface-container"
        >
          <span className="flex size-14 items-center justify-center rounded-full bg-surface-container-lowest text-primary shadow-sm transition-transform group-hover:scale-105">
            <Icon name="add" className="size-7" />
          </span>
          <span id="add-photos-heading" className="text-title-md font-semibold text-primary">
            Add photos to {albumTitle}
          </span>
          <span className="max-w-sm text-body-sm text-on-surface-variant">
            Choose up to {PHOTO_BATCH} photos at a time. Originals are kept for downloads.
          </span>
          <span className="mt-1 flex flex-wrap justify-center gap-2">
            <span className="rounded-full bg-surface-container-highest px-2.5 py-1 text-label-sm text-on-surface-variant">
              JPG, PNG, WebP
            </span>
            <span className="rounded-full bg-surface-container-highest px-2.5 py-1 text-label-sm text-on-surface-variant">
              Up to 25 MB each
            </span>
          </span>
        </button>
      ) : (
        <div className="flex flex-col gap-3 rounded-2xl bg-surface-container-lowest p-4 shadow-xs ring-1 ring-outline-variant/30 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2
              id="add-photos-heading"
              className="flex items-center gap-2 text-title-sm text-on-surface"
            >
              {items.length} {items.length === 1 ? 'photo' : 'photos'} selected
              <span aria-hidden="true" className="size-1.5 rounded-full bg-secondary" />
              <span className="text-body-sm font-normal text-on-surface-variant">
                {formatBytes(totalBytes)} total
              </span>
            </h2>
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="inline-flex min-h-8 items-center gap-1 rounded-lg bg-surface-container-low px-3 text-label-md font-semibold text-primary hover:bg-surface-container"
            >
              <Icon name="add" className="size-4" />
              Add more
            </button>
          </div>

          <div className="flex flex-col gap-2 rounded-xl bg-surface-container-low p-3">
            <div className="flex items-center justify-between text-label-md font-semibold text-primary">
              <span id="upload-progress-label">
                {received} of {items.length} {items.length === 1 ? 'photo' : 'photos'} received
              </span>
              <span>{percent}%</span>
            </div>
            <div
              role="progressbar"
              aria-labelledby="upload-progress-label"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              className="h-2 overflow-hidden rounded-full bg-surface-container-high"
            >
              <span
                className="block h-full rounded-full bg-primary transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="flex items-center gap-1 text-label-sm text-on-surface-variant">
              <Icon name="info" className="size-3.5 text-secondary" />
              {busy
                ? 'Please keep this page open until the upload completes.'
                : 'Received photos are being prepared and will appear below, approved.'}
            </p>
          </div>

          {notice && <p className="text-body-sm text-on-surface-variant">{notice}</p>}

          <ul className="flex flex-col gap-2" aria-label="Photos being uploaded">
            {items.map((item) => (
              <UploadRow
                key={item.key}
                item={item}
                onRetry={() => retry([item.key])}
                onRemove={() => remove(item.key)}
              />
            ))}
          </ul>

          <div className="flex flex-wrap justify-end gap-2">
            {retryable.length > 0 && !busy && (
              <button
                type="button"
                onClick={() => retry(retryable)}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-surface-container-high px-4 text-label-md font-semibold text-primary hover:bg-surface-container-highest"
              >
                <Icon name="sync" className="size-4" />
                Retry {retryable.length} failed {retryable.length === 1 ? 'photo' : 'photos'}
              </button>
            )}
            {!busy && (
              <button
                type="button"
                onClick={clear}
                className="inline-flex min-h-10 items-center rounded-lg bg-primary px-5 text-label-md font-semibold text-on-primary hover:bg-primary-container"
              >
                Done
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function UploadRow({
  item,
  onRetry,
  onRemove,
}: {
  item: Item;
  onRetry: () => void;
  onRemove: () => void;
}) {
  return (
    <li className="flex flex-col gap-2 rounded-xl bg-surface-container-lowest p-3 ring-1 ring-outline-variant/30">
      <div className="flex items-center gap-3">
        <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-surface-container">
          {item.preview ? (
            <Image
              src={item.preview}
              alt=""
              fill
              unoptimized
              sizes="56px"
              className="object-cover"
            />
          ) : (
            <span className="flex size-full items-center justify-center text-error">
              <Icon name="error" className="size-6" />
            </span>
          )}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-title-sm text-on-surface">{item.file.name}</span>
            <span className="shrink-0 text-label-sm text-on-surface-variant">
              {formatBytes(item.file.size)}
            </span>
          </div>
          <Status item={item} />
        </div>
      </div>
      {item.status === 'failed' && (
        <div className="flex flex-col gap-2 rounded-lg bg-error-container/30 p-2.5 sm:flex-row sm:items-center sm:justify-between">
          <p role="alert" className="flex items-start gap-2 text-body-sm text-on-surface">
            <Icon name="warning" className="mt-0.5 size-4 shrink-0 text-error" />
            {item.error}
          </p>
          <div className="flex shrink-0 justify-end gap-2">
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex min-h-8 items-center gap-1 rounded-lg px-3 text-label-md text-on-surface-variant hover:bg-surface-container-high"
            >
              <Icon name="close" className="size-4" />
              Remove<span className="sr-only"> {item.file.name}</span>
            </button>
            {item.retry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex min-h-8 items-center gap-1 rounded-lg bg-surface-container px-3 text-label-md font-semibold text-primary hover:bg-surface-container-high"
              >
                <Icon name="sync" className="size-4" />
                Retry<span className="sr-only"> {item.file.name}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

function Status({ item }: { item: Item }) {
  if (item.status === 'uploading') {
    const percent = Math.round(item.progress * 100);
    return (
      <div className="flex flex-col gap-1">
        <span className="flex items-center gap-1.5 text-label-sm font-semibold text-primary">
          <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-primary" />
          Uploading {percent}%
        </span>
        <span
          aria-hidden="true"
          className="h-1.5 overflow-hidden rounded-full bg-surface-container"
        >
          <span className="block h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
        </span>
      </div>
    );
  }
  const chip = {
    waiting: {
      icon: 'schedule',
      text: 'Queued',
      className: 'bg-surface-container text-on-surface-variant',
    },
    received: {
      icon: 'hourglass-top',
      text: 'Received',
      className: 'bg-secondary-fixed/50 text-on-secondary-fixed-variant',
    },
    failed: {
      icon: 'error',
      text: 'Not uploaded',
      className: 'bg-error-container text-on-error-container',
    },
  } as const;
  const { icon, text, className } = chip[item.status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 self-start rounded-full px-2 py-0.5 text-label-sm font-semibold ${className}`}
    >
      <Icon name={icon} className="size-3.5" />
      {text}
    </span>
  );
}
