'use client';

import { useRef, useState, type FormEvent } from 'react';
import { FormAlert } from '@/components/forms/form-alert';
import { SubmitButton } from '@/components/forms/submit-button';
import { TextField } from '@/components/forms/text-field';
import { api } from '@/lib/api/browser';
import { networkFailure, toFailure, waitMessage } from '@/lib/api/errors';
import { emailError, type FieldErrors } from '@/lib/auth/validation';
import { useFocusFirstProblem } from './hooks';

export function ForgotPasswordForm() {
  const form = useRef<HTMLFormElement>(null);
  const focusProblem = useFocusFirstProblem(form);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [alert, setAlert] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const email = String(new FormData(event.currentTarget).get('email') ?? '').trim();
    const problem = emailError(email);
    setAlert(null);
    setErrors(problem ? { email: problem } : {});
    if (problem) return focusProblem();

    setPending(true);
    try {
      const { error, response } = await api.POST('/api/v1/auth/password/forgot', {
        body: { email },
      });
      if (response.ok) {
        setSentTo(email);
        setPending(false);
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

  if (sentTo) {
    // Worded so it says nothing about whether the address has an account.
    return (
      <FormAlert tone="success" title="Check your email">
        If an account exists for <strong className="font-semibold">{sentTo}</strong>, we have sent
        it a link to choose a new password. The link expires in 1 hour. If nothing arrives in a few
        minutes, check your spam folder.
      </FormAlert>
    );
  }

  return (
    <form ref={form} noValidate onSubmit={submit} className="flex flex-col gap-5">
      {alert && (
        <FormAlert tone="error" title="Unable to send the link">
          {alert}
        </FormAlert>
      )}
      <TextField
        id="email"
        name="email"
        type="email"
        label="Email address"
        autoComplete="email"
        inputMode="email"
        placeholder="you@example.com"
        required
        error={errors.email}
      />
      <SubmitButton pending={pending} pendingLabel="Sending…">
        Send reset link
      </SubmitButton>
    </form>
  );
}
