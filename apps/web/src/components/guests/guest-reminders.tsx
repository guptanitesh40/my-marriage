'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { FormAlert } from '@/components/forms/form-alert';
import { Icon } from '@/components/ui/icon';
import { api } from '@/lib/api/browser';
import { networkFailure, toFailure } from '@/lib/api/errors';
import {
  offsetsText,
  SKIP_ORDER,
  SKIP_TEXT,
  type ReminderPreview,
  type ReminderSettings,
} from '@/lib/guests/reminders';
import type { GuestEventChoice } from './guest-form';

const NOTE_LIMIT = 500;
const OFFSETS = [30, 7, 3] as const;

const smallButton =
  'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-label-md font-semibold text-on-surface transition-colors hover:bg-surface-container';
const dialogClass =
  'm-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl bg-surface-container-lowest p-0 text-on-surface shadow-xl backdrop:bg-on-surface/50';
const primaryButton =
  'rounded-md bg-primary px-4 py-2.5 text-label-md font-semibold text-on-primary disabled:opacity-50';
const quietButton =
  'rounded-md bg-surface-container-lowest px-4 py-2.5 text-label-md font-semibold text-on-surface shadow-sm';

function DialogHeader({
  id,
  eyebrow,
  title,
  onClose,
}: {
  id: string;
  eyebrow: string;
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-label-sm font-semibold tracking-widest text-secondary uppercase">
          {eyebrow}
        </p>
        <h2 id={id} className="font-serif text-headline-sm text-on-surface">
          {title}
        </h2>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container"
      >
        <Icon name="close" className="size-5" label="Close" />
      </button>
    </div>
  );
}

/** Who to remind: everyone invited, or one guest from their details. */
type Audience = { kind: 'all' } | { kind: 'one'; guestId: string; name: string };

/**
 * A reminder sent by hand (decision 0016): about every upcoming ceremony or
 * one, with an optional note from the couple. For everyone, it first shows
 * who will get it and who is left out and why; each family gets one email
 * with their ceremonies, their current answers and their private link.
 */
