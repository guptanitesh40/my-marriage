'use client';

import type { components } from '@my-marriage/contracts';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { LogoMark } from '@/components/ui/logo-mark';
import { api } from '@/lib/api/browser';
import { formatBytes } from '@/lib/photos/format';
import { PHOTO_BATCH, PHOTO_TYPES, photoProblem, uploadPhoto } from '@/lib/photos/upload';

type View = components['schemas']['GuestUploadDto'];
type GuestAlbum = components['schemas']['GuestAlbumDto'];

type Page =
  | { kind: 'opening' }
  | { kind: 'unavailable'; reason: 'revoked' | 'no-link' | 'offline' }
  | { kind: 'ready'; view: View };

type Status = 'ready' | 'uploading' | 'received' | 'failed';

interface Item {
  key: string;
  file: File;
  preview: string;
  status: Status;
  progress: number;
  error?: string;
  retry?: boolean;
}

/** Photos sent at the same time from a phone. */
const AT_ONCE = 2;

const NAME_MAX = 60;

/** "12 Feb 2027 · Royal Courtyard". */
function albumWhere(album: GuestAlbum): string | undefined {
  const parts = [
    album.startDate
      ? new Date(`${album.startDate}T00:00:00Z`).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          timeZone: 'UTC',
        })
      : undefined,
    album.venueName,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

/** Exchanges the link in the address, or picks up the session it set. */
async function openLink(): Promise<Page> {
  const match = /^#t=([A-Za-z0-9_-]{20,100})$/.exec(window.location.hash);
  if (match?.[1]) window.history.replaceState(null, '', '/u');
  try {
    const result = match?.[1]
      ? await api.POST('/api/v1/upload-access/exchange', { body: { token: match[1] } })
      : await api.GET('/api/v1/upload-access/current');
    if (result.data) return { kind: 'ready', view: result.data.data };
    return { kind: 'unavailable', reason: result.response.status === 410 ? 'revoked' : 'no-link' };
  } catch {
    return { kind: 'unavailable', reason: 'offline' };
  }
}

/**
 * A guest adding photos through a QR code or link (Stitch "Guest Photo
 * Upload — Event-Specific" and "Guest Upload — Progress & Review"): no
 * account, no app. The link's secret sits after `#t=`, which browsers never
 * send; it is removed from the address at once and exchanged for an upload
 * session. Photos go to the couple's private review.
 */
