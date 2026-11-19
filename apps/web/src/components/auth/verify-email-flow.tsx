'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ButtonLink } from '@/components/ui/button-link';
import { FormAlert } from '@/components/forms/form-alert';
import { api } from '@/lib/api/browser';
import { routes } from '@/lib/routes';
import { AuthCard } from './auth-card';
import { INVITE_TOKEN_KEY } from '@/components/onboarding/accept-invitation';
import { useLinkToken } from './hooks';

type Outcome =
  | { state: 'verified'; next: { href: string; label: string } }
  | { state: 'invalid' | 'limited' | 'failed' };

/** A partner invitation this tab opened before signing up (see AcceptInvitation). */
function hasKeptInvitation(): boolean {
  try {
    return sessionStorage.getItem(INVITE_TOKEN_KEY) !== null;
  } catch {
    return false;
  }
}

/**
 * Where to go once verified: sign in if this browser is not signed in;
 * otherwise straight to creating the wedding (or to the invitation waiting
 * for this address) if there is none yet, so the dashboard does not have to
 * redirect.
 */
async function nextStep(): Promise<{ href: string; label: string }> {
  const me = await api.GET('/api/v1/auth/me');
  if (!me.response.ok) return { href: routes.login, label: 'Sign in to continue' };
  if (hasKeptInvitation()) {
    return { href: routes.acceptInvitation, label: 'Accept your invitation' };
  }
  const weddings = await api.GET('/api/v1/weddings');
  if (weddings.data?.data.length === 0) {
    // /onboarding shows invitations waiting for this address before the form.
    const invites = await api.GET('/api/v1/member-invites/mine');
    return invites.data?.data.length
      ? { href: routes.onboarding, label: 'See your invitation' }
      : { href: routes.onboarding, label: 'Create your wedding' };
  }
  return { href: routes.dashboard, label: 'Continue to your dashboard' };
}

/**
 * /verify-email: arriving from the emailed link (`#token=…`) verifies the
 * address; arriving without one shows `inbox` ("check your inbox" and a way
 * to get a new link), rendered by the server because it knows who is
 * signed in.
 */
export function VerifyEmailFlow({ inbox }: { inbox: ReactNode }) {
  const token = useLinkToken();
  // Kept with the link it answers, so a newer link never shows an older answer.
  const [answer, setAnswer] = useState<{ token: string; outcome: Outcome } | null>(null);
  const outcome = answer && answer.token === token ? answer.outcome : null;

  useEffect(() => {
    if (!token) return;
    let current = true;
    void (async () => {
      let next: Outcome;
      try {
        const { response } = await api.POST('/api/v1/auth/verify-email', { body: { token } });
        if (response.ok) {
          next = { state: 'verified', next: await nextStep() };
        } else {
          next = {
            state:
              response.status === 410 || response.status === 400
                ? 'invalid'
                : response.status === 429
                  ? 'limited'
                  : 'failed',
          };
        }
      } catch {
        next = { state: 'failed' };
      }
      // A link can be verified twice harmlessly (React runs effects twice in
      // development); only the answer of the current run is shown.
      if (current) setAnswer({ token, outcome: next });
    })();
    return () => {
      current = false;
    };
  }, [token]);

  if (token === undefined) {
    return (
      <AuthCard title="Verify your email">
        <p className="text-center text-body-md text-on-surface-variant">Checking your link…</p>
      </AuthCard>
    );
  }
  if (token === null) return <AuthCard title="Check your inbox">{inbox}</AuthCard>;

  if (!outcome) {
    return (
      <AuthCard title="Verifying your email">
        <p role="status" className="text-center text-body-md text-on-surface-variant">
          One moment while we confirm your address…
        </p>
      </AuthCard>
    );
  }

  if (outcome.state === 'verified') {
    return (
      <AuthCard title="Your email is verified">
        <div className="flex flex-col gap-5">
          <FormAlert tone="success">Thank you. Your address is confirmed.</FormAlert>
          <ButtonLink href={outcome.next.href} size="md" className="w-full">
            {outcome.next.label}
          </ButtonLink>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="This link cannot be used">
      <div className="flex flex-col gap-6">
        <FormAlert tone="error">
          {
            {
              invalid:
                'This link has expired or was replaced by a newer one. Verification links work for 24 hours, and only the latest one works.',
              limited:
                'Too many attempts from this connection. Please wait a few minutes, then open the link again.',
              failed:
                'We could not reach My Marriage to check this link. Check your connection, then open the link again.',
            }[outcome.state]
          }
        </FormAlert>
        {inbox}
      </div>
    </AuthCard>
  );
}
