'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { useFocusFirstProblem } from '@/components/auth/hooks';
import { FormAlert } from '@/components/forms/form-alert';
import { SelectField } from '@/components/forms/select-field';
import { SubmitButton } from '@/components/forms/submit-button';
import { FieldFrame, inputClass, TextField } from '@/components/forms/text-field';
import { Icon } from '@/components/ui/icon';
import { api } from '@/lib/api/browser';
import { networkFailure, toFailure } from '@/lib/api/errors';
import { VENDOR_CATEGORIES, type Vendor } from '@/lib/vendors/directory';
import { VENDOR_INPUT_LIMITS, vendorInputErrors, type VendorInput } from '@/lib/vendors/input';
import { tidy } from '@/lib/weddings/validation';

/** A ceremony a vendor can be linked to, with when it happens for the details. */
export interface VendorEventChoice {
  id: string;
  title: string;
  /** "Sat, 18 Feb 2031 · 10:00 am"; missing while the day is not decided. */
  when?: string;
}

const OTHER = 'Other';

/** Failures that mean the page is out of date: it shows the truth after a refresh. */
const STALE = new Set(['WEDDING_ARCHIVED', 'WEDDING_NOT_FOUND', 'VENDOR_NOT_FOUND']);

const groupLabel = 'text-label-sm font-semibold tracking-wider text-on-surface-variant uppercase';

/** Whether the category is one offered in the list, or the vendor's own. */
function isListed(category: string): boolean {
  return (VENDOR_CATEGORIES as readonly string[]).includes(category);
}

/**
 * A vendor's fields (PRD VEND-01, VEND-02), grouped as in the Stitch
 * drawer: business details, contact information, ceremonies, notes. Only
 * the name and category are required. Empty for a new vendor, or filled
 * in from `vendor` to change it; on a change, emptied fields are removed
 * and the chosen ceremonies replace the old ones.
 */
