'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { FormAlert } from '@/components/forms/form-alert';
import { Icon } from '@/components/ui/icon';
import { api } from '@/lib/api/browser';
import { networkFailure, toFailure } from '@/lib/api/errors';
import {
  deliveryOf,
  people,
  RSVP_LABELS,
  type Guest,
  type GuestDetail,
} from '@/lib/guests/directory';
import type { GuestEventChoice } from './guest-form';
import { DeliveryChip, RsvpChip } from './guest-status';
import { RemindGuest } from './guest-reminders';

const sectionLabel = 'text-label-sm font-semibold tracking-wider text-on-surface-variant uppercase';

const secondaryButton =
  'inline-flex items-center justify-center gap-1.5 rounded-md bg-surface-container px-3.5 py-2.5 text-label-md font-semibold text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-50';

/** "2 Dec 2026, 6:40 pm", in India time. */
function moment(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });
}

/** The message shared by hand on WhatsApp (PRD INV-06); nothing is sent automatically. */
export function whatsappUrl(input: {
  phone?: string;
  guestName: string;
  coupleName: string;
  link: string;
}): string {
  const text = `Namaste ${input.guestName}! You're invited to ${input.coupleName}'s wedding. Please let us know who's coming to each celebration: ${input.link}`;
  const digits = input.phone?.replace(/\D/g, '');
  return `https://wa.me/${digits ?? ''}?text=${encodeURIComponent(text)}`;
}

/**
 * A guest's details (Stitch "Guests & RSVP", guest details): their party
 * size and contact, each invited ceremony with its answer and how it
 * changed, and the private invitation: copy the link, share it on WhatsApp
 * by hand, email it, or replace it so the old one stops working.
 */
