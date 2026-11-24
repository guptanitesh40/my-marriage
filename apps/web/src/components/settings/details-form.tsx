'use client';

import type { components } from '@my-marriage/contracts';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useFocusFirstProblem } from '@/components/auth/hooks';
import { FormAlert } from '@/components/forms/form-alert';
import { SelectField } from '@/components/forms/select-field';
import { describedBy, FieldFrame, inputClass, TextField } from '@/components/forms/text-field';
import { Icon } from '@/components/ui/icon';
import { OUTLINE_BUTTON } from '@/components/ui/sheet';
import { api } from '@/lib/api/browser';
import { networkFailure, toFailure, waitMessage } from '@/lib/api/errors';
import type { FieldErrors } from '@/lib/auth/validation';
import { eventsPath, websitePath } from '@/lib/routes';
import {
  DETAILS_LIMITS,
  detailsBody,
  detailsErrors,
  displayTitle,
  tidyParagraphs,
  type DetailsInput,
} from '@/lib/weddings/details';
import { WEDDING_STATES } from '@/lib/weddings/states';
import { tidy, todayInIndia, WEDDING_LIMITS } from '@/lib/weddings/validation';

type Wedding = components['schemas']['WeddingDto'];

const LEAVE_WARNING = 'You have unsaved changes. Leave without saving them?';
const DESCRIPTION_HINT =
  'A few lines about your celebration, for your team. It isn’t shown on the website.';

function Required() {
  return <span className="text-label-sm font-medium text-primary">* Required</span>;
}

function Optional() {
  return <span className="text-label-sm text-on-surface-variant">Optional</span>;
}

/**
 * General information (Stitch "Wedding Settings", PRD WED-04): the
 * couple's names, place, date, main venue and a short description, saved
 * together. What was typed stays after a failed save, and leaving with
 * unsaved changes asks first. `readOnly` once archived or waiting for
 * deletion: the API refuses changes then, so the form is not offered.
 */
