'use client';

import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import { FormAlert } from '@/components/forms/form-alert';
import { SubmitButton } from '@/components/forms/submit-button';
import { TextField } from '@/components/forms/text-field';
import { api } from '@/lib/api/browser';
import { networkFailure, toFailure, waitMessage } from '@/lib/api/errors';
import { emailError, type FieldErrors } from '@/lib/auth/validation';
import { routes } from '@/lib/routes';
import { authLinkClass } from './auth-card';
import { useFocusFirstProblem } from './hooks';
import { SignOutButton } from './sign-out-button';

/**
 * "Check your inbox", with a way to ask for a new link. Signed-in users see
 * their address and a single button; anyone else types the address.
 */
export function ResendVerification({ email }: { email?: string }) {
  const form = useRef<HTMLFormElement>(null);
  const focusProblem = useFocusFirstProblem(form);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [alert, setAlert] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const address = email ?? String(new FormData(event.currentTarget).get('email') ?? '').trim();
    const problem = emailError(address);
    setAlert(null);
    setErrors(problem ? { email: problem } : {});
    if (problem) return focusProblem();

    setPending(true);
    try {
      const { error, response } = await api.POST('/api/v1/auth/verification/resend', {
        body: { email: address },
      });
      if (response.ok) {
        setSent(true);
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

  return (
    <div className="flex flex-col gap-5 text-body-md text-on-surface-variant">
      {email ? (
        <p>
          We sent a link to <strong className="font-semibold text-on-surface">{email}</strong>. Open
          it to confirm your address — on this device or any other. It works for 24 hours.
        </p>
      ) : (
        <p>
          Open the link in the email we sent you to confirm your address. Did not get it? Enter your
          email and we will send a new one.
        </p>
      )}

      {sent ? (
        // Also shown when no email was due, so it reveals nothing about the address.
        <FormAlert tone="success" title="Link on its way">
          If this address still needs verifying, a new link is on its way and replaces any earlier
          one. We send at most one a minute, so if nothing arrives, check your spam folder and ask
          again in a minute.
        </FormAlert>
      ) : (
        <form ref={form} noValidate onSubmit={submit} className="flex flex-col gap-5">
          {alert && (
            <FormAlert tone="error" title="Unable to send a new link">
              {alert}
            </FormAlert>
          )}
          {!email && (
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
          )}
          <SubmitButton pending={pending} pendingLabel="Sending…">
            Send a new link
          </SubmitButton>
        </form>
      )}

      <p className="text-center text-body-sm">
        {email ? (
          <>
            Used the wrong address? <SignOutButton variant="link" /> and create a new account.
          </>
        ) : (
          <>
            Already verified?{' '}
            <Link href={routes.login} className={authLinkClass}>
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