export function GuestDetails({
  weddingId,
  guest: listed,
  events,
  upcoming,
  coupleName,
  writable,
  canRemove,
  onClose,
  onEdit,
  onChanged,
  onRemoved,
}: {
  weddingId: string;
  /** The guest as listed, shown until the details arrive. */
  guest: Guest;
  events: readonly GuestEventChoice[];
  /** The ceremonies still to come, which reminders can be about. */
  upcoming: readonly GuestEventChoice[];
  coupleName: string;
  writable: boolean;
  canRemove: boolean;
  onClose: () => void;
  onEdit: () => void;
  onChanged: (message: string) => void;
  onRemoved: (message: string) => void;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<GuestDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [alert, setAlert] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<'reissue' | 'revoke' | 'remove' | null>(null);
  const confirmDialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let live = true;
    api
      .GET('/api/v1/weddings/{weddingId}/guests/{guestId}', {
        params: { path: { weddingId, guestId: listed.id } },
      })
      .then(({ data }) => {
        if (!live) return;
        if (data) setDetail(data.data);
        else setFailed(true);
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [weddingId, listed.id, attempt]);

  const guest = detail?.guest ?? listed;
  const invitations = detail?.invitations ?? listed.invitations.map((i) => ({ ...i, history: [] }));
  const link = guest.link;
  const invitedIds = new Set(invitations.map((invitation) => invitation.eventId));
  const notInvited = events.filter((event) => !invitedIds.has(event.id));
  const delivery = deliveryOf(guest);

  /** Runs one invitation action; the answer replaces the details shown. */
  async function act(
    name: string,
    run: () => Promise<{
      data?: { data: GuestDetail };
      error?: Parameters<typeof toFailure>[1];
      response: Response;
    }>,
    message: string,
  ) {
    if (busy) return;
    setBusy(name);
    setAlert(null);
    try {
      const { data, error, response } = await run();
      if (data) {
        setDetail(data.data);
        onChanged(message);
      } else {
        const failure = toFailure(response.status, error);
        setAlert(failure.message);
        if (failure.code === 'WEDDING_ARCHIVED' || failure.code === 'GUEST_NOT_FOUND') {
          router.refresh();
        }
      }
    } catch {
      setAlert(networkFailure().message);
    }
    setBusy(null);
  }

  /** The link, created first if there is none yet. */
  async function ensureLink(reissue = false): Promise<string | null> {
    const { data, error, response } = await api.POST(
      '/api/v1/weddings/{weddingId}/guests/{guestId}/invitation-links',
      {
        params: { path: { weddingId, guestId: guest.id } },
        body: reissue ? { reissue: true } : {},
      },
    );
    if (!data) {
      setAlert(toFailure(response.status, error).message);
      return null;
    }
    setDetail((current) =>
      current ? { ...current, guest: { ...current.guest, link: data.data } } : current,
    );
    return data.data.secretUrl ?? null;
  }

  async function copyLink() {
    if (busy) return;
    setBusy('copy');
    setAlert(null);
    try {
      const url = link.secretUrl ?? (writable ? await ensureLink() : null);
      if (url) {
        await navigator.clipboard.writeText(url);
        onChanged('Private link copied.');
      }
    } catch {
      setAlert('Couldn’t copy the link. Try again.');
    }
    setBusy(null);
  }

  async function shareWhatsApp() {
    if (busy) return;
    setBusy('whatsapp');
    setAlert(null);
    try {
      const url = link.secretUrl ?? (writable ? await ensureLink() : null);
      if (url) {
        // A share by hand: WhatsApp opens with the message ready; nothing is sent from here.
        window.open(
          whatsappUrl({ phone: guest.phone, guestName: guest.name, coupleName, link: url }),
          '_blank',
          'noopener,noreferrer',
        );
      }
    } catch {
      setAlert(networkFailure().message);
    }
    setBusy(null);
  }

  async function confirm() {
    const action = confirming;
    confirmDialog.current?.close();
    if (action === 'reissue') {
      setBusy('reissue');
      try {
        if (await ensureLink(true))
          onChanged('A new link was created. The old link no longer works.');
      } catch {
        setAlert(networkFailure().message);
      }
      setBusy(null);
    } else if (action === 'revoke') {
      setBusy('revoke');
      try {
        const { data, error, response } = await api.POST(
          '/api/v1/weddings/{weddingId}/guests/{guestId}/invitation-links/revoke',
          { params: { path: { weddingId, guestId: guest.id } } },
        );
        if (data) {
          setDetail((current) =>
            current ? { ...current, guest: { ...current.guest, link: data.data } } : current,
          );
          onChanged('The link was turned off. It no longer works.');
        } else setAlert(toFailure(response.status, error).message);
      } catch {
        setAlert(networkFailure().message);
      }
      setBusy(null);
    } else if (action === 'remove') {
      setBusy('remove');
      try {
        const { error, response } = await api.DELETE(
          '/api/v1/weddings/{weddingId}/guests/{guestId}',
          { params: { path: { weddingId, guestId: guest.id } } },
        );
        if (response.ok || response.status === 404) {
          onRemoved(`${guest.name} was removed from your guest list.`);
          return;
        }
        setAlert(toFailure(response.status, error).message);
      } catch {
        setAlert(networkFailure().message);
      }
      setBusy(null);
    }
  }

  function ask(action: 'reissue' | 'revoke' | 'remove') {
    setConfirming(action);
    confirmDialog.current?.showModal();
  }

  const emailState = guest.lastEmail?.state;
  const emailLine = guest.lastEmail
    ? emailState === 'queued' || emailState === 'processing'
      ? `Email queued · ${moment(guest.lastEmail.requestedAt)} · waiting to send`
      : emailState === 'failed' || emailState === 'bounced'
        ? `Email failed · ${moment(guest.lastEmail.requestedAt)}`
        : emailState === 'suppressed'
          ? 'The last email was not sent: the invitation changed before it went out.'
          : `Email sent · ${moment(guest.lastEmail.requestedAt)} (accepted by the mail server; delivery isn’t confirmed)`
    : undefined;
  const reminderState = guest.lastReminder?.state;
  const reminderLine = guest.lastReminder
    ? reminderState === 'queued' || reminderState === 'processing'
      ? `Reminder queued · ${moment(guest.lastReminder.requestedAt)} · waiting to send`
      : reminderState === 'failed' || reminderState === 'bounced'
        ? `Reminder failed · ${moment(guest.lastReminder.requestedAt)}`
        : reminderState === 'suppressed'
          ? `The last reminder (${moment(guest.lastReminder.requestedAt)}) was not sent: things changed before it went out.`
          : `Reminder sent · ${moment(guest.lastReminder.requestedAt)}`
    : undefined;
  const remindable = upcoming.filter((event) => invitedIds.has(event.id));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 pb-6">
        <section
          aria-label="Contact"
          className="flex flex-col gap-2 rounded-xl bg-surface-container-low p-4"
        >
          <p className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-secondary-container px-2.5 py-0.5 text-label-md font-semibold text-on-secondary-container">
              {people(guest.partySize)}
            </span>
            <span className="text-body-sm text-on-surface-variant">
              one invitation for the whole family
            </span>
          </p>
          <p className="flex items-center gap-2 text-body-sm text-on-surface">
            <Icon name="mail" className="size-4 text-on-surface-variant" />
            {guest.email ?? <span className="text-on-surface-variant italic">No email added</span>}
          </p>
          <p className="flex items-center gap-2 text-body-sm text-on-surface">
            <Icon name="call" className="size-4 text-on-surface-variant" />
            {guest.phone ?? <span className="text-on-surface-variant italic">No phone added</span>}
          </p>
          {guest.organizerNotes && (
            <p className="mt-1 rounded-lg bg-surface-container-lowest px-3 py-2 text-body-sm whitespace-pre-line text-on-surface">
              <span className="block text-label-sm font-semibold text-secondary uppercase">
                Private note
              </span>
              {guest.organizerNotes}
            </p>
          )}
        </section>

        {alert && (
          <FormAlert tone="error" title="That didn’t work">
            {alert}
          </FormAlert>
        )}

        <section
          aria-labelledby="guest-invitation-heading"
          className="rounded-xl border border-outline-variant p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3
              id="guest-invitation-heading"
              className="flex items-center gap-2 text-title-sm text-on-surface"
            >
              <Icon name="lock" className="size-4.5 text-secondary" />
              Private invitation
            </h3>
            <DeliveryChip delivery={delivery} />
          </div>
          <p className="mt-2 text-body-sm text-on-surface-variant">
            {link.status === 'active'
              ? 'Anyone with this private link can view and respond to this invitation. Share it only with this family.'
              : link.status === 'revoked'
                ? 'The previous link no longer works. Create a new one to share.'
                : 'No link yet. One is created when you copy, share or email it.'}
          </p>
          {link.status === 'active' && link.secretUrl && (
            <p className="mt-2 truncate rounded-md bg-surface-container-low px-3 py-2 font-mono text-body-sm text-on-surface-variant">
              {link.secretUrl.split('#')[0]}#••••••••
            </p>
          )}
          {invitations.length === 0 && (
            <p className="mt-2 text-body-sm text-on-surface-variant">
              Invite them to at least one ceremony before sharing the link.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {writable && guest.email && (
              <button
                type="button"
                disabled={busy !== null || invitations.length === 0}
                onClick={() =>
                  act(
                    'email',
                    () =>
                      api.POST('/api/v1/weddings/{weddingId}/guests/{guestId}/invitation-email', {
                        params: { path: { weddingId, guestId: guest.id } },
                      }),
                    `Invitation email queued for ${guest.email}.`,
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2.5 text-label-md font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container disabled:opacity-50"
              >
                <Icon name="forward-to-inbox" className="size-4.5" />
                {busy === 'email'
                  ? 'Queuing…'
                  : guest.lastEmail
                    ? 'Resend email'
                    : 'Send email invitation'}
              </button>
            )}
            {writable && guest.email && link.status === 'active' && !guest.remindersOff && (
              <RemindGuest
                weddingId={weddingId}
                guestId={guest.id}
                name={guest.name}
                events={remindable}
                disabled={busy !== null || remindable.length === 0}
                onSent={() => {
                  onChanged(`Reminder queued for ${guest.email ?? guest.name}.`);
                  setAttempt((n) => n + 1);
                }}
              />
            )}
            {(link.status === 'active' || writable) && (
              <button
                type="button"
                disabled={busy !== null || (invitations.length === 0 && link.status !== 'active')}
                onClick={copyLink}
                className={secondaryButton}
              >
                <Icon name="content-copy" className="size-4.5" />
                {busy === 'copy' ? 'Copying…' : 'Copy private link'}
              </button>
            )}
            {(link.status === 'active' || writable) && (
              <button
                type="button"
                disabled={busy !== null || (invitations.length === 0 && link.status !== 'active')}
                onClick={shareWhatsApp}
                className={secondaryButton}
              >
                <Icon name="call" className="size-4.5" />
                Share on WhatsApp
              </button>
            )}
          </div>
          {writable && !guest.email && (
            <p className="mt-2 text-body-sm text-on-surface-variant">
              Add an email address to send the invitation by email. You can still copy the link or
              share it on WhatsApp.
            </p>
          )}
          {emailLine && (
            <p
              className={`mt-2 flex items-center gap-1.5 text-body-sm ${
                delivery === 'email_failed' ? 'text-error' : 'text-on-surface-variant'
              }`}
            >
              {emailLine}
            </p>
          )}
          {reminderLine && (
            <p
              className={`mt-1 flex items-center gap-1.5 text-body-sm ${
                reminderState === 'failed' || reminderState === 'bounced'
                  ? 'text-error'
                  : 'text-on-surface-variant'
              }`}
            >
              <Icon name="notifications" className="size-4" />
              {reminderLine}
            </p>
          )}
          {guest.remindersOff && (
            <p className="mt-1 flex items-center gap-1.5 text-body-sm text-on-surface-variant">
              <Icon name="notifications-off" className="size-4" />
              This guest turned off reminder emails from their invitation.
            </p>
          )}
          {writable && link.status === 'active' && (
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-surface-container-high pt-3">
              <button
                type="button"
                onClick={() => ask('reissue')}
                className="text-label-md font-semibold text-error underline-offset-2 hover:underline"
              >
                Replace link
              </button>
              <button
                type="button"
                onClick={() => ask('revoke')}
                className="text-label-md font-semibold text-on-surface-variant underline-offset-2 hover:underline"
              >
                Turn off link
              </button>
            </div>
          )}
        </section>

        <section aria-labelledby="guest-ceremonies-heading">
          <div className="flex items-baseline justify-between gap-3">
            <h3 id="guest-ceremonies-heading" className={sectionLabel}>
              Invited ceremonies ({invitations.length})
            </h3>
            {writable && (
              <button
                type="button"
                onClick={onEdit}
                className="text-label-md font-semibold text-primary hover:underline"
              >
                Edit invited ceremonies
              </button>
            )}
          </div>
          {failed && !detail && (
            <p className="mt-2 text-body-sm text-on-surface-variant">
              We couldn’t load the latest answers.{' '}
              <button
                type="button"
                onClick={() => {
                  setFailed(false);
                  setAttempt((n) => n + 1);
                }}
                className="font-semibold text-primary underline"
              >
                Try again
              </button>
            </p>
          )}
          {invitations.length === 0 ? (
            <p className="mt-2 rounded-lg bg-surface-container-low px-4 py-3 text-body-sm text-on-surface-variant">
              Not invited to any ceremony yet.
            </p>
          ) : (
            <ul className="mt-2 flex flex-col gap-2">
              {invitations.map((invitation) => {
                const event = events.find((e) => e.id === invitation.eventId);
                const { status, attendingCount, respondedAt } = invitation.rsvp;
                const closed = invitation.cancelled || !invitation.available;
                return (
                  <li key={invitation.id} className="rounded-lg bg-surface-container-low px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-title-sm wrap-break-word text-on-surface">
                          {invitation.title}
                        </p>
                        <p className="text-body-sm text-on-surface-variant">
                          {closed
                            ? invitation.cancelled
                              ? 'Cancelled · RSVP closed'
                              : 'No longer available'
                            : [event?.when ?? 'Date to be announced', event?.venue]
                                .filter(Boolean)
                                .join(' · ')}
                        </p>
                      </div>
                      <RsvpChip status={status}>
                        {status === 'attending'
                          ? `Attending · ${attendingCount ?? 0} of ${guest.partySize}`
                          : status === 'maybe' && attendingCount
                            ? `Maybe · ${attendingCount} of ${guest.partySize}`
                            : undefined}
                      </RsvpChip>
                    </div>
                    {respondedAt && (
                      <p className="mt-1 text-label-sm text-on-surface-variant">
                        Replied {moment(respondedAt)}
                      </p>
                    )}
                    {invitation.history.length > 0 && (
                      <p className="mt-1 text-label-sm text-on-surface-variant">
                        Earlier:{' '}
                        {invitation.history
                          .slice(0, 3)
                          .map(
                            (change) =>
                              `${RSVP_LABELS[change.status]}${change.attendingCount ? ` ${change.attendingCount}` : ''}`,
                          )
                          .join(' → ')}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {notInvited.length > 0 && (
            <p className="mt-2 rounded-lg border border-dashed border-outline-variant px-4 py-2.5 text-body-sm text-on-surface-variant">
              Not invited: {notInvited.map((event) => event.title).join(', ')}
            </p>
          )}
        </section>
      </div>

      <div className="flex gap-3 border-t border-surface-container-highest bg-surface-container-low px-6 py-4">
        {canRemove && (
          <button
            type="button"
            onClick={() => ask('remove')}
            className="flex items-center gap-1.5 rounded-md px-3 py-3 text-label-md font-semibold text-error transition-colors hover:bg-error-container hover:text-on-error-container"
          >
            <Icon name="delete" className="size-4.5" />
            Remove
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-md bg-surface-container-lowest px-4 py-3 text-label-md font-semibold text-on-surface shadow-sm transition-colors hover:bg-surface-container"
        >
          Close
        </button>
        {writable && (
          <button
            type="button"
            onClick={onEdit}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-label-md font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container"
          >
            <Icon name="edit" className="size-4" />
            Edit guest
          </button>
        )}
      </div>

      <dialog
        ref={confirmDialog}
        aria-labelledby="guest-confirm-title"
        onClose={() => setConfirming(null)}
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl bg-surface-container-lowest p-6 text-on-surface shadow-xl backdrop:bg-on-surface/50"
      >
        <h2 id="guest-confirm-title" className="font-serif text-headline-sm text-on-surface">
          {confirming === 'reissue'
            ? 'Replace this invitation link?'
            : confirming === 'revoke'
              ? 'Turn off this invitation link?'
              : `Remove ${guest.name}?`}
        </h2>
        <p className="mt-2 text-body-md text-on-surface-variant">
          {confirming === 'reissue'
            ? 'The old link stops working immediately, including on phones where it is already open. A new link is created for you to share.'
            : confirming === 'revoke'
              ? 'The link stops working immediately, including on phones where it is already open. You can create a new one later.'
              : 'They leave your guest list and totals, and their link stops working. Their answers are kept in your records.'}
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            autoFocus
            onClick={() => confirmDialog.current?.close()}
            className="flex-1 rounded-md bg-surface-container px-4 py-2.5 text-label-md font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            className="flex-1 rounded-md bg-error px-4 py-2.5 text-label-md font-semibold text-on-error transition-colors hover:opacity-90"
          >
            {confirming === 'reissue'
              ? 'Replace link'
              : confirming === 'revoke'
                ? 'Turn off'
                : 'Remove'}
          </button>
        </div>
      </dialog>
    </div>
  );
}