export function DetailsForm({
  wedding,
  readOnly,
  coverUrl,
}: {
  wedding: Wedding;
  readOnly: boolean;
  /** The website's cover photo, the wedding's one cover (decision 0021). */
  coverUrl?: string;
}) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const focusProblem = useFocusFirstProblem(form);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [alert, setAlert] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [names, setNames] = useState({
    brideName: wedding.brideName,
    groomName: wedding.groomName,
  });
  const [descriptionLength, setDescriptionLength] = useState(
    [...(wedding.description ?? '')].length,
  );
  const [mapsUrl, setMapsUrl] = useState(wedding.mainVenue?.mapsUrl ?? '');

  // Unsaved changes: ask before closing the tab, or following a link away.
  useEffect(() => {
    if (!dirty) return;
    function beforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    function linkClick(event: MouseEvent) {
      const link = (event.target as Element | null)?.closest('a[href]');
      if (!link || link.getAttribute('target') === '_blank') return;
      if (!window.confirm(LEAVE_WARNING)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', linkClick, true);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('click', linkClick, true);
    };
  }, [dirty]);

  function changed(event: FormEvent<HTMLFormElement>) {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    setDirty(true);
    setSaved(false);
    if (target.name === 'brideName' || target.name === 'groomName') {
      setNames((current) => ({ ...current, [target.name]: target.value }));
    }
    if (target.name === 'description') setDescriptionLength([...target.value].length);
    if (target.name === 'mapsUrl') setMapsUrl(target.value.trim());
  }

  function discard() {
    form.current?.reset();
    setNames({ brideName: wedding.brideName, groomName: wedding.groomName });
    setDescriptionLength([...(wedding.description ?? '')].length);
    setMapsUrl(wedding.mainVenue?.mapsUrl ?? '');
    setErrors({});
    setAlert(null);
    setDirty(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || readOnly) return;
    const values = new FormData(event.currentTarget);
    const text = (name: string) => tidy(String(values.get(name) ?? ''));
    const input: DetailsInput = {
      brideName: text('brideName'),
      groomName: text('groomName'),
      city: text('city'),
      state: text('state'),
      weddingDate: text('weddingDate'),
      venueName: text('venueName'),
      venueAddress: text('venueAddress'),
      mapsUrl: text('mapsUrl'),
      description: tidyParagraphs(String(values.get('description') ?? '')),
    };
    const problems = detailsErrors(input, wedding.weddingDate);
    setAlert(null);
    setErrors(problems);
    if (Object.keys(problems).length > 0) return focusProblem();

    setPending(true);
    try {
      const { data, error, response } = await api.PATCH('/api/v1/weddings/{weddingId}', {
        params: { path: { weddingId: wedding.id } },
        body: detailsBody(input),
      });
      if (data) {
        setDirty(false);
        setSaved(true);
        setPending(false);
        // The names in the top bar and "Last saved by" come from the server.
        router.refresh();
        return;
      }
      const failure = toFailure(response.status, error);
      setErrors(failure.fields);
      if (Object.keys(failure.fields).length === 0) {
        setAlert(failure.code === 'RATE_LIMITED' ? waitMessage(failure) : failure.message);
      }
      // Archived or deletion requested meanwhile: show the page as it is now.
      if (response.status === 409) router.refresh();
    } catch {
      setAlert(networkFailure().message);
    }
    setPending(false);
    focusProblem();
  }

  const venue = wedding.mainVenue;
  return (
    <form
      ref={form}
      noValidate
      onSubmit={submit}
      onInput={changed}
      aria-label="General information"
      className="flex flex-col"
    >
      <fieldset disabled={readOnly} className="flex min-w-0 flex-col gap-6 p-5 sm:p-8">
        {alert && (
          <FormAlert tone="error" title="Unable to save your changes">
            {alert}
          </FormAlert>
        )}

        <div className="flex items-center gap-4 rounded-xl bg-surface-container-low p-4 sm:p-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-container-lowest text-secondary">
            <Icon name="auto-awesome" className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-label-sm font-semibold tracking-wider text-secondary uppercase">
              Wedding title
            </p>
            <p
              className="font-serif text-headline-sm wrap-break-word text-on-surface"
              aria-live="polite"
            >
              {displayTitle(names)}
            </p>
          </div>
          <span className="hidden shrink-0 rounded-sm bg-surface-container-high px-2 py-1 text-label-sm text-on-surface-variant sm:inline">
            From the couple’s names
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-x-6">
          <TextField
            id="brideName"
            name="brideName"
            label="Bride’s name"
            labelAside={<Required />}
            autoComplete="off"
            required
            maxLength={WEDDING_LIMITS.brideName}
            defaultValue={wedding.brideName}
            error={errors.brideName}
          />
          <TextField
            id="groomName"
            name="groomName"
            label="Groom’s name"
            labelAside={<Required />}
            autoComplete="off"
            required
            maxLength={WEDDING_LIMITS.groomName}
            defaultValue={wedding.groomName}
            error={errors.groomName}
          />
          <TextField
            id="city"
            name="city"
            label="City"
            labelAside={<Required />}
            autoComplete="address-level2"
            trailingIcon="location-on"
            required
            maxLength={WEDDING_LIMITS.city}
            defaultValue={wedding.city}
            error={errors.city}
          />
          <SelectField
            id="state"
            name="state"
            label="State"
            labelAside={<Required />}
            placeholder="Choose a state"
            options={
              (WEDDING_STATES as readonly string[]).includes(wedding.state)
                ? WEDDING_STATES
                : [...WEDDING_STATES, wedding.state]
            }
            required
            defaultValue={wedding.state}
            error={errors.state}
          />
          <TextField
            id="weddingDate"
            name="weddingDate"
            type="date"
            label="Main wedding date"
            labelAside={<Optional />}
            hint="Ceremonies like Haldi or Sangeet keep their own dates in Events."
            min={
              wedding.weddingDate && wedding.weddingDate < todayInIndia()
                ? undefined
                : todayInIndia()
            }
            max="2100-12-31"
            defaultValue={wedding.weddingDate}
            error={errors.weddingDate}
          />
          <TextField
            id="venueName"
            name="venueName"
            label="Main venue"
            labelAside={<Optional />}
            placeholder="e.g. Rambagh Palace"
            autoComplete="off"
            maxLength={DETAILS_LIMITS.venueName}
            defaultValue={venue?.name}
            error={errors['mainVenue.name'] ?? errors.mainVenue}
          />
        </div>

        <TextField
          id="venueAddress"
          name="venueAddress"
          label="Venue address"
          labelAside={<Optional />}
          placeholder="e.g. Bhawani Singh Road, Jaipur"
          autoComplete="off"
          maxLength={DETAILS_LIMITS.venueAddress}
          defaultValue={venue?.address}
          error={errors['mainVenue.address']}
        />

        <TextField
          id="mapsUrl"
          name="mapsUrl"
          type="url"
          inputMode="url"
          label="Google Maps link"
          labelAside={
            mapsUrl && !errors['mainVenue.mapsUrl'] && /^https:\/\//i.test(mapsUrl) ? (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-label-sm font-semibold text-primary hover:underline"
              >
                Test link
                <Icon name="open-in-new" className="size-3.5" />
              </a>
            ) : (
              <Optional />
            )
          }
          placeholder="https://maps.app.goo.gl/…"
          autoComplete="off"
          hint="Paste the Share link from Google Maps."
          defaultValue={venue?.mapsUrl}
          error={errors['mainVenue.mapsUrl']}
        />

        <FieldFrame
          id="description"
          label="Description"
          labelAside={
            <span
              className={`text-label-sm ${descriptionLength > DETAILS_LIMITS.description ? 'text-error' : 'text-on-surface-variant'}`}
            >
              {descriptionLength} / {DETAILS_LIMITS.description}
            </span>
          }
          hint={DESCRIPTION_HINT}
          error={errors.description}
        >
          <textarea
            id="description"
            name="description"
            rows={4}
            defaultValue={wedding.description}
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={describedBy({
              id: 'description',
              label: 'Description',
              hint: DESCRIPTION_HINT,
              error: errors.description,
            })}
            className={`${inputClass} resize-y border-outline-variant`}
          />
        </FieldFrame>

        <div>
          <p className="mb-1.5 text-label-md font-semibold text-on-surface">Cover photo</p>
          <div className="flex flex-col gap-4 rounded-xl bg-surface-container-low p-4 sm:flex-row sm:items-center">
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- served by our API, already sized
              <img
                src={coverUrl}
                alt="The wedding’s cover photo"
                className="aspect-video w-full rounded-lg object-cover sm:w-36"
              />
            ) : (
              <span className="flex aspect-video w-full items-center justify-center rounded-lg bg-surface-container text-on-surface-variant sm:w-36">
                <Icon name="image" className="size-8" />
              </span>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="text-title-sm text-on-surface">
                {coverUrl ? 'Your website’s cover photo' : 'No cover photo yet'}
              </p>
              <p className="text-body-sm text-on-surface-variant">
                One cover for your wedding: the one on your website
                {readOnly ? '.' : '. Choose it in the website builder.'}
              </p>
            </div>
            {!readOnly && (
              <Link href={websitePath(wedding.id)} className={`${OUTLINE_BUTTON} shrink-0`}>
                <Icon name="image" className="size-5" />
                {coverUrl ? 'Change cover' : 'Add a cover'}
              </Link>
            )}
          </div>
        </div>

        <p className="text-body-sm text-on-surface-variant">
          Times and places of each ceremony live in{' '}
          <Link
            href={eventsPath(wedding.id)}
            className="font-semibold text-primary hover:underline"
          >
            Events
          </Link>
          .
        </p>
      </fieldset>

      {!readOnly && (
        // One row even on a phone, so it never covers much of the form.
        <div className="sticky bottom-0 z-10 flex items-center justify-between gap-2 rounded-b-2xl border-t border-outline-variant/40 bg-surface-container-lowest/95 px-4 py-3 backdrop-blur sm:gap-3 sm:px-8 sm:py-4">
          <p
            role="status"
            className="flex min-w-0 items-center gap-2 text-body-sm text-on-surface-variant"
          >
            <Icon
              name={dirty ? 'edit' : 'cloud-done'}
              className={`size-4.5 shrink-0 ${dirty ? 'text-secondary' : 'text-primary'}`}
            />
            <span className="min-w-0">
              {dirty ? 'Unsaved changes' : saved ? 'Changes saved' : 'All saved'}
            </span>
          </p>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={discard}
              disabled={!dirty || pending}
              className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md bg-surface-container px-3 text-label-md font-semibold text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-60 sm:px-5"
            >
              <Icon name="undo" className="size-5 sm:hidden" label="Discard" />
              <span className="hidden sm:inline">Discard</span>
            </button>
            <button
              type="submit"
              disabled={pending}
              aria-busy={pending || undefined}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-label-md font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container disabled:opacity-60 sm:px-5"
            >
              <Icon name="done" className="size-5" />
              {pending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
