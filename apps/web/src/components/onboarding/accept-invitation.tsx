'use client';

import type { components } from '@my-marriage/contracts';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { authLinkClass, AuthCard } from '@/components/auth/auth-card';
import { useLinkToken } from '@/components/auth/hooks';
import { SignOutButton } from '@/components/auth/sign-out-button';
import { FormAlert } from '@/components/forms/form-alert';
import { ButtonLink } from '@/components/ui/button-link';
import { api } from '@/lib/api/browser';
import { networkFailure, toFailure, waitMessage } from '@/lib/api/errors';
import { loginThenReturnTo, routes } from '@/lib/routes';
import { coupleName } from '@/lib/weddings/format';

type Preview = components['schemas']['InvitePreviewDto'];
type Me = components['schemas']['MeDto'];
type Wedding = components['schemas']['WeddingDto'];

/**
 * Kept for this tab only, so signing in on the way (which loses the URL
 * fragment) can come back here and still accept. Removed once used.
 */
export const INVITE_TOKEN_KEY = 'mm_invite_token';

function rememberToken(token: string | null): void {
  try {
    if (token) sessionStorage.setItem(INVITE_TOKEN_KEY, token);
    else sessionStorage.removeItem(INVITE_TOKEN_KEY);
  } catch {
    // Storage blocked: the link in the email still works.
  }
}

/** The secret from the link, or the one this tab kept while signing in. */
function useInviteToken(): string | null | undefined {
  const fromLink = useLinkToken();
  const [token, setToken] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (fromLink === undefined) return;
    if (fromLink) {
      rememberToken(fromLink);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setToken(fromLink);
      return;
    }
    let kept: string | null = null;
    try {
      kept = sessionStorage.getItem(INVITE_TOKEN_KEY);
    } catch {
      kept = null;
    }
    setToken(kept && /^[A-Za-z0-9_-]{20,100}$/.test(kept) ? kept : null);
  }, [fromLink]);
  return token;
}

type View =
  | { state: 'loading' }
  | { state: 'invalid' }
  | { state: 'failed'; message: string }
  | { state: 'ready'; invite: Preview; me: Me | null }
  | { state: 'joined'; wedding: Wedding };

/**
 * /invitations/accept: what the partner sees from the invitation email.
 * Shows what the invitation is for, then asks them to sign in with the
 * invited address, verify it, or accept — whichever comes next. The API
 * checks all of it again on accepting.
 */
export function AcceptInvitation() {
  const token = useInviteToken();
  const [view, setView] = useState<View>({ state: 'loading' });

  useEffect(() => {
    if (!token) return;
    let current = true;
    void (async () => {
      let next: View;
      try {
        const [preview, me] = await Promise.all([
          api.POST('/api/v1/member-invites/preview', { body: { token } }),
          api.GET('/api/v1/auth/me'),
        ]);
        if (preview.data) {
          next = { state: 'ready', invite: preview.data.data, me: me.data?.data ?? null };
        } else if (preview.response.status === 410 || preview.response.status === 400) {
          rememberToken(null);
          next = { state: 'invalid' };
        } else {
          const failure = toFailure(preview.response.status, preview.error);
          next = {
            state: 'failed',
            message: failure.code === 'RATE_LIMITED' ? waitMessage(failure) : failure.message,
          };
        }
      } catch {
        next = { state: 'failed', message: networkFailure().message };
      }
      if (current) setView(next);
    })();
    return () => {
      current = false;
    };
  }, [token]);

  if (token === null) {
    return (
      <AuthCard title="Open your invitation link">
        <p className="text-body-md text-on-surface-variant">
          This page needs the link from your invitation email. Open the email and use its button.
        </p>
      </AuthCard>
    );
  }
  if (token === undefined || view.state === 'loading') {
    return (
      <AuthCard title="Your invitation">
        <p role="status" className="text-center text-body-md text-on-surface-variant">
          Checking your invitation…
        </p>
      </AuthCard>
    );
  }
  if (view.state === 'invalid') {
    return (
      <AuthCard title="This invitation cannot be used">
        <FormAlert tone="error">
          It has expired, was replaced by a newer invitation, or was withdrawn. Ask your partner to
          send a new one.
        </FormAlert>
      </AuthCard>
    );
  }
  if (view.state === 'failed') {
    return (
      <AuthCard title="Your invitation">
        <FormAlert tone="error">{view.message}</FormAlert>
      </AuthCard>
    );
  }
  if (view.state === 'joined') {
    return (
      <AuthCard title="Welcome to the wedding">
        <div className="flex flex-col gap-5">
          <FormAlert tone="success">
            You’re now an owner of {coupleName(view.wedding)}’s wedding, with the same rights as
            your partner.
          </FormAlert>
          <ButtonLink href={routes.dashboard} size="md" className="w-full">
            Go to your dashboard
          </ButtonLink>
        </div>
      </AuthCard>
    );
  }
  return (
    <ReadyToAccept
      token={token}
      invite={view.invite}
      me={view.me}
      onJoined={(wedding) => {
        rememberToken(null);
        setView({ state: 'joined', wedding });
      }}
      onInvalid={() => {
        rememberToken(null);
        setView({ state: 'invalid' });
      }}
    />
  );
}

