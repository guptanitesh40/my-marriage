'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { useFocusFirstProblem } from '@/components/auth/hooks';
import { FormAlert } from '@/components/forms/form-alert';
import { SubmitButton } from '@/components/forms/submit-button';
import { FieldFrame, inputClass, TextField } from '@/components/forms/text-field';
import { Icon } from '@/components/ui/icon';
import { api } from '@/lib/api/browser';
import { networkFailure, toFailure } from '@/lib/api/errors';
import type { Guest, GuestDetail } from '@/lib/guests/directory';
import { GUEST_INPUT_LIMITS, guestInputErrors } from '@/lib/guests/input';
import { tidy } from '@/lib/weddings/validation';

/** A ceremony a guest can be invited to, with when and where for the form. */
export interface GuestEventChoice {
  id: string;
  title: string;
  when?: string;
  venue?: string;
  cancelled: boolean;
}

/** Failures that mean the page is out of date: it shows the truth after a refresh. */
const STALE = new Set(['WEDDING_ARCHIVED', 'WEDDING_NOT_FOUND', 'GUEST_NOT_FOUND']);

const optional = <span className="text-label-sm text-on-surface-variant">Optional</span>;
const required = <span className="text-label-sm font-medium text-primary">* Required</span>;

/**
 * A guest contact (PRD GUEST-01, GUEST-02): one person responding for their
 * family, with one party size for every ceremony. Only the name and party
 * size are required; a guest can be invited later. Lowering the party size
 * below an answer already given is refused by the API, and the form says
 * which ceremonies (PRD GUEST-06); nothing is reduced to fit.
 */