function ReminderDialog({
  weddingId,
  audience,
  events,
  button,
  onSent,
}: {
  weddingId: string;
  audience: Audience;
  /** The upcoming ceremonies to choose from. */
  events: readonly GuestEventChoice[];
  /** The look of the button that opens it. */
  button: { className: string; iconClassName: string; disabled?: boolean };
  onSent: (queued: number) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [eventId, setEventId] = useState('');
  const [note, setNote] = useState('');
  const [preview, setPreview] = useState<ReminderPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<number | null>(null);
  const [alert, setAlert] = useState<string | null>(null);
  const all = audience.kind === 'all';
  const titleId = all ? 'remind-all-title' : 'remind-one-title';

  async function load(scope: string) {
    if (!all) return;
    setLoading(true);
    setAlert(null);
    try {
      const { data, error, response } = await api.POST(
        '/api/v1/weddings/{weddingId}/guests/reminders/preview',
        { params: { path: { weddingId } }, body: scope ? { eventId: scope } : {} },
      );
      if (data) setPreview(data.data);
      else setAlert(toFailure(response.status, error).message);
    } catch {
      setAlert(networkFailure().message);
    }
    setLoading(false);
  }

  async function send() {
    if (sending) return;
    setSending(true);
    setAlert(null);
    const body = { ...(eventId ? { eventId } : {}), ...(note.trim() ? { note } : {}) };
    try {
      const { data, error, response } =
        audience.kind === 'all'
          ? await api.POST('/api/v1/weddings/{weddingId}/guests/reminders', {
              params: { path: { weddingId } },
              body,
            })
          : await api.POST('/api/v1/weddings/{weddingId}/guests/{guestId}/reminder', {
              params: { path: { weddingId, guestId: audience.guestId } },
              body,
            });
      if (data) {
        setSent(data.data.queued);
        onSent(data.data.queued);
      } else {
        const failure = toFailure(response.status, error);
        setAlert(Object.values(failure.fields)[0] ?? failure.message);
      }
    } catch {
      setAlert(networkFailure().message);
    }
    setSending(false);
  }

  function open() {
    dialog.current?.showModal();
    void load('');
  }

  const recipients = all ? (preview?.recipients ?? 0) : 1;
  const canSend = !sending && !loading && (all ? recipients > 0 : true);

  return (
    <>
      <button type="button" disabled={button.disabled} onClick={open} className={button.className}>
        <Icon name="notifications" className={button.iconClassName} />
        Send reminder
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onClose={() => {
          setSent(null);
          setAlert(null);
          setNote('');
          setEventId('');
          setPreview(null);
        }}
        className={dialogClass}
      >
        <div className="flex flex-col gap-4 p-6">
          <DialogHeader
            id={titleId}
            eyebrow={sent !== null ? 'Done' : 'Reminder email'}
            title={all ? 'Remind everyone invited' : `Remind ${audience.name}`}
            onClose={() => dialog.current?.close()}
          />

          {alert && (
            <FormAlert tone="error" title="Couldn’t send the reminder">
              {alert}
            </FormAlert>
          )}

          {sent !== null ? (
            <div role="status" className="rounded-xl bg-primary-fixed/40 p-4 text-body-md">
              <p className="flex items-center gap-2 font-semibold text-on-surface">
                <Icon name="check-circle" className="size-5 text-primary" />
                {sent === 1 ? 'The reminder is on its way.' : `${sent} reminders are on their way.`}
              </p>
              <p className="mt-1 text-body-sm text-on-surface-variant">
                Each guest’s email status shows in their details. “Sent” means the mail server
                accepted it; delivery isn’t confirmed.
              </p>
            </div>
          ) : (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="text-label-md font-semibold text-on-surface">Remind about</span>
                <select
                  value={eventId}
                  onChange={(e) => {
                    setEventId(e.target.value);
                    void load(e.target.value);
                  }}
                  className="min-h-11 rounded-md border border-outline-variant bg-surface-container-lowest px-3 text-body-md text-on-surface"
                >
                  <option value="">All upcoming ceremonies</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.title} only{event.when ? ` · ${event.when}` : ''}
                    </option>
                  ))}
                </select>
              </label>

              {all && (
                <section
                  aria-label="Who gets it"
                  aria-busy={loading || undefined}
                  className="flex flex-col gap-3"
                >
                  <p className="flex items-center gap-3 rounded-xl bg-surface-container-low p-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary">
                      <Icon name="notifications" className="size-5" />
                    </span>
                    <span>
                      <span className="block font-serif text-headline-sm text-on-surface tabular-nums">
                        {loading || !preview
                          ? 'Checking…'
                          : `${preview.recipients} ${preview.recipients === 1 ? 'family' : 'families'}`}
                      </span>
                      <span className="text-body-sm text-on-surface-variant">
                        will get one email each, with their ceremonies, their current answers and
                        their private link.
                      </span>
                    </span>
                  </p>
                  {preview &&
                    SKIP_ORDER.filter((reason) => preview.skipped[reason].count > 0).map(
                      (reason) => {
                        const skipped = preview.skipped[reason];
                        const more = skipped.count - skipped.names.length;
                        return (
                          <details
                            key={reason}
                            className="rounded-lg border border-outline-variant px-3 py-2 text-body-sm"
                          >
                            <summary className="cursor-pointer text-on-surface">
                              <span className="font-semibold">
                                {SKIP_TEXT[reason].title} ({skipped.count})
                              </span>{' '}
                              <span className="text-on-surface-variant">— not emailed</span>
                            </summary>
                            <p className="mt-1 text-on-surface-variant">{SKIP_TEXT[reason].hint}</p>
                            <p className="mt-1 text-on-surface">
                              {skipped.names.join(', ')}
                              {more > 0 ? ` and ${more} more` : ''}
                            </p>
                          </details>
                        );
                      },
                    )}
                  {preview && (
                    <p className="text-body-sm text-on-surface-variant">
                      {preview.emailsLeftToday} emails left today for this wedding (invitations and
                      reminders share Gmail’s daily limit).
                    </p>
                  )}
                </section>
              )}

              <label className="flex flex-col gap-1.5">
                <span className="flex items-baseline justify-between gap-3 text-label-md font-semibold text-on-surface">
                  A note from you
                  <span className="text-label-sm font-normal text-on-surface-variant">
                    Optional · {note.length}/{NOTE_LIMIT}
                  </span>
                </span>
                <textarea
                  value={note}
                  maxLength={NOTE_LIMIT}
                  rows={3}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Please reply by 25 January so we can plan the food."
                  className="rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface"
                />
              </label>
            </>
          )}
        </div>
        <div className="flex justify-end gap-3 border-t border-surface-container-highest bg-surface-container-low px-6 py-4">
          {sent !== null ? (
            <button type="button" onClick={() => dialog.current?.close()} className={primaryButton}>
              Done
            </button>
          ) : (
            <>
              <button type="button" onClick={() => dialog.current?.close()} className={quietButton}>
                Cancel
              </button>
              <button type="button" onClick={send} disabled={!canSend} className={primaryButton}>
                {sending
                  ? 'Sending…'
                  : all
                    ? `Send ${recipients} ${recipients === 1 ? 'reminder' : 'reminders'}`
                    : 'Send reminder'}
              </button>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}

/** "Send reminder" on the Guests page: everyone invited. */
export function RemindGuests({
  weddingId,
  events,
}: {
  weddingId: string;
  events: readonly GuestEventChoice[];
}) {
  const router = useRouter();
  return (
    <ReminderDialog
      weddingId={weddingId}
      audience={{ kind: 'all' }}
      events={events}
      onSent={() => router.refresh()}
      button={{ className: smallButton, iconClassName: 'size-4.5 text-on-surface-variant' }}
    />
  );
}

/** "Send reminder" in one guest's details. */
export function RemindGuest({
  weddingId,
  guestId,
  name,
  events,
  disabled,
  onSent,
}: {
  weddingId: string;
  guestId: string;
  name: string;
  /** This guest's upcoming ceremonies. */
  events: readonly GuestEventChoice[];
  disabled: boolean;
  onSent: () => void;
}) {
  return (
    <ReminderDialog
      weddingId={weddingId}
      audience={{ kind: 'one', guestId, name }}
      events={events}
      onSent={onSent}
      button={{
        className:
          'inline-flex items-center gap-1.5 rounded-md bg-surface-container-lowest px-3.5 py-2.5 text-label-md font-semibold text-on-surface shadow-sm ring-1 ring-outline-variant transition-colors hover:bg-surface-container-low disabled:opacity-50',
        iconClassName: 'size-4.5',
        disabled,
      }}
    />
  );
}

/**
 * Automatic reminders (PRD INV-07): on or off for the wedding, and which
 * days before each ceremony. Off until the couple switches them on.
 */
export function AutoReminders({
  weddingId,
  initial,
}: {
  weddingId: string;
  initial: ReminderSettings;
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [saved, setSaved] = useState(initial);
  const [enabled, setEnabled] = useState(initial.remindersEnabled);
  const [offsets, setOffsets] = useState<number[]>(initial.reminderOffsetsDays);
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);

  function reset() {
    setEnabled(saved.remindersEnabled);
    setOffsets(saved.reminderOffsetsDays);
    setAlert(null);
  }

  async function save() {
    if (busy) return;
    if (enabled && offsets.length === 0) {
      setAlert('Choose at least one day to send reminders.');
      return;
    }
    setBusy(true);
    setAlert(null);
    try {
      const { data, error, response } = await api.PUT(
        '/api/v1/weddings/{weddingId}/reminder-settings',
        {
          params: { path: { weddingId } },
          body: {
            remindersEnabled: enabled,
            reminderOffsetsDays: OFFSETS.filter((offset) => offsets.includes(offset)),
          },
        },
      );
      if (data) {
        setSaved(data.data);
        dialog.current?.close();
        router.refresh();
      } else {
        const failure = toFailure(response.status, error);
        setAlert(Object.values(failure.fields)[0] ?? failure.message);
      }
    } catch {
      setAlert(networkFailure().message);
    }
    setBusy(false);
  }

  const time = saved.sendTime === '09:00' ? '9:00 am' : saved.sendTime;
  return (
    <>
      <button
        type="button"
        onClick={() => {
          reset();
          dialog.current?.showModal();
        }}
        className={smallButton}
      >
        <Icon
          name={saved.remindersEnabled ? 'notifications-active' : 'notifications-off'}
          className="size-4.5 text-on-surface-variant"
        />
        Automatic reminders: {saved.remindersEnabled ? 'On' : 'Off'}
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="auto-reminders-title"
        onClose={reset}
        className={dialogClass}
      >
        <div className="flex flex-col gap-4 p-6">
          <DialogHeader
            id="auto-reminders-title"
            eyebrow="Reminder email"
            title="Automatic reminders"
            onClose={() => dialog.current?.close()}
          />
          {alert && (
            <FormAlert tone="error" title="Couldn’t save">
              {alert}
            </FormAlert>
          )}
          <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-surface-container-low p-4">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="mt-1 size-4.5 shrink-0 accent-primary"
            />
            <span>
              <span className="block text-title-sm text-on-surface">
                Send reminders before each ceremony
              </span>
              <span className="text-body-sm text-on-surface-variant">
                Emailed at {time} in each ceremony’s time zone, to everyone invited to it, whatever
                their answer.
              </span>
            </span>
          </label>
          <fieldset disabled={!enabled} className="flex flex-col gap-2 disabled:opacity-50">
            <legend className="mb-1 text-label-md font-semibold text-on-surface">
              When to send them
            </legend>
            <div className="flex flex-wrap gap-2">
              {OFFSETS.map((offset) => {
                const on = offsets.includes(offset);
                return (
                  <label
                    key={offset}
                    className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3.5 py-2 text-label-md font-semibold ${
                      on
                        ? 'border-primary bg-primary-fixed/30 text-on-surface'
                        : 'border-outline-variant text-on-surface-variant'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(e) =>
                        setOffsets((current) =>
                          e.target.checked
                            ? [...current, offset]
                            : current.filter((other) => other !== offset),
                        )
                      }
                      className="size-4.5 accent-primary"
                    />
                    {offset} days before
                  </label>
                );
              })}
            </div>
          </fieldset>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-body-sm text-on-surface-variant">
            <li>
              One email per family a day, listing every ceremony coming up, with their answer and
              private link.
            </li>
            <li>
              Only guests with an email address and a shared invitation link get them. Guests can
              turn them off from their invitation.
            </li>
            <li>
              Never for cancelled ceremonies or an archived wedding. A moved date is followed.
            </li>
          </ul>
          {saved.remindersEnabled && (
            <p className="text-body-sm text-on-surface">
              Now on: {offsetsText(saved.reminderOffsetsDays)} each ceremony.
            </p>
          )}
        </div>
        <div className="flex justify-end gap-3 border-t border-surface-container-highest bg-surface-container-low px-6 py-4">
          <button type="button" onClick={() => dialog.current?.close()} className={quietButton}>
            Cancel
          </button>
          <button type="button" onClick={save} disabled={busy} className={primaryButton}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </dialog>
    </>
  );
}
