'use client';

import type { components } from '@my-marriage/contracts';
import { useRef, useState, type FormEvent } from 'react';
import { goTo, useFocusFirstProblem } from '@/components/auth/hooks';
import { FormAlert } from '@/components/forms/form-alert';
import { SelectField } from '@/components/forms/select-field';
import { SubmitButton } from '@/components/forms/submit-button';
import { TextField } from '@/components/forms/text-field';
import { Icon } from '@/components/ui/icon';
import { api } from '@/lib/api/browser';
import { networkFailure, toFailure, waitMessage } from '@/lib/api/errors';
import type { FieldErrors } from '@/lib/auth/validation';
import { onboardingPartnerFor } from '@/lib/routes';
import { WEDDING_STATES } from '@/lib/weddings/states';
import {
  tidy,
  todayInIndia,
  WEDDING_LIMITS,
  weddingErrors,
  type WeddingInput,
} from '@/lib/weddings/validation';

type Wedding = components['schemas']['WeddingDto'];

function Required() {
  return <span className="text-label-sm font-medium text-primary">* Required</span>;
}

function Optional() {
  return <span className="text-label-sm text-on-surface-variant">Optional</span>;
}

/**
 * Step 1 of onboarding: the few details needed to create the wedding (PRD
 * WED-01) — or, given the wedding, to change them (WED-04), for someone who
 * came back from step 2.
 */
export function WeddingDetailsForm({ wedding }: { wedding?: Wedding }) {
  const form = useRef<HTMLFormElement>(null);
  const focusProblem = useFocusFirstProblem(form);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [alert, setAlert] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const values = new FormData(event.currentTarget);
    const text = (name: string) => tidy(String(values.get(name) ?? ''));
    const input: WeddingInput = {
      brideName: text('brideName'),
      groomName: text('groomName'),
      city: text('city'),
      state: text('state'),
      weddingDate: text('weddingDate'),
    };

    const problems = weddingErrors(input, wedding?.weddingDate);
    setAlert(null);
    setErrors(problems);
    if (Object.keys(problems).length > 0) return focusProblem();

    setPending(true);
    try {
      const { weddingDate, ...required } = input;
      const { data, error, response } = wedding
        ? await api.PATCH('/api/v1/weddings/{weddingId}', {
            params: { path: { weddingId: wedding.id } },
            // An emptied date field removes the date.
            body: { ...required, weddingDate: weddingDate || null },
          })
        : await api.POST('/api/v1/weddings', {
            body: { ...required, ...(weddingDate ? { weddingDate } : {}) },
          });
      if (data) {
        // Step 2 for this wedding: someone may own several (decision 0020).
        goTo(onboardingPartnerFor(data.data.id));
        return;
      }
      const failure = toFailure(response.status, error);
      setErrors(failure.fields);
      if (Object.keys(failure.fields).length === 0) {
        setAlert(failure.code === 'RATE_LIMITED' ? waitMessage(failure) : failure.message);
      }
    } catch {
      setAlert(networkFailure().message);
    }
    setPending(false);
    focusProblem();
  }

  return (
    <form ref={form} noValidate onSubmit={submit} className="relative z-10 flex flex-col gap-5">
      {alert && (
        <FormAlert
          tone="error"
          title={wedding ? 'Unable to save your changes' : 'Unable to create your wedding'}
        >
          {alert}
        </FormAlert>
      )}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-4">
        <TextField
          id="brideName"
          name="brideName"
          label="Bride’s name"
          labelAside={<Required />}
          placeholder="e.g. Ananya"
          autoComplete="off"
          required
          maxLength={WEDDING_LIMITS.brideName}
          defaultValue={wedding?.brideName}
          error={errors.brideName}
        />
        <TextField
          id="groomName"
          name="groomName"
          label="Groom’s name"
          labelAside={<Required />}
          placeholder="e.g. Arjun"
          autoComplete="off"
          required
          maxLength={WEDDING_LIMITS.groomName}
          defaultValue={wedding?.groomName}
          error={errors.groomName}
        />
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-4">
        <TextField
          id="city"
          name="city"
          label="City"
          labelAside={<Required />}
          placeholder="e.g. Jaipur, Udaipur"
          autoComplete="address-level2"
          trailingIcon="location-on"
          required
          maxLength={WEDDING_LIMITS.city}
          defaultValue={wedding?.city}
          error={errors.city}
        />
        <SelectField
          id="state"
          name="state"
          label="State"
          labelAside={<Required />}
          placeholder="Choose a state"
          options={WEDDING_STATES}
          required
          defaultValue={wedding?.state ?? ''}
          error={errors.state}
        />
      </div>
      <TextField
        id="weddingDate"
        name="weddingDate"
        type="date"
        label="Wedding date"
        labelAside={<Optional />}
        hint="Still finalising auspicious dates? You can set the exact day and muhurat later."
        min={todayInIndia()}
        max="2100-12-31"
        defaultValue={wedding?.weddingDate}
        error={errors.weddingDate}
      />

      <div className="flex gap-3 rounded-lg bg-surface-container-low p-4 text-body-sm text-on-surface-variant">
        <Icon name="security" className="mt-0.5 size-5 shrink-0 text-secondary" />
        <p>
          We don’t ask for themes, story photos or guest counts now. Add them whenever you are
          ready.
        </p>
      </div>

      <div className="flex flex-col gap-3 pt-1">
        <SubmitButton
          pending={pending}
          pendingLabel={wedding ? 'Saving…' : 'Creating your wedding…'}
        >
          {wedding ? 'Save and continue' : 'Create wedding workspace'}
          <Icon name="arrow-forward" className="size-4" />
        </SubmitButton>
        <p className="flex items-center justify-center gap-1.5 text-center text-body-sm text-on-surface-variant">
          <Icon name="lock" className="size-4 shrink-0 text-secondary" />
          Your wedding stays private until you invite people or publish its website.
        </p>
      </div>
    </form>
  );
}