function ReadyToAccept({
  token,
  invite,
  me,
  onJoined,
  onInvalid,
}: {
  token: string;
  invite: Preview;
  me: Me | null;
  onJoined: (wedding: Wedding) => void;
  onInvalid: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const couple = coupleName(invite);
  const isInvitee = me?.email.toLowerCase() === invite.email.toLowerCase();

  async function accept() {
    if (pending) return;
    setPending(true);
    setAlert(null);
    try {
      const { data, error, response } = await api.POST('/api/v1/member-invites/accept', {
        body: { token },
      });
      if (data) {
        onJoined(data.data);
        return;
      }
      const failure = toFailure(response.status, error);
      if (failure.code === 'INVITE_INVALID') {
        onInvalid();
        return;
      }
      setAlert(failure.code === 'RATE_LIMITED' ? waitMessage(failure) : failure.message);
    } catch {
      setAlert(networkFailure().message);
    }
    setPending(false);
  }

  let next;
  if (invite.status === 'accepted') {
    next = isInvitee ? (
      <>
        <p className="text-body-md text-on-surface-variant">
          You have already accepted this invitation.
        </p>
        <ButtonLink href={routes.dashboard} size="md" className="w-full">
          Go to your dashboard
        </ButtonLink>
      </>
    ) : (
      <p className="text-body-md text-on-surface-variant">
        This invitation has already been accepted.
      </p>
    );
  } else if (!me) {
    next = (
      <>
        <p className="text-body-md text-on-surface-variant">
          Sign in with <strong className="font-semibold text-on-surface">{invite.email}</strong> to
          accept.
        </p>
        <ButtonLink href={loginThenReturnTo(routes.acceptInvitation)} size="md" className="w-full">
          Sign in to accept
        </ButtonLink>
        <p className="text-body-sm text-on-surface-variant">
          New to My Marriage?{' '}
          <Link href={routes.signup} className={authLinkClass}>
            Create an account
          </Link>{' '}
          with that address, verify it, then open this invitation link again.
        </p>
      </>
    );
  } else if (!isInvitee) {
    next = (
      <>
        <FormAlert tone="error" title="Signed in with another address">
          This invitation is for {invite.email}, but you’re signed in as {me.email}.
        </FormAlert>
        <p className="text-body-sm text-on-surface-variant">
          <SignOutButton variant="link" />, then sign in as {invite.email} and open the invitation
          link again.
        </p>
      </>
    );
  } else if (!me.emailVerified) {
    next = (
      <>
        <p className="text-body-md text-on-surface-variant">
          Verify your email address first, then open this invitation link again.
        </p>
        <ButtonLink href={routes.verifyEmail} size="md" className="w-full">
          Verify your email
        </ButtonLink>
      </>
    );
  } else {
    next = (
      <>
        {alert && (
          <FormAlert tone="error" title="Unable to accept">
            {alert}
          </FormAlert>
        )}
        <button
          type="button"
          onClick={() => void accept()}
          disabled={pending}
          aria-busy={pending || undefined}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-label-md font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container disabled:cursor-wait disabled:bg-primary-container"
        >
          {pending ? 'Accepting…' : 'Accept invitation'}
        </button>
      </>
    );
  }

  return (
    <AuthCard
      title="You’re invited"
      description={`${invite.invitedByName ?? 'Your partner'} invited you to plan ${couple}’s wedding, as an equal owner.`}
    >
      <div className="flex flex-col gap-5">
        <div className="rounded-lg bg-surface-container-low p-4">
          <p className="font-serif text-headline-sm text-on-surface">{couple}</p>
          <p className="text-body-sm text-on-surface-variant">
            {invite.city}, {invite.state} · Sent to {invite.email}
          </p>
        </div>
        {next}
      </div>
    </AuthCard>
  );
}