export function VendorForm({
  weddingId,
  vendor,
  events,
  onCancel,
  onSaved,
}: {
  weddingId: string;
  vendor?: Vendor;
  events: readonly VendorEventChoice[];
  onCancel: () => void;
  onSaved: (vendor: Vendor) => void;
}) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const focusProblem = useFocusFirstProblem(form);
  const stored = vendor?.category ?? '';
  const [choice, setChoice] = useState(stored === '' || isListed(stored) ? stored : OTHER);
  // The vendor's ceremonies that are still the wedding's, as checked boxes.
  const [eventIds, setEventIds] = useState<string[]>(
    vendor?.events.map((event) => event.id).filter((id) => events.some((e) => e.id === id)) ?? [],
  );
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<string | null>(null);

  function toggle(id: string, on: boolean) {
    setEventIds((ids) => (on ? [...ids, id] : ids.filter((other) => other !== id)));
  }

  function send(input: VendorInput) {
    if (vendor) {
      return api.PATCH('/api/v1/weddings/{weddingId}/vendors/{vendorId}', {
        params: { path: { weddingId, vendorId: vendor.id } },
        body: {
          name: input.name,
          category: input.category,
          contactName: input.contactName || null,
          phone: input.phone || null,
          email: input.email || null,
          address: input.address || null,
          notes: input.notes || null,
          eventIds,
        },
      });
    }
    return api.POST('/api/v1/weddings/{weddingId}/vendors', {
      params: { path: { weddingId } },
      body: {
        name: input.name,
        category: input.category,
        ...(input.contactName ? { contactName: input.contactName } : {}),
        ...(input.phone ? { phone: input.phone } : {}),
        ...(input.email ? { email: input.email } : {}),
        ...(input.address ? { address: input.address } : {}),
        ...(input.notes ? { notes: input.notes } : {}),
        eventIds,
      },
    });
  }

  async function submit(submitted: FormEvent<HTMLFormElement>) {
    submitted.preventDefault();
    if (pending) return;
    const values = new FormData(submitted.currentTarget);
    const text = (name: string) => String(values.get(name) ?? '');
    const input: VendorInput = {
      name: tidy(text('name')),
      // "Other" with no name of its own is stored as Other.
      category: choice === OTHER ? tidy(text('customCategory')) || OTHER : choice,
      contactName: tidy(text('contactName')),
      phone: tidy(text('phone')),
      email: text('email').trim(),
      address: text('address').trim(),
      notes: text('notes').trim(),
    };
    const problems = vendorInputErrors(input);
    setAlert(null);
    setErrors(problems);
    if (Object.keys(problems).length > 0) return focusProblem();

    setPending(true);
    try {
      const { data, error, response } = await send(input);
      if (data) {
        onSaved(data.data);
        return;
      }
      const failure = toFailure(response.status, error);
      setErrors(failure.fields);
      if (Object.keys(failure.fields).length === 0) setAlert(failure.message);
      if (STALE.has(failure.code) || 'eventIds' in failure.fields) router.refresh();
    } catch {
      setAlert(networkFailure().message);
    }
    setPending(false);
    focusProblem();
  }

  return (
    <form ref={form} noValidate onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto px-6 pb-6">
        {alert && (
          <FormAlert
            tone="error"
            title={vendor ? 'Unable to save your changes' : 'Unable to add the vendor'}
          >
            {alert}
          </FormAlert>
        )}

        <fieldset className="flex flex-col gap-4">
          <legend className={`${groupLabel} mb-3`}>1. Business details</legend>
          <TextField
            id="vendor-name"
            name="name"
            label="Vendor / business name"
            labelAside={<span className="text-label-sm font-medium text-primary">* Required</span>}
            placeholder="e.g. The Marigold Studio"
            autoComplete="off"
            autoFocus
            required
            maxLength={VENDOR_INPUT_LIMITS.name}
            defaultValue={vendor?.name}
            error={errors.name}
          />
          <SelectField
            id="vendor-category"
            name="category"
            label="Service category"
            labelAside={<span className="text-label-sm font-medium text-primary">* Required</span>}
            placeholder="Select a service category"
            required
            options={[...VENDOR_CATEGORIES, OTHER]}
            value={choice}
            onChange={(e) => setChoice(e.target.value)}
            error={choice === OTHER ? undefined : errors.category}
          />
          {choice === OTHER && (
            <TextField
              id="vendor-custom-category"
              name="customCategory"
              label="Category name (optional)"
              placeholder="e.g. Tent & Lights"
              autoComplete="off"
              maxLength={VENDOR_INPUT_LIMITS.category}
              defaultValue={isListed(stored) ? '' : stored === OTHER ? '' : stored}
              hint="Left empty, it is saved as Other."
              error={errors.category}
            />
          )}
          <TextField
            id="vendor-contact-name"
            name="contactName"
            label="Contact person (optional)"
            placeholder="e.g. Rohan Shah"
            autoComplete="off"
            maxLength={VENDOR_INPUT_LIMITS.contactName}
            defaultValue={vendor?.contactName}
            error={errors.contactName}
          />
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className={`${groupLabel} mb-3`}>2. Contact information</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              id="vendor-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              label="Phone number"
              placeholder="+91 98200 00000"
              autoComplete="off"
              maxLength={VENDOR_INPUT_LIMITS.phone}
              defaultValue={vendor?.phone}
              error={errors.phone}
            />
            <TextField
              id="vendor-email"
              name="email"
              type="email"
              inputMode="email"
              label="Email address"
              placeholder="contact@vendor.in"
              autoComplete="off"
              maxLength={VENDOR_INPUT_LIMITS.email}
              defaultValue={vendor?.email}
              error={errors.email}
            />
          </div>
          <FieldFrame id="vendor-address" label="Studio / office address" error={errors.address}>
            <textarea
              id="vendor-address"
              name="address"
              rows={2}
              maxLength={VENDOR_INPUT_LIMITS.address}
              defaultValue={vendor?.address}
              placeholder="Suite, locality, city…"
              aria-invalid={errors.address ? true : undefined}
              aria-describedby={errors.address ? 'vendor-address-error' : undefined}
              className={`${inputClass} border-outline-variant`}
            />
          </FieldFrame>
        </fieldset>

        <fieldset aria-describedby={errors.eventIds ? 'vendor-events-error' : undefined}>
          <legend className="sr-only">3. Associated ceremonies</legend>
          <div aria-hidden="true" className="mb-3 flex items-baseline justify-between gap-3">
            <span className={groupLabel}>3. Associated ceremonies</span>
            {events.length > 0 && (
              <span className="text-label-sm font-medium text-secondary">
                Select all that apply
              </span>
            )}
          </div>
          {events.length === 0 ? (
            <p className="rounded-lg bg-surface-container-low px-4 py-3 text-body-sm text-on-surface-variant">
              No ceremonies yet. Add them on the Events page, then link this vendor to them.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {events.map((event) => {
                const checked = eventIds.includes(event.id);
                return (
                  <label key={event.id} className="cursor-pointer">
                    <input
                      type="checkbox"
                      name="eventIds"
                      value={event.id}
                      checked={checked}
                      onChange={(e) => toggle(event.id, e.target.checked)}
                      className="peer sr-only"
                    />
                    <span
                      className={`flex min-h-9 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-label-md font-semibold transition-all peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary-container ${
                        checked
                          ? 'bg-primary text-on-primary shadow-xs'
                          : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      <Icon name={checked ? 'check' : 'add'} className="size-4" />
                      {event.title}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
          {errors.eventIds && (
            <p id="vendor-events-error" className="mt-2 text-body-sm text-error">
              {errors.eventIds}
            </p>
          )}
        </fieldset>

        <FieldFrame
          id="vendor-notes"
          label="Private organizer notes"
          hint="Only your wedding’s owners and managers can see these."
          error={errors.notes}
        >
          <textarea
            id="vendor-notes"
            name="notes"
            rows={4}
            maxLength={VENDOR_INPUT_LIMITS.notes}
            defaultValue={vendor?.notes}
            placeholder="Packages discussed, advance paid, timings, shoot schedules…"
            aria-invalid={errors.notes ? true : undefined}
            aria-describedby={['vendor-notes-hint', errors.notes ? 'vendor-notes-error' : '']
              .filter(Boolean)
              .join(' ')}
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
          {vendor ? 'Discard changes' : 'Cancel'}
        </button>
        <div className="flex-1">
          <SubmitButton pending={pending} pendingLabel="Saving…">
            {vendor ? 'Update vendor' : 'Save vendor'}
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
