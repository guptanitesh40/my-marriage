'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type ReactNode } from 'react';
import { FormAlert } from '@/components/forms/form-alert';
import { TextField } from '@/components/forms/text-field';
import { Icon } from '@/components/ui/icon';
import { api } from '@/lib/api/browser';
import { networkFailure, toFailure } from '@/lib/api/errors';
import type { Album } from '@/lib/photos/albums';
import { albumPath } from '@/lib/routes';

/** The album name limit, as the API checks it (decision 0019). */
const TITLE_MAX = 80;

const buttonClass = {
  primary:
    'inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-label-md font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container',
  secondary:
    'inline-flex items-center justify-center gap-2 rounded-md bg-surface-container-lowest px-4 py-2.5 text-label-md font-semibold text-on-surface shadow-xs ring-1 ring-outline-variant/60 transition-colors hover:bg-surface-container-low',
} as const;

/**
 * "Create Album" (Stitch "Photos & Albums Workspace", create dialog): a
 * name, then the new album opens. Ceremonies get their albums on their
 * own, so this makes the couple's own albums only.
 */
export function CreateAlbumButton({
  weddingId,
  children,
  variant = 'primary',
}: {
  weddingId: string;
  children: ReactNode;
  variant?: keyof typeof buttonClass;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className={buttonClass[variant]}
      >
        <Icon name="add" className="size-5" />
        {children}
      </button>
      <AlbumNameDialog dialog={dialog} weddingId={weddingId} />
    </>
  );
}

/** Renames one of the couple's albums or the general one; an event album keeps its ceremony's name. */
export function RenameAlbumButton({ weddingId, album }: { weddingId: string; album: Album }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className={buttonClass.secondary}
      >
        <Icon name="edit" className="size-4.5" />
        Rename
      </button>
      <AlbumNameDialog dialog={dialog} weddingId={weddingId} album={album} />
    </>
  );
}

function AlbumNameDialog({
  dialog,
  weddingId,
  album,
}: {
  dialog: React.RefObject<HTMLDialogElement | null>;
  weddingId: string;
  /** The album to rename; a new album when missing. */
  album?: Album;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(album?.title ?? '');
  const [fieldError, setFieldError] = useState<string>();
  const [alert, setAlert] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const id = album ? `rename-album-${album.id}` : 'create-album';

  function reset() {
    setTitle(album?.title ?? '');
    setFieldError(undefined);
    setAlert(null);
    setPending(false);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    if (!title.trim()) {
      setFieldError('Enter a name for the album.');
      return;
    }
    setPending(true);
    setFieldError(undefined);
    setAlert(null);
    try {
      const result = album
        ? await api.PATCH('/api/v1/weddings/{weddingId}/albums/{albumId}', {
            params: { path: { weddingId, albumId: album.id } },
            body: { title },
          })
        : await api.POST('/api/v1/weddings/{weddingId}/albums', {
            params: { path: { weddingId } },
            body: { title },
          });
      if (result.data) {
        dialog.current?.close();
        if (album) router.refresh();
        else router.push(albumPath(weddingId, result.data.data.id));
        return;
      }
      const failure = toFailure(result.response.status, result.error);
      if (failure.fields.title) setFieldError(failure.fields.title);
      else setAlert(failure.message);
      if (failure.code === 'WEDDING_ARCHIVED') router.refresh();
    } catch {
      setAlert(networkFailure().message);
    }
    setPending(false);
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby={`${id}-title`}
      onClose={reset}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-surface-container-lowest p-6 text-on-surface shadow-xl backdrop:bg-on-surface/40 backdrop:backdrop-blur-xs"
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-label-sm font-semibold tracking-widest text-secondary uppercase">
              {album ? 'Album settings' : 'New collection'}
            </p>
            <h2 id={`${id}-title`} className="mt-1 font-serif text-headline-sm text-on-surface">
              {album ? 'Rename album' : 'Create new album'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="-m-1.5 rounded-full p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container"
          >
            <Icon name="close" className="size-5" label="Close" />
          </button>
        </div>

        {alert && (
          <FormAlert tone="error" title={album ? 'Unable to rename' : 'Unable to create the album'}>
            {alert}
          </FormAlert>
        )}

        <TextField
          id={`${id}-name`}
          label="Album name"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={TITLE_MAX}
          placeholder="e.g. Pre-Wedding Shoot or Family Portraits"
          autoComplete="off"
          required
          {...(fieldError ? { error: fieldError } : {})}
          {...(album
            ? {}
            : { hint: 'Each ceremony already has its own album; this one is for anything else.' })}
        />

        {!album && (
          <p className="flex items-start gap-2 rounded-xl bg-surface-container-low p-3 text-body-sm text-on-surface-variant">
            <Icon name="lock" className="mt-0.5 size-4 shrink-0 text-secondary" />
            Every photo waits for your approval, and appears on your website only if you turn on its
            photo gallery.
          </p>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="rounded-md bg-surface-container px-4 py-2.5 text-label-md font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            aria-disabled={pending}
            className="rounded-md bg-primary px-5 py-2.5 text-label-md font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-60"
          >
            {pending ? 'Saving…' : album ? 'Save name' : 'Create album'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