export function GuestUpload() {
  const [page, setPage] = useState<Page>({ kind: 'opening' });
  const [albumId, setAlbumId] = useState<string>('');
  const [name, setName] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [phase, setPhase] = useState<'choose' | 'sending' | 'done'>('choose');
  const input = useRef<HTMLInputElement>(null);
  const files = useRef(new Map<string, File>());
  const previews = useRef(new Set<string>());

  // Opened once: the address loses its secret as soon as it is read, so a
  // second run of this effect (React's development check) must reuse the
  // same request rather than find no link and ask for a session too early.
  const opening = useRef<Promise<Page> | null>(null);

  useEffect(() => {
    const made = previews.current;
    let current = true;
    opening.current ??= openLink();
    void opening.current.then((opened) => {
      if (!current) return;
      setPage(opened);
      if (opened.kind === 'ready') {
        setAlbumId(opened.view.album?.id ?? opened.view.albums[0]?.id ?? '');
      }
    });
    return () => {
      current = false;
      for (const preview of made) URL.revokeObjectURL(preview);
    };
  }, []);

  function update(key: string, change: Partial<Item>) {
    setItems((list) => list.map((item) => (item.key === key ? { ...item, ...change } : item)));
  }

  function choose(chosen: FileList | null) {
    if (!chosen || chosen.length === 0) return;
    const room = PHOTO_BATCH - items.length;
    const added = [...chosen].slice(0, Math.max(room, 0)).map((file): Item => {
      const problem = photoProblem(file);
      const preview = problem ? '' : URL.createObjectURL(file);
      if (preview) previews.current.add(preview);
      const key = `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`;
      files.current.set(key, file);
      return {
        key,
        file,
        preview,
        status: problem ? 'failed' : 'ready',
        progress: 0,
        ...(problem ? { error: problem, retry: false } : {}),
      };
    });
    setItems((list) => [...list, ...added]);
    setPhase('choose');
  }

  function remove(key: string) {
    setItems((list) => list.filter((item) => item.key !== key));
  }

  async function send(keys: readonly string[]) {
    if (keys.length === 0 || !albumId) return;
    setPhase('sending');
    const queue = [...keys];
    const worker = async () => {
      for (let key = queue.shift(); key; key = queue.shift()) {
        const file = files.current.get(key);
        if (!file) continue;
        update(key, { status: 'uploading', progress: 0, error: undefined });
        const outcome = await uploadPhoto(albumId, file, (progress) => update(key, { progress }), {
          guest: true,
          ...(name.trim() ? { uploaderName: name.trim() } : {}),
        });
        if (outcome.ok) update(key, { status: 'received', progress: 1 });
        else update(key, { status: 'failed', error: outcome.message, retry: outcome.retry });
      }
    };
    await Promise.all(Array.from({ length: AT_ONCE }, worker));
    setPhase('done');
  }

  function startOver() {
    setItems([]);
    setPhase('choose');
  }

  if (page.kind === 'opening') {
    return (
      <Shell>
        <p role="status" className="py-16 text-center text-body-md text-on-surface-variant">
          Opening your upload link…
        </p>
      </Shell>
    );
  }
  if (page.kind === 'unavailable') {
    return (
      <Shell>
        <StateCard
          icon="link-off"
          title={
            page.reason === 'offline'
              ? 'We couldn’t reach My Marriage'
              : page.reason === 'revoked'
                ? 'This upload link no longer works'
                : 'Open the link you were given'
          }
          body={
            page.reason === 'offline'
              ? 'Check your connection and reload this page.'
              : page.reason === 'revoked'
                ? 'The couple may have made a new one. Ask them for the latest link or QR code.'
                : 'To add photos, scan the couple’s QR code or open the upload link they shared with you.'
          }
        />
      </Shell>
    );
  }

  const view = page.view;
  const album = view.albums.find((candidate) => candidate.id === albumId) ?? view.album;
  const ready = items.filter((item) => item.status === 'ready');
  const received = items.filter((item) => item.status === 'received').length;
  const failed = items.filter((item) => item.status === 'failed');
  const retryable = failed.filter((item) => item.retry);
  const total = items.reduce((sum, item) => sum + item.file.size, 0);
  const sent = items.reduce(
    (sum, item) =>
      sum +
      (item.status === 'received'
        ? item.file.size
        : item.status === 'uploading'
          ? item.file.size * item.progress
          : 0),
    0,
  );
  const percent = total > 0 ? Math.round((sent / total) * 100) : 0;
  const heading =
    view.scope === 'album' && view.album
      ? `Add photos to ${view.coupleName}’s ${view.album.title}`
      : `Add photos to ${view.coupleName}’s wedding`;

  if (!view.open) {
    return (
      <Shell>
        <Intro heading={heading} />
        <StateCard
          icon={view.closedReason === 'storage_full' ? 'cloud-done' : 'lock'}
          title={
            view.closedReason === 'archived'
              ? 'Uploads have closed'
              : view.closedReason === 'storage_full'
                ? 'The photo collection is full'
                : `${view.album?.title ?? 'This album'} is closed for now`
          }
          body={
            view.closedReason === 'archived'
              ? `${view.coupleName} are no longer collecting photos. Thank you for celebrating with them.`
              : view.closedReason === 'storage_full'
                ? `${view.coupleName}’s photo collection has reached its limit, so no more photos can be added.`
                : 'The couple has paused uploads here. Try again later, or ask them for another link.'
          }
        />
        <WebsiteLink view={view} />
      </Shell>
    );
  }

  if (phase === 'done' && failed.length === 0) {
    return (
      <Shell>
        <section className="flex flex-col items-center gap-4 rounded-2xl bg-surface-container-lowest p-6 text-center shadow-sm">
          <span className="flex size-16 items-center justify-center rounded-full bg-primary-fixed text-primary">
            <Icon name="favorite" className="size-8" />
          </span>
          <p className="inline-flex items-center gap-1 rounded-full bg-secondary-container/50 px-3 py-0.5 text-label-sm font-semibold tracking-wider text-on-secondary-container uppercase">
            <Icon name="auto-awesome" className="size-3.5" />
            Delivered with love
          </p>
          <h1 className="font-serif text-headline-lg-mobile text-primary">Photos received!</h1>
          <p className="text-body-md text-on-surface-variant">
            Thank you{name.trim() ? `, ${name.trim()}` : ''}! {received}{' '}
            {received === 1 ? 'photo has' : 'photos have'} joined{' '}
            {album ? `the ${album.title} collection` : `${view.coupleName}’s collection`}.
          </p>
          <div className="flex w-full items-start gap-3 rounded-xl bg-surface-container-low p-3 text-left">
            <Icon name="verified" className="mt-0.5 size-5 shrink-0 text-secondary" />
            <p className="text-body-sm text-on-surface-variant">
              <span className="font-semibold text-on-surface">Waiting for the couple. </span>
              {view.coupleName} review every photo before it joins their wedding gallery.
            </p>
          </div>
          <button type="button" onClick={startOver} className={PRIMARY}>
            <Icon name="add" className="size-5" />
            Upload more photos
          </button>
        </section>
        <WebsiteLink view={view} />
      </Shell>
    );
  }

  return (
    <Shell>
      <Intro heading={heading} />

      {view.scope === 'album' && album ? (
        <section className="flex items-start gap-3 rounded-xl bg-surface-container-lowest p-4 shadow-sm">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-primary">
            <Icon name="photo-library" className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-label-sm tracking-wider text-secondary uppercase">Uploading to</p>
            <p className="truncate text-title-sm text-primary">{album.title}</p>
            {albumWhere(album) && (
              <p className="mt-0.5 flex items-center gap-1 text-body-sm text-on-surface-variant">
                <Icon name="calendar-today" className="size-3.5 text-secondary" />
                {albumWhere(album)}
              </p>
            )}
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary-container px-2 py-0.5 text-label-sm font-semibold text-on-secondary-container">
            <Icon name="qr-code" className="size-3" />
            Preselected
          </span>
        </section>
      ) : (
        <section className="flex flex-col gap-2 rounded-xl bg-surface-container-lowest p-4 shadow-sm">
          <label
            htmlFor="guest-album"
            className="flex items-center gap-1.5 text-label-md text-primary"
          >
            <Icon name="photo-library" className="size-4.5 text-secondary" />
            Which celebration are these from?
          </label>
          <select
            id="guest-album"
            value={albumId}
            disabled={phase === 'sending'}
            onChange={(event) => setAlbumId(event.target.value)}
            className="w-full rounded-lg bg-surface-container-low px-3.5 py-2.5 text-body-md text-on-surface"
          >
            {view.albums.map((option) => (
              <option key={option.id} value={option.id}>
                {option.title}
                {albumWhere(option) ? ` (${albumWhere(option)})` : ''}
              </option>
            ))}
          </select>
          <p className="text-body-sm text-on-surface-variant">
            Your photos go into this celebration’s album.
          </p>
        </section>
      )}

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
          className="group flex flex-col items-center gap-2 rounded-2xl bg-surface-container-low/70 p-6 text-center transition-colors hover:bg-surface-container"
        >
          <span className="mb-1 flex size-16 items-center justify-center rounded-full bg-surface-container-lowest text-primary shadow-sm transition-transform group-hover:scale-105">
            <Icon name="add" className="size-8" />
          </span>
          <span className="text-title-md font-semibold text-primary">Choose photos</span>
          <span className="max-w-xs text-body-sm text-on-surface-variant">
            Select candid moments from your camera roll or albums, or take a new picture
          </span>
          <span className="mt-2 flex flex-wrap justify-center gap-2">
            <span className="rounded-full bg-surface-container-highest px-2.5 py-1 text-label-sm text-on-surface-variant">
              JPG, PNG, WebP
            </span>
            <span className="rounded-full bg-surface-container-highest px-2.5 py-1 text-label-sm text-on-surface-variant">
              Up to {PHOTO_BATCH} photos
            </span>
          </span>
        </button>
      ) : (
        <section aria-labelledby="chosen-heading" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2
              id="chosen-heading"
              className="flex items-center gap-2 text-title-sm text-on-surface"
            >
              {items.length} {items.length === 1 ? 'photo' : 'photos'} selected
              <span className="text-body-sm font-normal text-on-surface-variant">
                {formatBytes(total)} total
              </span>
            </h2>
            {phase !== 'sending' && items.length < PHOTO_BATCH && (
              <button
                type="button"
                onClick={() => input.current?.click()}
                className="inline-flex min-h-8 items-center gap-1 rounded-lg bg-surface-container-low px-3 text-label-md text-primary"
              >
                <Icon name="add" className="size-4" />
                Add more
              </button>
            )}
          </div>

          {phase !== 'choose' && (
            <div className="flex flex-col gap-2 rounded-xl bg-surface-container-lowest p-4 shadow-sm">
              <div className="flex items-center justify-between text-label-md font-semibold text-primary">
                <span id="guest-progress">
                  {received} of {items.length} {items.length === 1 ? 'photo' : 'photos'} received
                </span>
                <span>{percent}%</span>
              </div>
              <div
                role="progressbar"
                aria-labelledby="guest-progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                className="h-2 overflow-hidden rounded-full bg-surface-container"
              >
                <span
                  className="block h-full rounded-full bg-primary transition-all"
                  style={{ width: `${percent}%` }}
                />
              </div>
              {phase === 'sending' && (
                <p className="flex items-center gap-1 text-label-sm text-on-surface-variant">
                  <Icon name="info" className="size-3.5 text-secondary" />
                  Please keep this page open until the upload completes
                </p>
              )}
            </div>
          )}

          <ul className="flex flex-col gap-2" aria-label="Your photos">
            {items.map((item) => (
              <li
                key={item.key}
                className="flex flex-col gap-2 rounded-xl bg-surface-container-lowest p-3 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-surface-container">
                    {item.preview ? (
                      <Image
                        src={item.preview}
                        alt=""
                        fill
                        unoptimized
                        sizes="64px"
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
                      <span className="truncate text-title-sm text-on-surface">
                        {item.file.name}
                      </span>
                      <span className="shrink-0 text-label-sm text-on-surface-variant">
                        {formatBytes(item.file.size)}
                      </span>
                    </div>
                    <ItemStatus item={item} />
                  </div>
                  {item.status === 'ready' && phase === 'choose' && (
                    <button
                      type="button"
                      onClick={() => remove(item.key)}
                      className="rounded-full p-1.5 text-on-surface-variant hover:bg-surface-container"
                    >
                      <Icon name="close" className="size-4" label={`Remove ${item.file.name}`} />
                    </button>
                  )}
                </div>
                {item.status === 'failed' && (
                  <div className="flex flex-col gap-2 rounded-lg bg-error-container/30 p-2.5">
                    <p role="alert" className="flex items-start gap-2 text-body-sm text-on-surface">
                      <Icon name="warning" className="mt-0.5 size-4 shrink-0 text-error" />
                      {item.error}
                    </p>
                    {phase !== 'sending' && (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => remove(item.key)}
                          className="inline-flex min-h-8 items-center gap-1 rounded-lg px-3 text-label-md text-on-surface-variant"
                        >
                          <Icon name="close" className="size-4" />
                          Remove
                        </button>
                        {item.retry && (
                          <button
                            type="button"
                            onClick={() => void send([item.key])}
                            className="inline-flex min-h-8 items-center gap-1 rounded-lg bg-surface-container px-3 text-label-md text-primary"
                          >
                            <Icon name="sync" className="size-4" />
                            Retry
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {phase === 'choose' && (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="guest-name"
            className="flex items-baseline justify-between gap-2 text-label-md text-on-surface"
          >
            <span>
              Your name <span className="font-normal text-on-surface-variant">(optional)</span>
            </span>
            <span className="text-label-sm text-secondary">Visible to the couple only</span>
          </label>
          <input
            id="guest-name"
            value={name}
            maxLength={NAME_MAX}
            autoComplete="name"
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Priya D. or Rahul (bride’s side)"
            className="w-full rounded-lg bg-surface-container-lowest px-3.5 py-2.5 text-body-md text-on-surface shadow-xs placeholder:text-outline"
          />
        </div>
      )}

      <aside className="flex items-start gap-3 rounded-xl bg-surface-container-low p-3.5">
        <Icon name="shield" className="mt-0.5 size-5 shrink-0 text-secondary" />
        <p className="text-body-sm text-on-surface-variant">
          <span className="block text-label-md font-semibold text-primary">
            Reviewed by the couple
          </span>
          Photos go to {view.coupleName}’s private review first. Only the ones they approve may
          appear in their wedding website’s gallery, without your name.
        </p>
      </aside>

      <div className="flex flex-col gap-2">
        {phase === 'choose' ? (
          <button
            type="button"
            disabled={ready.length === 0 || !albumId}
            onClick={() => void send(ready.map((item) => item.key))}
            className={`${PRIMARY} disabled:cursor-not-allowed disabled:bg-surface-container-highest disabled:text-outline disabled:shadow-none`}
          >
            <Icon name="cloud-done" className="size-5" />
            {ready.length === 0
              ? 'Upload photos'
              : `Upload ${ready.length} ${ready.length === 1 ? 'photo' : 'photos'}`}
          </button>
        ) : phase === 'done' && retryable.length > 0 ? (
          <button
            type="button"
            onClick={() => void send(retryable.map((item) => item.key))}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-surface-container-high text-label-md font-semibold text-primary"
          >
            <Icon name="sync" className="size-4" />
            Retry {retryable.length} failed {retryable.length === 1 ? 'photo' : 'photos'}
          </button>
        ) : null}
        {phase === 'done' && (
          <button
            type="button"
            onClick={startOver}
            className="text-label-md text-primary underline"
          >
            Start again with other photos
          </button>
        )}
        <p className="flex items-center justify-center gap-1.5 text-center text-label-sm text-on-surface-variant">
          <Icon name="lock" className="size-3.5 text-secondary" />
          Private upload link · No account or login needed
        </p>
      </div>

      <WebsiteLink view={view} />
    </Shell>
  );
}

const PRIMARY =
  'inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-label-md font-semibold text-on-primary shadow-md transition-colors hover:bg-primary-container';

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh w-full flex-col bg-surface">
      <header className="sticky top-0 z-10 bg-surface/85 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-lg items-center justify-between gap-2 px-5">
          <div className="flex min-w-0 items-center gap-2">
            <LogoMark className="size-8" />
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-serif text-headline-sm leading-tight text-primary">
                My Marriage
              </span>
              <span className="truncate text-label-sm tracking-wider text-on-surface-variant uppercase">
                Guest photo upload
              </span>
            </div>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-surface-container px-2.5 py-1 text-label-sm text-primary">
            <Icon name="lock" className="size-3.5" />
            Private
          </span>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-5 pt-4 pb-10">
        {children}
      </main>
    </div>
  );
}

function Intro({ heading }: { heading: string }) {
  return (
    <header className="flex flex-col gap-1">
      <p className="flex items-center gap-1.5 text-label-sm font-semibold tracking-widest text-secondary uppercase">
        <Icon name="spa" className="size-4" />
        Share your memories
      </p>
      <h1 className="font-serif text-headline-lg-mobile tracking-tight text-primary">{heading}</h1>
      <p className="text-body-sm text-on-surface-variant">
        Share your candid snapshots and family portraits. The couple will review every photo before
        it joins their wedding gallery.
      </p>
    </header>
  );
}

function StateCard({
  icon,
  title,
  body,
}: {
  icon: 'link-off' | 'lock' | 'cloud-done';
  title: string;
  body: string;
}) {
  return (
    <section className="flex flex-col items-center gap-3 rounded-2xl bg-surface-container-lowest p-6 text-center shadow-sm">
      <span className="flex size-12 items-center justify-center rounded-full bg-surface-container-highest text-secondary">
        <Icon name={icon} className="size-7" />
      </span>
      <h1 className="font-serif text-headline-sm text-primary">{title}</h1>
      <p className="text-body-md text-on-surface-variant">{body}</p>
    </section>
  );
}

function WebsiteLink({ view }: { view: View }) {
  if (!view.websitePath) return null;
  return (
    <a
      href={view.websitePath}
      className="flex items-center justify-between gap-2 rounded-2xl bg-surface-container-lowest p-4 shadow-sm"
    >
      <span>
        <span className="block text-label-sm tracking-wider text-secondary uppercase">
          Celebration guide
        </span>
        <span className="text-title-sm text-on-surface">{view.coupleName}’s wedding website</span>
      </span>
      <Icon name="arrow-forward" className="size-5 text-primary" />
    </a>
  );
}

function ItemStatus({ item }: { item: Item }) {
  if (item.status === 'uploading') {
    const percent = Math.round(item.progress * 100);
    return (
      <div className="flex flex-col gap-1">
        <span className="text-label-sm font-semibold text-primary">Uploading {percent}%</span>
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
    ready: { text: 'Ready', className: 'bg-surface-container text-on-surface-variant' },
    received: {
      text: 'Received — waiting for review',
      className: 'bg-secondary-fixed/50 text-on-secondary-fixed-variant',
    },
    failed: { text: 'Not uploaded', className: 'bg-error-container text-on-error-container' },
  }[item.status];
  return (
    <span
      className={`self-start rounded-full px-2 py-0.5 text-label-sm font-semibold ${chip.className}`}
    >
      {chip.text}
    </span>
  );
}
