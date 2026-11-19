'use client';

import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import { FormAlert } from '@/components/forms/form-alert';
import { PasswordField } from '@/components/forms/password-field';
import { SubmitButton } from '@/components/forms/submit-button';
import { TextField } from '@/components/forms/text-field';
import { api } from '@/lib/api/browser';
import { networkFailure, toFailure, waitMessage } from '@/lib/api/errors';
import {
  collect,
  emailError,
  MESSAGES,
  newPasswordError,
  PASSWORD_MIN_LENGTH,
  type FieldErrors,
} from '@/lib/auth/validation';
import { routes } from '@/lib/routes';
import { authLinkClass } from './auth-card';
import { goTo, useFocusFirstProblem } from './hooks';

export function SignupForm() {
  const form = useRef<HTMLFormElement>(null);
  const focusProblem = useFocusFirstProblem(form);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [alert, setAlert] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const values = new FormData(event.currentTarget);
    const displayName = String(values.get('displayName') ?? '').trim();
    const email = String(values.get('email') ?? '').trim();
    const password = String(values.get('password') ?? '');

    const problems = collect({
      displayName: displayName ? undefined : MESSAGES.displayName,
      email: emailError(email),
      password: newPasswordError(password),
    });
    setAlert(null);
    setErrors(problems);
    if (Object.keys(problems).length > 0) return focusProblem();

    setPending(true);
    try {
      const { data, error, response } = await api.POST('/api/v1/auth/signup', {
        body: { displayName, email, password },
      });
      if (data) {
        goTo(routes.verifyEmail);
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
    <form ref={form} noValidate onSubmit={submit} className="flex flex-col gap-5">
      {alert && (
        <FormAlert tone="error" title="Unable to create your account">
          {alert}
        </FormAlert>
      )}
      <TextField
        id="displayName"
        name="displayName"
        label="Your name"
        autoComplete="name"
        placeholder="Priya Sharma"
        required
        maxLength={80}
        error={errors.displayName}
      />
      <TextField
        id="email"
        name="email"
        type="email"
        label="Email address"
        autoComplete="email"
        inputMode="email"
        placeholder="you@example.com"
        hint="We will send a link to this address to confirm it is yours."
        required
        error={errors.email}
      />
      <PasswordField
        id="password"
        name="password"
        label="Password"
        autoComplete="new-password"
        hint={`At least ${PASSWORD_MIN_LENGTH} characters. A few unrelated words work well.`}
        required
        error={errors.password}
      />
      {/* Placeholder consent notice (PRD AUTH-01), to be replaced once the
          legal pages are reviewed. Nothing is stored. */}
      <p className="text-body-sm text-on-surface-variant">
        By creating an account, you agree to our{' '}
        <Link href={routes.terms} className={authLinkClass}>
          Terms of Use
        </Link>{' '}
        and confirm you have read our{' '}
        <Link href={routes.privacy} className={authLinkClass}>
          Privacy Policy
        </Link>
        .
      </p>
      <SubmitButton pending={pending} pendingLabel="Creating your account…">
        Create account
      </SubmitButton>
    </form>
  );
}
