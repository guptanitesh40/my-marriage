'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useFocusFirstProblem } from '@/components/auth/hooks';
import { FieldFrame, inputClass, TextField } from '@/components/forms/text-field';
import { FormAlert } from '@/components/forms/form-alert';
import { SubmitButton } from '@/components/forms/submit-button';
import { api } from '@/lib/api/browser';
import { networkFailure, toFailure } from '@/lib/api/errors';
import { EVENT_INPUT_LIMITS, eventInputErrors, timeZoneChoices } from '@/lib/events/input';
import { zonePlace } from '@/lib/events/format';
import { EVENT_PRESETS } from '@/lib/events/presets';
import { tidy, todayInIndia } from '@/lib/weddings/validation';
import { useRouter } from 'next/navigation';
import type { components } from '@my-marriage/contracts';

type WeddingEvent = components['schemas']['EventDto'];
type EventState = WeddingEvent['state'];

const INDIA = 'Asia/Kolkata';
const CUSTOM = 'custom';

const STATES: { value: EventState; label: string }[] = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

/** Failures that mean the page is out of date: it shows the truth after a refresh. */
const STALE = new Set(['WEDDING_ARCHIVED', 'WEDDING_NOT_FOUND', 'EVENT_NOT_FOUND']);

function Mark({ required }: { required?: boolean }) {
  return required ? (
    <span className="text-label-sm font-medium text-primary">* Required</span>
  ) : (
    <span className="text-label-sm text-on-surface-variant">Optional</span>
  );
}

/**
 * A ceremony's fields (PRD EVT-01, EVT-02, EVT-06): empty for a new one,
 * or filled in from `event` to change it. Only the name is required. A
 * preset fills in the name, which stays editable; "Custom" starts from an
 * empty one. The day and time are as clocks show them where the ceremony
 * happens; the API works out the rest and has the last word on every rule.
 */
