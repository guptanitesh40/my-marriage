'use client';

import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import { FormAlert } from '@/components/forms/form-alert';
import { PasswordField } from '@/components/forms/password-field';
import { SubmitButton } from '@/components/forms/submit-button';
import { TextField } from '@/components/forms/text-field';
import { api } from '@/lib/api/browser';
import { networkFailure, toFailure, waitMessage, type Failure } from '@/lib/api/errors';
import { safeNextPath } from '@/lib/auth/safe-next-path';
import { collect, emailError, MESSAGES, type FieldErrors } from '@/lib/auth/validation';
import { routes } from '@/lib/routes';
import { authLinkClass } from './auth-card';
import { goTo, useFocusFirstProblem } from './hooks';

function alertFor(failure: Failure): { title: string; message: string } {
  if (failure.code === 'RATE_LIMITED') {
    return { title: 'Sign-in paused', message: waitMessage(failure) };
  }
  return { title: 'Unable to sign in', message: failure.message };
}

export function LoginForm() {
  const form = useRef<HTMLFormElement>(null);
  const focusProblem = useFocusFirstProblem(form);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [alert, setAlert] = useState<{ title: string; message: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const values = new FormData(event.currentTarget);
    const email = String(values.get('email') ?? '').trim();
    const password = String(values.get('password') ?? '');

    const problems = collect({
      email: emailError(email),
      password: password ? undefined : MESSAGES.password,
    });
    setAlert(null);
    setErrors(problems);
    if (Object.keys(problems).length > 0) return focusProblem();

    setPending(true);
    try {
      const { data, error, response } = await api.POST('/api/v1/auth/login', {
        body: { email, password },
      });
      if (data) {
        // Unverified accounts go to the verification screen first.
        const next = new URLSearchParams(window.location.search).get('next');
        goTo(
          data.data.emailVerified ? (safeNextPath(next) ?? routes.dashboard) : routes.verifyEmail,
        );
        return; // Stay "pending" while the next page loads.
      }
      const failure = toFailure(response.status, error);
      setErrors(failure.fields);
      if (Object.keys(failure.fields).length === 0) setAlert(alertFor(failure));
    } catch {
      setAlert(alertFor(networkFailure()));
    }
    setPending(false);
    focusProblem();
  }

  return (
    <form ref={form} noValidate onSubmit={submit} className="flex flex-col gap-5">
      {alert && (
        <FormAlert tone="error" title={alert.title}>
          {alert.message}
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
      <PasswordField
        id="password"
        name="password"
        label="Password"
        autoComplete="current-password"
        placeholder="Enter your password"
        required
        error={errors.password}
        labelAside={
          <Link href={routes.forgotPassword} className={`text-body-sm ${authLinkClass}`}>
            Forgot password?
          </Link>
        }
      />
      <div className="pt-1">
        <SubmitButton pending={pending} pendingLabel="Signing in…">
          Sign in
        </SubmitButton>
      </div>
    </form>
  );
}