export function GuestForm({
  weddingId,
  guest,
  events,
  onCancel,
  onSaved,
}: {
  weddingId: string;
  guest?: Guest;
  events: readonly GuestEventChoice[];
  onCancel: () => void;
  onSaved: (detail: GuestDetail) => void;
}) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const focusProblem = useFocusFirstProblem(form);
  const [partySize, setPartySize] = useState(String(guest?.partySize ?? 1));
  // Its ceremonies, including any deleted since: kept unless unticked.
  const [eventIds, setEventIds] = useState<string[]>(
    guest?.invitations.map((invitation) => invitation.eventId) ?? [],
  );
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<string | null>(null);
  const [conflict, setConflict] = useState<string[] | null>(null);

  const size = Number(partySize) || 0;
  function step(by: number) {
    setPartySize(String(Math.min(GUEST_INPUT_LIMITS.partySize, Math.max(1, size + by))));
  }
  function toggle(id: string, on: boolean) {
    setEventIds((ids) => (on ? [...ids, id] : ids.filter((other) => other !== id)));
  }

  async function submit(submitted: FormEvent<HTMLFormElement>) {
    submitted.preventDefault();
    if (pending) return;
    const values = new FormData(submitted.currentTarget);
    const text = (name: string) => String(values.get(name) ?? '');
    const input = {
      name: tidy(text('name')),
      partySize: partySize.trim(),
      email: text('email').trim(),
      phone: tidy(text('phone')),
      notes: text('organizerNotes').trim(),
    };
    const problems = guestInputErrors(input);
    setAlert(null);
    setConflict(null);
    setErrors(problems);
    if (Object.keys(problems).length > 0) return focusProblem();

    setPending(true);
    try {
      if (guest) {
        const patched = await api.PATCH('/api/v1/weddings/{weddingId}/guests/{guestId}', {
          params: { path: { weddingId, guestId: guest.id } },
          body: {
            name: input.name,
            partySize: Number(input.partySize),
            email: input.email || null,
            phone: input.phone || null,
            organizerNotes: input.notes || null,
          },
        });
        if (!patched.data) return fail(patched.response.status, patched.error);
        const before = guest.invitations.map((invitation) => invitation.eventId);
        const same =
          before.length === eventIds.length && before.every((id) => eventIds.includes(id));
        if (same) return onSaved(patched.data.data);
        const put = await api.PUT('/api/v1/weddings/{weddingId}/guests/{guestId}/invitations', {
          params: { path: { weddingId, guestId: guest.id } },
          body: { eventIds },
        });
        if (put.data) return onSaved(put.data.data);
        return fail(put.response.status, put.error);
      }
      const created = await api.POST('/api/v1/weddings/{weddingId}/guests', {
        params: { path: { weddingId } },
        body: {
          name: input.name,
          partySize: Number(input.partySize),
          ...(input.email ? { email: input.email } : {}),
          ...(input.phone ? { phone: input.phone } : {}),
          ...(input.notes ? { organizerNotes: input.notes } : {}),
          eventIds,
        },
      });
      if (created.data) return onSaved(created.data.data);
      return fail(created.response.status, created.error);
    } catch {
      setAlert(networkFailure().message);
    }
    setPending(false);
    focusProblem();
  }

  function fail(status: number, error: Parameters<typeof toFailure>[1]) {
    const failure = toFailure(status, error);
    setPending(false);
    if (failure.code === 'PARTY_SIZE_CONFLICT') {
      const lines = (error?.error.details as { messages?: string[] }[] | undefined)?.flatMap(
        (detail) => detail.messages ?? [],
      );
      setConflict(lines && lines.length > 0 ? lines : [failure.message]);
      return;
    }
    setErrors(failure.fields);
    if (Object.keys(failure.fields).length === 0) setAlert(failure.message);
    if (STALE.has(failure.code) || 'eventIds' in failure.fields) router.refresh();
    focusProblem();
  }

  // Ceremonies deleted since stay as choices while ticked, so saving keeps them.
  const choices: GuestEventChoice[] = [
    ...events,
    ...(guest?.invitations ?? [])
      .filter((invitation) => !invitation.available)
      .map((invitation) => ({
        id: invitation.eventId,
        title: `${invitation.title} (no longer available)`,
        cancelled: false,
      })),
  ];
  // "Select all" covers the ceremonies a guest can still be invited to.
  const selectable = events.filter((event) => !event.cancelled);
  const allChosen = selectable.every((event) => eventIds.includes(event.id));
  const someChosen = selectable.some((event) => eventIds.includes(event.id));
  function toggleAll(on: boolean) {
    const ids = new Set(selectable.map((event) => event.id));
    setEventIds((current) =>
      on
        ? [...current, ...selectable.map((event) => event.id).filter((id) => !current.includes(id))]
        : current.filter((id) => !ids.has(id)),
    );
  }

  return (
    <form ref={form} noValidate onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 pb-6">
        {conflict && (
          <div
            role="alert"
            className="rounded-xl border border-secondary/40 bg-secondary-container/40 p-4 text-body-sm text-on-secondary-container"
          >
            <p className="flex items-center gap-2 font-semibold text-on-surface">
              <Icon name="warning" className="size-4.5 text-secondary" />
              Some answers are for more people than {partySize}
            </p>
            <ul className="mt-1.5 list-disc pl-6">
              {conflict.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="mt-1.5">
              Ask the guest to update their RSVP first. Nothing was saved, and no answer was
              changed.
            </p>
          </div>
        )}
        {alert && (
          <FormAlert
            tone="error"
            title={guest ? 'Unable to save your changes' : 'Unable to add the guest'}
          >
            {alert}
          </FormAlert>
        )}

        <TextField
          id="guest-name"
          name="name"
          label="Primary contact name"
          labelAside={required}
          placeholder="e.g. Rajesh Sharma"
          autoComplete="off"
          autoFocus
          required
          maxLength={GUEST_INPUT_LIMITS.name}
          defaultValue={guest?.name}
          error={errors.name}
        />

        <FieldFrame
          id="guest-party-size"
          label="Number of people invited"
          labelAside={required}
          hint="Everyone this contact is responding for, including themselves."
          error={errors.partySize}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => step(-1)}
              disabled={size <= 1}
              className="flex size-11 items-center justify-center rounded-md bg-surface-container text-title-md text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-40"
            >
              <span aria-hidden="true">−</span>
              <span className="sr-only">One fewer</span>
            </button>
            <div className="w-20 shrink-0">
              <input
                id="guest-party-size"
                inputMode="numeric"
                value={partySize}
                onChange={(e) => setPartySize(e.target.value.replace(/\D/g, '').slice(0, 3))}
                aria-invalid={errors.partySize ? true : undefined}
                aria-describedby={`guest-party-size-hint${errors.partySize ? ' guest-party-size-error' : ''}`}
                className={`${inputClass} border-outline-variant text-center tabular-nums`}
              />
            </div>
            <button
              type="button"
              onClick={() => step(1)}
              disabled={size >= GUEST_INPUT_LIMITS.partySize}
              className="flex size-11 items-center justify-center rounded-md bg-surface-container text-title-md text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-40"
            >
              <span aria-hidden="true">+</span>
              <span className="sr-only">One more</span>
            </button>
            <span className="text-body-sm text-on-surface-variant">
              {size === 1 ? 'person' : 'people'}
            </span>
          </div>
        </FieldFrame>

        <TextField
          id="guest-email"
          name="email"
          type="email"
          inputMode="email"
          label="Email"
          labelAside={optional}
          hint="Used to send the invitation by email."
          placeholder="e.g. rajesh@example.com"
          autoComplete="off"
          maxLength={GUEST_INPUT_LIMITS.email}
          defaultValue={guest?.email}
          error={errors.email}
        />
        <TextField
          id="guest-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          label="Phone / WhatsApp number"
          labelAside={optional}
          placeholder="+91 98200 00000"
          autoComplete="off"
          maxLength={GUEST_INPUT_LIMITS.phone}
          defaultValue={guest?.phone}
          error={errors.phone}
        />
        <FieldFrame
          id="guest-notes"
          label="Private notes"
          labelAside={
            <span className="text-label-sm text-on-surface-variant">
              Optional · organizers only
            </span>
          }
          error={errors.organizerNotes}
        >
          <textarea
            id="guest-notes"
            name="organizerNotes"
            rows={2}
            maxLength={GUEST_INPUT_LIMITS.notes}
            defaultValue={guest?.organizerNotes}
            placeholder="e.g. Needs a ground-floor room"
            aria-invalid={errors.organizerNotes ? true : undefined}
            className={`${inputClass} border-outline-variant`}
          />
        </FieldFrame>

        <fieldset aria-describedby={errors.eventIds ? 'guest-events-error' : undefined}>
          <legend className="mb-1.5 flex w-full items-baseline justify-between gap-3 text-label-md font-semibold text-on-surface">
            Invite to ceremonies
            <span className="text-label-sm font-normal text-on-surface-variant">
              Optional · can be chosen later
            </span>
          </legend>
          {choices.length === 0 ? (
            <p className="rounded-lg bg-surface-container-low px-4 py-3 text-body-sm text-on-surface-variant">
              No ceremonies yet. Add them on the Events page, then invite guests to them.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {selectable.length > 1 && (
                <li>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3.5 py-2 text-title-sm text-on-surface hover:bg-surface-container-low">
                    <input
                      type="checkbox"
                      checked={allChosen}
                      ref={(input) => {
                        if (input) input.indeterminate = someChosen && !allChosen;
                      }}
                      onChange={(e) => toggleAll(e.target.checked)}
                      className="size-4.5 shrink-0 accent-primary"
                    />
                    Select all ceremonies
                    <span className="ml-auto text-label-sm font-normal text-on-surface-variant tabular-nums">
                      {selectable.filter((event) => eventIds.includes(event.id)).length} of{' '}
                      {selectable.length}
                    </span>
                  </label>
                </li>
              )}
              {choices.map((event) => {
                const checked = eventIds.includes(event.id);
                const where = event.venue;
                const when = event.when ?? 'Date to be announced';
                return (
                  <li key={event.id}>
                    <label
                      className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-lg border px-3.5 py-2.5 transition-colors ${
                        checked
                          ? 'border-primary bg-primary-fixed/30'
                          : 'border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => toggle(event.id, e.target.checked)}
                        className="mt-1 size-4.5 shrink-0 accent-primary"
                      />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-title-sm wrap-break-word text-on-surface">
                          {event.title}
                          {event.cancelled && (
                            <span className="ml-2 text-label-sm text-error">Cancelled</span>
                          )}
                        </span>
                        <span className="text-body-sm text-on-surface-variant">
                          {when} · {where ?? 'Venue to be announced'}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          {errors.eventIds && (
            <p id="guest-events-error" className="mt-1.5 text-body-sm text-error">
              {errors.eventIds}
            </p>
          )}
        </fieldset>
      </div>

      <div className="flex gap-3 border-t border-surface-container-highest bg-surface-container-low px-6 py-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-md bg-surface-container-lowest px-4 py-3 text-label-md font-semibold text-on-surface shadow-sm transition-colors hover:bg-surface-container"
        >
          Cancel
        </button>
        <div className="flex-1">
          <SubmitButton pending={pending} pendingLabel="Saving…">
            {guest ? 'Save changes' : 'Add guest'}
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