export function EventForm({
  weddingId,
  event,
  onCancel,
  onSaved,
}: {
  weddingId: string;
  /** The ceremony being changed; a new one when left out. */
  event?: WeddingEvent;
  onCancel: () => void;
  onSaved: (title: string) => void;
}) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const focusProblem = useFocusFirstProblem(form);
  const [preset, setPreset] = useState<string>(
    EVENT_PRESETS.some((p) => p.name === event?.title) ? (event?.title ?? '') : '',
  );
  const [title, setTitle] = useState(event?.title ?? '');
  const [startDate, setStartDate] = useState(event?.startDate ?? '');
  const [timeZone, setTimeZone] = useState(event?.timeZone ?? INDIA);
  const [state, setState] = useState<EventState>(event?.state ?? 'scheduled');
  const today = todayInIndia();
  // A day that has passed may be kept; only a new day must be today or later.
  const minDate = event?.startDate && event.startDate < today ? event.startDate : today;
  const [choosingZone, setChoosingZone] = useState(false);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<string | null>(null);

  function choosePreset(value: string) {
    setPreset(value);
    if (value === CUSTOM) {
      // Keep a name already typed; clear one that only came from a preset.
      if (EVENT_PRESETS.some((p) => p.name === title)) setTitle('');
      titleInput.current?.focus();
    } else {
      setTitle(value);
    }
  }

  /** The request that saves the form: everything for an edit, so cleared fields are removed. */
  function send(input: {
    title: string;
    description: string;
    startDate: string;
    startTime: string;
    venueName: string;
    venueAddress: string;
  }) {
    const venue = {
      ...(input.venueName ? { name: input.venueName } : {}),
      ...(input.venueAddress ? { address: input.venueAddress } : {}),
    };
    const hasVenue = Object.keys(venue).length > 0;
    const startTime = input.startDate && input.startTime ? input.startTime : '';
    if (event) {
      return api.PATCH('/api/v1/weddings/{weddingId}/events/{eventId}', {
        params: { path: { weddingId, eventId: event.id } },
        body: {
          title: input.title,
          description: input.description || null,
          startDate: input.startDate || null,
          startTime: startTime || null,
          timeZone,
          venue: hasVenue ? venue : null,
          state,
        },
      });
    }
    return api.POST('/api/v1/weddings/{weddingId}/events', {
      params: { path: { weddingId } },
      body: {
        title: input.title,
        ...(input.description ? { description: input.description } : {}),
        ...(input.startDate ? { startDate: input.startDate } : {}),
        ...(startTime ? { startTime } : {}),
        timeZone,
        ...(hasVenue ? { venue } : {}),
      },
    });
  }

  async function submit(submitted: FormEvent<HTMLFormElement>) {
    submitted.preventDefault();
    if (pending) return;
    const values = new FormData(submitted.currentTarget);
    const text = (name: string) => tidy(String(values.get(name) ?? ''));
    const description = String(values.get('description') ?? '').trim();
    const input = {
      title: tidy(title),
      startDate,
      startTime: text('startTime'),
      venueName: text('venueName'),
      venueAddress: text('venueAddress'),
      description,
    };
    const problems = eventInputErrors(input);
    setAlert(null);
    setErrors(problems);
    if (Object.keys(problems).length > 0) return focusProblem();

    setPending(true);
    try {
      const { data, error, response } = await send(input);
      if (data) {
        onSaved(data.data.title);
        return;
      }
      const failure = toFailure(response.status, error);
      setErrors(failure.fields);
      if (Object.keys(failure.fields).length === 0) setAlert(failure.message);
      if (STALE.has(failure.code)) router.refresh();
    } catch {
      setAlert(networkFailure().message);
    }
    setPending(false);
    focusProblem();
  }

  return (
    <form ref={form} noValidate onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 pb-6">
        {alert && (
          <FormAlert
            tone="error"
            title={event ? 'Unable to save your changes' : 'Unable to add the ceremony'}
          >
            {alert}
          </FormAlert>
        )}

        <fieldset>
          <legend className="mb-2 text-label-md font-semibold text-on-surface">Ceremony</legend>
          <div className="flex flex-wrap gap-2">
            {[...EVENT_PRESETS.map((p) => p.name), CUSTOM].map((value) => (
              <label key={value} className="cursor-pointer">
                <input
                  type="radio"
                  name="preset"
                  value={value}
                  checked={preset === value}
                  onChange={() => choosePreset(value)}
                  className="peer sr-only"
                />
                <span className="inline-flex rounded-md bg-surface-container px-3 py-1.5 text-label-md text-on-surface transition-colors peer-checked:bg-secondary-container peer-checked:text-on-secondary-container peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary-container hover:bg-surface-container-high">
                  {value === CUSTOM ? 'Custom +' : value}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <TextField
          ref={titleInput}
          id="event-title"
          name="title"
          label="Name"
          labelAside={<Mark required />}
          placeholder="e.g. Sangeet & Cocktail"
          autoComplete="off"
          autoFocus
          required
          maxLength={EVENT_INPUT_LIMITS.title}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={errors.title}
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-4">
          <TextField
            id="event-date"
            name="startDate"
            type="date"
            label="Date"
            labelAside={<Mark />}
            min={minDate}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            error={errors.startDate}
          />
          <TextField
            id="event-time"
            name="startTime"
            type="time"
            label="Start time"
            labelAside={<Mark />}
            disabled={!startDate}
            defaultValue={event?.startTime}
            hint={startDate ? undefined : 'Choose the day first.'}
            error={errors.startTime}
          />
        </div>

        <FieldFrame
          id="event-time-zone"
          label="Time zone"
          error={errors.timeZone}
          labelAside={
            !choosingZone && (
              <button
                type="button"
                onClick={() => setChoosingZone(true)}
                className="rounded-sm text-label-md font-semibold text-primary underline-offset-4 hover:underline"
              >
                Change
              </button>
            )
          }
        >
          {choosingZone ? (
            <select
              id="event-time-zone"
              value={timeZone}
              onChange={(e) => setTimeZone(e.target.value)}
              aria-invalid={errors.timeZone ? true : undefined}
              className={`${inputClass} cursor-pointer border-outline-variant`}
            >
              {timeZoneChoices().map((zone) => (
                <option key={zone} value={zone}>
                  {zone === INDIA ? 'India (Asia/Kolkata)' : `${zonePlace(zone)} (${zone})`}
                </option>
              ))}
            </select>
          ) : (
            <p id="event-time-zone" className="text-body-md text-on-surface">
              {timeZone === INDIA ? 'India time (Asia/Kolkata)' : `${zonePlace(timeZone)} time`}
            </p>
          )}
        </FieldFrame>

        {event && (
          <FieldFrame id="event-state" label="Status" error={errors.state}>
            <select
              id="event-state"
              value={state}
              onChange={(e) => setState(e.target.value as EventState)}
              aria-invalid={errors.state ? true : undefined}
              className={`${inputClass} cursor-pointer border-outline-variant`}
            >
              {STATES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FieldFrame>
        )}

        <TextField
          id="event-venue-name"
          name="venueName"
          label="Venue"
          labelAside={<Mark />}
          placeholder="e.g. Rambagh Palace"
          autoComplete="off"
          trailingIcon="location-on"
          maxLength={EVENT_INPUT_LIMITS.venueName}
          defaultValue={event?.venue?.name}
          error={errors['venue.name'] ?? errors.venue}
        />
        <TextField
          id="event-venue-address"
          name="venueAddress"
          label="Address"
          labelAside={<Mark />}
          placeholder="e.g. Bhawani Singh Road, Jaipur"
          autoComplete="off"
          maxLength={EVENT_INPUT_LIMITS.venueAddress}
          defaultValue={event?.venue?.address}
          error={errors['venue.address']}
        />

        <FieldFrame
          id="event-description"
          label="Description"
          labelAside={<Mark />}
          hint="Guests may see this on your wedding website once it’s published."
          error={errors.description}
        >
          <textarea
            id="event-description"
            name="description"
            rows={3}
            maxLength={EVENT_INPUT_LIMITS.description}
            defaultValue={event?.description}
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={`event-description-hint${errors.description ? ' event-description-error' : ''}`}
            className={`${inputClass} border-outline-variant`}
          />
        </FieldFrame>
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
            {event ? 'Save changes' : 'Save ceremony'}
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
