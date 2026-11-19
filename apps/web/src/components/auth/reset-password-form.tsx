'use client';

import { useRef, useState, type FormEvent } from 'react';
import { ButtonLink } from '@/components/ui/button-link';
import { FormAlert } from '@/components/forms/form-alert';
import { PasswordField } from '@/components/forms/password-field';
import { SubmitButton } from '@/components/forms/submit-button';
import { api } from '@/lib/api/browser';
import { networkFailure, toFailure, waitMessage } from '@/lib/api/errors';
import {
  collect,
  confirmPasswordError,
  newPasswordError,
  PASSWORD_MIN_LENGTH,
  type FieldErrors,
} from '@/lib/auth/validation';
import { routes } from '@/lib/routes';
import { useFocusFirstProblem, useLinkToken } from './hooks';

function LinkProblem({ children }: { children: string }) {
  return (
    <div className="flex flex-col gap-5">
      <FormAlert tone="error" title="This link cannot be used">
        {children}
      </FormAlert>
      <ButtonLink href={routes.forgotPassword} size="md" className="w-full">
        Request a new link
      </ButtonLink>
    </div>
  );
}

export function ResetPasswordForm() {
  const token = useLinkToken();
  const form = useRef<HTMLFormElement>(null);
  const focusProblem = useFocusFirstProblem(form);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [alert, setAlert] = useState<string | null>(null);
  const [state, setState] = useState<'form' | 'done' | 'invalid'>('form');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !token) return;
    const data = new FormData(event.currentTarget);
    const password = String(data.get('password') ?? '');
    const problems = collect({
      password: newPasswordError(password),
      passwordConfirm: confirmPasswordError(password, String(data.get('passwordConfirm') ?? '')),
    });
    setAlert(null);
    setErrors(problems);
    if (Object.keys(problems).length > 0) return focusProblem();

    setPending(true);
    try {
      const { error, response } = await api.POST('/api/v1/auth/password/reset', {
        body: { token, password },
      });
      if (response.ok) {
        setState('done');
        setPending(false);
        return;
      }
      const failure = toFailure(response.status, error);
      if (failure.code === 'TOKEN_INVALID' || failure.fields.token) {
        setState('invalid');
        setPending(false);
        return;
      }
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

  if (token === undefined) {
    return <p className="text-center text-body-md text-on-surface-variant">Checking your link…</p>;
  }
  if (token === null) {
    return (
      <LinkProblem>
        This page needs the link from your password reset email. Open the email and use its button,
        or ask for a new link.
      </LinkProblem>
    );
  }
  if (state === 'invalid') {
    return (
      <LinkProblem>
        This link has expired, has already been used, or was replaced by a newer one. Reset links
        work once, for 1 hour.
      </LinkProblem>
    );
  }
  if (state === 'done') {
    return (
      <div className="flex flex-col gap-5">
        <FormAlert tone="success" title="Your password is changed">
          For your security, every device that was signed in has been signed out. Sign in again with
          your new password.
        </FormAlert>
        <ButtonLink href={routes.login} size="md" className="w-full">
          Sign in
        </ButtonLink>
      </div>
    );
  }

  return (
    <form ref={form} noValidate onSubmit={submit} className="flex flex-col gap-5">
      {alert && (
        <FormAlert tone="error" title="Unable to change your password">
          {alert}
        </FormAlert>
      )}
      <PasswordField
        id="password"
        name="password"
        label="New password"
        autoComplete="new-password"
        hint={`At least ${PASSWORD_MIN_LENGTH} characters. A few unrelated words work well.`}
        required
        error={errors.password}
      />
      <PasswordField
        id="passwordConfirm"
        name="passwordConfirm"
        label="Confirm new password"
        autoComplete="new-password"
        required
        error={errors.passwordConfirm}
      />
      <SubmitButton pending={pending} pendingLabel="Saving…">
        Save new password
      </SubmitButton>
    </form>
  );
}
