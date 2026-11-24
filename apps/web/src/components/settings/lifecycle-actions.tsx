'use client';

import { useRouter } from 'next/navigation';
import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { FormAlert } from '@/components/forms/form-alert';
import { inputClass } from '@/components/forms/text-field';
import { Icon, type IconName } from '@/components/ui/icon';
import {
  DANGER_BUTTON,
  OUTLINE_BUTTON,
  PLAIN_BUTTON,
  PRIMARY_BUTTON,
  Sheet,
} from '@/components/ui/sheet';
import { api } from '@/lib/api/browser';
import { networkFailure, toFailure } from '@/lib/api/errors';

type Action = 'archive' | 'request-deletion' | 'cancel-deletion';

/** Sends one lifecycle request; the page then shows the wedding as it is now. */
function useLifecycle(weddingId: string) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function run(action: Action): Promise<boolean> {
    setBusy(true);
    setProblem(null);
    const params = { params: { path: { weddingId } } };
    try {
      const { response, error } =
        action === 'archive'
          ? await api.POST('/api/v1/weddings/{weddingId}/archive', params)
          : action === 'request-deletion'
            ? await api.POST('/api/v1/weddings/{weddingId}/deletion-requests', params)
            : await api.POST('/api/v1/weddings/{weddingId}/deletion-requests/cancel', params);
      setBusy(false);
      if (response.ok) {
        router.refresh();
        return true;
      }
      setProblem(toFailure(response.status, error).message);
      return false;
    } catch {
      setBusy(false);
      setProblem(networkFailure().message);
      return false;
    }
  }

  return { busy, problem, setProblem, run };
}

/**
 * A confirmation that asks for a word to be typed, for the two changes an
 * owner cannot undo by themselves (Stitch "Open Archive Modal" and
 * "Request Deletion Dialog").
 */
function TypedConfirmation({
  open,
  onClose,
  title,
  description,
  word,
  points,
  problem,
  busy,
  danger,
  confirmLabel,
  busyLabel,
  icon,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  word: string;
  points: readonly ReactNode[];
  problem: string | null;
  busy: boolean;
  danger: boolean;
  confirmLabel: string;
  busyLabel: string;
  icon: IconName;
  onConfirm: () => void;
}) {
  const [typed, setTyped] = useState('');
  const inputId = useId();
  const matches = typed.trim().toUpperCase() === word;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (matches && !busy) onConfirm();
  }

  return (
    <Sheet
      open={open}
      onClose={() => {
        setTyped('');
        onClose();
      }}
      title={title}
      description={description}
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <ul className="flex flex-col gap-2 text-body-sm text-on-surface">
          {points.map((point, index) => (
            <li key={index} className="flex items-start gap-2">
              <Icon name="info" className="mt-0.5 size-4 shrink-0 text-secondary" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
        {problem && <FormAlert tone="error">{problem}</FormAlert>}
        <div className="flex flex-col gap-1.5">
          <label htmlFor={inputId} className="text-label-md font-semibold text-on-surface">
            Type <span className="font-mono tracking-wider">{word}</span> to confirm
          </label>
          <input
            id={inputId}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className={`${inputClass} border-outline-variant font-mono tracking-wider`}
          />
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => {
              setTyped('');
              onClose();
            }}
            className={PLAIN_BUTTON}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!matches || busy}
            aria-busy={busy || undefined}
            className={danger ? DANGER_BUTTON : PRIMARY_BUTTON}
          >
            <Icon name={icon} className="size-5" />
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </form>
    </Sheet>
  );
}

/** "Archive wedding": owners only, active weddings only. */
export function ArchiveAction({
  weddingId,
  coupleName,
}: {
  weddingId: string;
  coupleName: string;
}) {
  const [open, setOpen] = useState(false);
  const { busy, problem, setProblem, run } = useLifecycle(weddingId);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setProblem(null);
          setOpen(true);
        }}
        className={`${OUTLINE_BUTTON} shrink-0`}
      >
        <Icon name="archive" className="size-5" />
        Archive wedding
      </button>
      <TypedConfirmation
        open={open}
        onClose={() => setOpen(false)}
        title={`Archive ${coupleName}’s wedding?`}
        description="Archiving is for after the celebrations. You can’t reopen an archived wedding yourself."
        word="ARCHIVE"
        points={[
          'Everything becomes read-only for the whole team: events, tasks, guests, expenses, vendors, photos and the website.',
          'Guests can no longer reply to invitations or upload photos. Reminders stop.',
          'Your published website and approved photos stay online until you unpublish or hide them.',
          'All records stay readable, and you can still start another wedding.',
        ]}
        problem={problem}
        busy={busy}
        danger={false}
        confirmLabel="Archive wedding"
        busyLabel="Archiving…"
        icon="archive"
        onConfirm={() => void run('archive').then((done) => done && setOpen(false))}
      />
    </>
  );
}

/** "Request deletion": owners only, while the wedding is active or archived. */
export function DeletionAction({
  weddingId,
  coupleName,
}: {
  weddingId: string;
  coupleName: string;
}) {
  const [open, setOpen] = useState(false);
  const { busy, problem, setProblem, run } = useLifecycle(weddingId);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setProblem(null);
          setOpen(true);
        }}
        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md px-4 text-label-md font-semibold text-error ring-1 ring-error/40 transition-colors hover:bg-error-container/40"
      >
        <Icon name="delete" className="size-5" />
        Request deletion
      </button>
      <TypedConfirmation
        open={open}
        onClose={() => setOpen(false)}
        title={`Delete ${coupleName}’s wedding?`}
        description="Your wedding is taken offline and scheduled for deletion. You can cancel until it is processed."
        word="DELETE"
        points={[
          'The website, photo gallery, guest invitation pages and upload links go offline at once.',
          'The workspace becomes read-only for the whole team.',
          'Nothing is erased yet: either owner can cancel the request and bring everything back.',
        ]}
        problem={problem}
        busy={busy}
        danger
        confirmLabel="Request deletion"
        busyLabel="Requesting…"
        icon="delete"
        onConfirm={() => void run('request-deletion').then((done) => done && setOpen(false))}
      />
    </>
  );
}

/** "Cancel deletion request": brings the wedding back as it was. */
export function CancelDeletionAction({ weddingId }: { weddingId: string }) {
  const { busy, problem, run } = useLifecycle(weddingId);
  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-start">
      <button
        type="button"
        disabled={busy}
        aria-busy={busy || undefined}
        onClick={() => void run('cancel-deletion')}
        className={PRIMARY_BUTTON}
      >
        <Icon name="undo" className="size-5" />
        {busy ? 'Cancelling…' : 'Cancel deletion request'}
      </button>
      {problem && (
        <p role="alert" className="text-body-sm text-error">
          {problem}
        </p>
      )}
    </div>
  );
}
