'use client';

import type { components } from '@my-marriage/contracts';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { authLinkClass, AuthCard } from '@/components/auth/auth-card';
import { useLinkToken } from '@/components/auth/hooks';
import { SignOutButton } from '@/components/auth/sign-out-button';
import { FormAlert } from '@/components/forms/form-alert';
import { ButtonLink } from '@/components/ui/button-link';
import { Icon } from '@/components/ui/icon';
import { api } from '@/lib/api/browser';
import { networkFailure, toFailure, waitMessage } from '@/lib/api/errors';
import { loginThenReturnTo, routes, workspacePath } from '@/lib/routes';
import { coupleName, roleLabel } from '@/lib/weddings/format';
import { ROLE_SCOPE } from '@/lib/weddings/roles';

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
  | { state: 'joined'; wedding: Wedding }
  | { state: 'declined'; couple: string };

/**
 * /invitations/accept: what an invitee sees from the invitation email —
 * the partner (as an owner) or a helper (as an admin or manager; Stitch
 * "Manager Invitation Acceptance"). Shows what the invitation is for, then
 * asks them to sign in with the invited address, verify it, or accept or
 * decline — whichever comes next. The API checks all of it again.
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
          It has expired, was replaced by a newer invitation, or was withdrawn. Ask whoever invited
          you to send a new one.
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
    const { wedding } = view;
    return (
      <AuthCard title="Welcome to the wedding">
        <div className="flex flex-col gap-5">
          <FormAlert tone="success">
            {wedding.role === 'owner'
              ? `You’re now an owner of ${coupleName(wedding)}’s wedding, with full authority over it.`
              : `You’re now ${wedding.role === 'admin' ? 'an admin' : 'a manager'} of ${coupleName(wedding)}’s wedding.`}
          </FormAlert>
          <ButtonLink href={workspacePath(wedding.id)} size="md" className="w-full">
            Open the wedding workspace
          </ButtonLink>
        </div>
      </AuthCard>
    );
  }
  if (view.state === 'declined') {
    return (
      <AuthCard title="Invitation declined">
        <div className="flex flex-col gap-5">
          <p className="text-body-md text-on-surface-variant">
            You won’t be added to {view.couple}’s wedding. If you change your mind, ask them to
            invite you again.
          </p>
          <ButtonLink href={routes.dashboard} variant="secondary" size="md" className="w-full">
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
      onDeclined={() => {
        rememberToken(null);
        setView({ state: 'declined', couple: coupleName(view.invite) });
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
  onDeclined,
}: {
  token: string;
  invite: Preview;
  me: Me | null;
  onJoined: (wedding: Wedding) => void;
  onInvalid: () => void;
  onDeclined: () => void;
}) {
  const [pending, setPending] = useState<'accept' | 'decline' | null>(null);
  const [alert, setAlert] = useState<string | null>(null);
  const couple = coupleName(invite);
  const isInvitee = me?.email.toLowerCase() === invite.email.toLowerCase();

  const helper = invite.role !== 'owner';
  const handOver = invite.handOver;

  async function accept() {
    if (pending) return;
    setPending('accept');
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
      // HAND_OVER_INVALID and the rest: said as the API says it.
      setAlert(failure.code === 'RATE_LIMITED' ? waitMessage(failure) : failure.message);
    } catch {
      setAlert(networkFailure().message);
    }
    setPending(null);
  }

  /** Declining ends this invitation; they can be invited again later. */
  async function decline() {
    if (pending) return;
    setPending('decline');
    setAlert(null);
    try {
      const { error, response } = await api.POST('/api/v1/member-invites/decline', {
        body: { token },
      });
      if (response.ok) {
        onDeclined();
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
    setPending(null);
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
          disabled={pending !== null}
          aria-busy={pending === 'accept' || undefined}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-label-md font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container disabled:cursor-wait disabled:bg-primary-container"
        >
          {pending === 'accept'
            ? 'Accepting…'
            : handOver
              ? 'Accept and become an owner'
              : helper
                ? 'Accept invitation & open workspace'
                : 'Accept invitation'}
        </button>
        <button
          type="button"
          onClick={() => void decline()}
          disabled={pending !== null}
          aria-busy={pending === 'decline' || undefined}
          className="w-full rounded-md bg-surface-container-low px-4 py-2.5 text-label-md font-semibold text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:cursor-wait"
        >
          {pending === 'decline' ? 'Declining…' : 'Decline'}
        </button>
      </>
    );
  }

  return (
    <AuthCard
      title={
        handOver
          ? 'Take over as an owner'
          : helper
            ? `Help plan ${couple}’s wedding`
            : 'You’re invited'
      }
      description={
        handOver
          ? `${invite.invitedByName ?? 'An owner'} invited you to take over their place as an owner of ${couple}’s wedding.`
          : helper
            ? `${invite.invitedByName ?? 'The couple'} invited you to join their planning team as ${invite.role === 'admin' ? 'an admin' : 'a manager'}.`
            : `${invite.invitedByName ?? 'Your partner'} invited you to plan ${couple}’s wedding, as an equal owner.`
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-low p-4">
          <div className="min-w-0">
            <p className="font-serif text-headline-sm text-on-surface">{couple}</p>
            <p className="text-body-sm text-on-surface-variant">
              {invite.city}, {invite.state} · Sent to {invite.email}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-primary px-3 py-1 text-label-sm text-on-primary">
            {roleLabel(invite.role)}
          </span>
        </div>
        {handOver && invite.status === 'pending' && (
          <div className="flex flex-col gap-3 rounded-lg bg-surface-container-lowest p-4 ring-1 ring-outline-variant/40">
            <p className="text-label-sm font-semibold tracking-wider text-secondary uppercase">
              What changes when you accept
            </p>
            <ul className="flex flex-col gap-2 text-body-sm text-on-surface">
              <li className="flex items-start gap-2">
                <Icon name="check-circle" className="mt-0.5 size-4 shrink-0 text-primary" />
                You become an owner, with full authority over the wedding.
              </li>
              <li className="flex items-start gap-2">
                <Icon name="check-circle" className="mt-0.5 size-4 shrink-0 text-primary" />
                {invite.invitedByName ?? 'The person who invited you'} stays on the team as an
                admin.
              </li>
              <li className="flex items-start gap-2">
                <Icon name="check-circle" className="mt-0.5 size-4 shrink-0 text-primary" />
                Any other owner stays an owner. Any wedding of your own stays as it is.
              </li>
            </ul>
          </div>
        )}
        {helper && invite.status === 'pending' && (
          <div className="flex flex-col gap-3 rounded-lg bg-surface-container-lowest p-4 ring-1 ring-outline-variant/40">
            <p className="text-label-sm font-semibold tracking-wider text-secondary uppercase">
              What you can do
            </p>
            <ul className="flex flex-col gap-2 text-body-sm text-on-surface">
              {ROLE_SCOPE[invite.role].can.map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <Icon name="check-circle" className="mt-0.5 size-4 shrink-0 text-primary" />
                  {line}
                </li>
              ))}
            </ul>
            <p className="flex items-start gap-2 rounded-md bg-surface-container-low p-2.5 text-body-sm text-on-surface-variant">
              <Icon name="lock" className="mt-0.5 size-4 shrink-0 text-secondary" />
              {ROLE_SCOPE[invite.role].cannot}
            </p>
            <p className="text-body-sm text-on-surface-variant">
              Any wedding of your own stays as it is; you can switch between weddings at any time.
            </p>
          </div>
        )}
        {next}
      </div>
    </AuthCard>
  );
}
