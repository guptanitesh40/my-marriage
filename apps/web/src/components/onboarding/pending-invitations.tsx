'use client';

import type { components } from '@my-marriage/contracts';
import Link from 'next/link';
import { useRef, useState, type ReactNode, type Ref } from 'react';
import { goTo } from '@/components/auth/hooks';
import { FormAlert } from '@/components/forms/form-alert';
import { Icon } from '@/components/ui/icon';
import { api } from '@/lib/api/browser';
import { networkFailure, toFailure } from '@/lib/api/errors';
import { firstName, initials } from '@/lib/format';
import { routes, workspacePath } from '@/lib/routes';
import { coupleName, longDate, roleLabel } from '@/lib/weddings/format';
import { stepCardClass } from './step-progress';

type MyInvite = components['schemas']['MyInviteDto'];

/** Why an invitation could not be accepted, as the design shows it. */
type Problem =
  { kind: 'gone' } | { kind: 'full' } | { kind: 'failed'; message: string; retry: boolean };

/** "Co-owner invitation", "Ownership hand-over", "Admin invitation", "Manager invitation". */
function invitationKind(invite: MyInvite): string {
  if (invite.handOver) return 'Ownership hand-over';
  return invite.role === 'owner' ? 'Co-owner invitation' : `${roleLabel(invite.role)} invitation`;
}

/** What joining means, for the card. */
function joiningAs(invite: MyInvite): string {
  if (invite.handOver) return 'Owner, in place of the sender';
  if (invite.role === 'owner') return 'Equal co-owner';
  return invite.role === 'admin' ? 'Admin: plans and runs the team' : 'Manager: helps plan';
}

function weddingDay(invite: MyInvite): string {
  return invite.weddingDate ? longDate(invite.weddingDate, { weekday: true }) : 'Date not set yet';
}

/**
 * Accepting or declining one invitation by its ID (no link needed: the API
 * checks the signed-in, verified address). Accepting leaves for the
 * wedding's workspace; the button stays busy until the page changes.
 * Declining ends the invitation; they can be invited again later.
 */
function useAccept() {
  const [joining, setJoining] = useState<string | null>(null);
  const [problems, setProblems] = useState<Record<string, Problem>>({});
  const [declined, setDeclined] = useState<ReadonlySet<string>>(new Set());

  async function decline(inviteId: string) {
    if (joining) return;
    setJoining(inviteId);
    try {
      const { error, response } = await api.POST('/api/v1/member-invites/{inviteId}/decline', {
        params: { path: { inviteId } },
      });
      if (response.ok || response.status === 404 || response.status === 410) {
        setDeclined((current) => new Set([...current, inviteId]));
      } else {
        const failure = toFailure(response.status, error);
        setProblems((current) => ({
          ...current,
          [inviteId]: { kind: 'failed', message: failure.message, retry: false },
        }));
      }
    } catch {
      setProblems((current) => ({
        ...current,
        [inviteId]: { kind: 'failed', message: networkFailure().message, retry: false },
      }));
    }
    setJoining(null);
  }

  async function accept(inviteId: string) {
    if (joining) return;
    setJoining(inviteId);
    setProblems((current) => {
      const next = { ...current };
      delete next[inviteId];
      return next;
    });
    let problem: Problem;
    try {
      const { data, error, response } = await api.POST('/api/v1/member-invites/{inviteId}/accept', {
        params: { path: { inviteId } },
      });
      if (data) {
        goTo(workspacePath(data.data.id));
        return;
      }
      const failure = toFailure(response.status, error);
      if (['INVITE_INVALID', 'INVITE_NOT_FOUND', 'WEDDING_ARCHIVED'].includes(failure.code)) {
        problem = { kind: 'gone' };
      } else if (failure.code === 'OWNER_LIMIT') {
        problem = { kind: 'full' };
      } else if (failure.code === 'HAND_OVER_INVALID' || failure.code === 'ALREADY_OWNER') {
        problem = { kind: 'failed', message: failure.message, retry: false };
      } else {
        problem = {
          kind: 'failed',
          message: 'We couldn’t join the wedding just now. Please try again.',
          retry: true,
        };
      }
    } catch {
      problem = { kind: 'failed', message: networkFailure().message, retry: true };
    }
    setProblems((current) => ({ ...current, [inviteId]: problem }));
    setJoining(null);
  }

  return { joining, problems, declined, accept, decline };
}

/**
 * The invitations waiting for someone who owns no wedding yet, shown on
 * /onboarding before the form to create one (the Stitch design "Pending
 * Co-owner Invitation"), as an owner, admin or manager. One click joins,
 * another declines. "Start my own wedding instead" explains that the
 * invitations stay open: anyone may own and help plan several weddings
 * (decision 0020).
 */
export function PendingInvitations({
  invites: all,
  email,
  hasWeddings = false,
}: {
  invites: MyInvite[];
  email: string;
  /**
   * Already on a wedding's team (the /invitations page): offers the way
   * back to their weddings instead of starting one.
   */
  hasWeddings?: boolean;
}) {
  const { joining, problems, declined, accept, decline } = useAccept();
  const dialog = useRef<HTMLDialogElement>(null);
  const invites = all.filter((invite) => !declined.has(invite.id));
  const [first] = invites;
  if (!first && hasWeddings) {
    return (
      <section className={stepCardClass}>
        <h1 className="font-serif text-headline-md text-on-surface">Invitation declined</h1>
        <p className="text-body-md text-on-surface-variant">
          Nobody was added, and nothing changed. The person who invited you can send a new one.
        </p>
        <Link
          href={routes.dashboard}
          className="flex h-11 items-center justify-center rounded-md bg-primary text-label-md font-semibold text-on-primary"
        >
          Back to my weddings
        </Link>
      </section>
    );
  }
  if (!first) {
    return (
      <section className={stepCardClass}>
        <h1 className="font-serif text-headline-md text-on-surface">Invitation declined</h1>
        <p className="text-body-md text-on-surface-variant">
          Nobody was added. You can start your own wedding now.
        </p>
        <Link
          href={routes.onboardingStartOwn}
          className="flex h-11 items-center justify-center rounded-md bg-primary text-label-md font-semibold text-on-primary"
        >
          Start my own wedding
        </Link>
      </section>
    );
  }
  const single = invites.length === 1;

  const startOwn = hasWeddings ? (
    <Link
      href={routes.dashboard}
      className="rounded-sm p-1 text-label-md font-semibold text-on-surface-variant underline decoration-outline-variant underline-offset-4 transition-colors hover:text-on-surface hover:decoration-on-surface"
    >
      Back to my weddings
    </Link>
  ) : (
    <button
      type="button"
      onClick={() => dialog.current?.showModal()}
      className="rounded-sm p-1 text-label-md font-semibold text-on-surface-variant underline decoration-outline-variant underline-offset-4 transition-colors hover:text-on-surface hover:decoration-on-surface"
    >
      Start my own wedding instead
    </button>
  );

  return (
    <>
      {single ? (
        <SingleInvitation
          invite={first}
          email={email}
          joining={joining === first.id}
          problem={problems[first.id]}
          onAccept={() => void accept(first.id)}
          onDecline={() => void decline(first.id)}
          startOwn={startOwn}
        />
      ) : (
        <SeveralInvitations
          invites={invites}
          email={email}
          joining={joining}
          problems={problems}
          onAccept={(id) => void accept(id)}
          onDecline={(id) => void decline(id)}
          startOwn={startOwn}
        />
      )}
      {!hasWeddings && (
        <StartOwnDialog
          ref={dialog}
          body={
            single
              ? `You can plan your own wedding and still join ${coupleName(first)}’s: you can switch between weddings at any time.`
              : 'You can plan your own wedding and still accept these invitations: you can switch between weddings at any time.'
          }
        />
      )}
    </>
  );
}

function Eyebrow({ children }: { children: string }) {
  return (
    <p className="inline-flex items-center gap-2 text-label-sm font-semibold tracking-[0.18em] text-secondary uppercase">
      <span className="size-1.5 rounded-full bg-primary-container" aria-hidden="true" />
      {children}
    </p>
  );
}

function Heading({ eyebrow, title, intro }: { eyebrow: string; title: string; intro: string }) {
  return (
    <div className="mb-8 flex flex-col items-center gap-2 text-center">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 className="font-serif text-headline-lg-mobile text-on-surface sm:text-headline-lg">
        {title}
      </h1>
      <p className="max-w-lg text-body-md text-on-surface-variant">{intro}</p>
    </div>
  );
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: 'location-on' | 'calendar-month';
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-surface-variant bg-surface/60 p-3">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-surface-variant bg-surface-container-lowest text-primary-container">
        <Icon name={icon} className="size-4" />
      </span>
      <span className="flex flex-col">
        <span className="text-body-sm font-medium text-on-surface-variant">{label}</span>
        <span className="text-title-sm text-on-surface">{value}</span>
      </span>
    </div>
  );
}

function AcceptButton({
  joining,
  disabled,
  onAccept,
  label,
}: {
  joining: boolean;
  disabled?: boolean;
  onAccept: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onAccept}
      disabled={joining || disabled}
      aria-busy={joining || undefined}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-label-md font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container disabled:cursor-not-allowed disabled:bg-primary-container"
    >
      {joining ? (
        <>
          <span
            className="size-4 animate-spin rounded-full border-2 border-on-primary/30 border-t-on-primary"
            aria-hidden="true"
          />
          Joining…
        </>
      ) : (
        <>
          {label}
          <Icon name="arrow-forward" className="size-4" />
        </>
      )}
    </button>
  );
}

/** Declining ends the invitation; the person can be invited again later. */
function DeclineButton({ onDecline, disabled }: { onDecline: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onDecline}
      disabled={disabled}
      className="rounded-sm p-1 text-label-md font-semibold text-on-surface-variant hover:text-on-surface disabled:opacity-60"
    >
      Decline
    </button>
  );
}

/** The error area that replaces the button, per the design's D1–D3 states. */
function ProblemNotice({
  problem,
  invite,
  onRetry,
  startOwn,
}: {
  problem: Problem;
  invite: MyInvite;
  onRetry: () => void;
  startOwn: ReactNode;
}) {
  const inviter = firstName(invite.invitedByName) ?? 'the person who invited you';
  if (problem.kind === 'failed') {
    return (
      <div className="flex flex-col gap-3">
        <FormAlert tone="error">{problem.message}</FormAlert>
        {problem.retry && (
          <button
            type="button"
            onClick={onRetry}
            className="h-11 w-full rounded-md bg-primary text-label-md font-semibold text-on-primary transition-colors hover:bg-primary-container"
          >
            Try again
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-3">
      <FormAlert tone="error">
        {problem.kind === 'gone'
          ? `This invitation is no longer valid. Ask ${inviter} to send a new one.`
          : `${coupleName(invite)}’s wedding already has two owners.`}
      </FormAlert>
      {startOwn}
    </div>
  );
}

function PrivacyNote({ email, short = false }: { email: string; short?: boolean }) {
  return (
    <p className="text-center text-body-sm text-on-surface-variant">
      <Icon name="lock" className="mr-1.5 inline size-4 align-[-3px] text-secondary" />
      {short
        ? 'Invitations are private to '
        : 'Invitations are private. Only you can accept one sent to '}
      <strong className="font-semibold wrap-break-word text-on-surface">{email}</strong>.
    </p>
  );
}

function SingleInvitation({
  invite,
  email,
  joining,
  problem,
  onAccept,
  onDecline,
  startOwn,
}: {
  invite: MyInvite;
  email: string;
  joining: boolean;
  problem: Problem | undefined;
  onAccept: () => void;
  onDecline: () => void;
  startOwn: ReactNode;
}) {
  const inviter = invite.invitedByName;
  const couple = coupleName(invite);
  const owner = invite.role === 'owner';
  const handOver = invite.handOver;
  return (
    <>
      <Heading
        eyebrow="You’re invited"
        title={
          handOver
            ? `Take over ${couple}’s wedding.`
            : owner
              ? 'Join your wedding.'
              : `Help plan ${couple}’s wedding.`
        }
        intro={
          handOver
            ? `${inviter ?? 'An owner'} invited you to take over their place as an owner of the wedding.`
            : owner
              ? inviter
                ? `${inviter} has already set up your wedding on My Marriage and invited you to plan it together.`
                : 'Your wedding is already set up on My Marriage, and you’re invited to plan it together.'
              : `${inviter ?? 'The couple'} invited you to join their planning team as ${invite.role === 'admin' ? 'an admin' : 'a manager'}.`
        }
      />
      <section aria-label={`Invitation to ${couple}’s wedding`} className={stepCardClass}>
        <div
          className="pointer-events-none absolute top-0 right-0 size-32 rounded-bl-[80px] bg-secondary-container/20"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-1 border-b border-surface-variant pb-5">
          <span className="text-label-sm font-semibold tracking-widest text-on-surface-variant uppercase">
            Wedding
          </span>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
            <h2 className="font-serif text-headline-md text-on-surface">{couple}</h2>
            <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-primary-container/20 bg-primary-container/5 px-2.5 py-1 text-label-md text-primary-container">
              <Icon name="verified" className="size-4" />
              {invitationKind(invite)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Detail
            icon="location-on"
            label="Primary location"
            value={`${invite.city}, ${invite.state}`}
          />
          <Detail icon="calendar-month" label="Celebration date" value={weddingDay(invite)} />
        </div>

        {inviter && (
          <div className="flex items-center justify-between gap-3 border-t border-surface-variant pt-6">
            <div className="flex items-center gap-3">
              <span
                className="flex size-9 items-center justify-center rounded-full bg-primary-container text-label-md text-on-primary"
                aria-hidden="true"
              >
                {initials(inviter)}
              </span>
              <span className="flex flex-col">
                <span className="text-body-sm text-on-surface-variant">Invited by</span>
                <span className="text-title-sm text-on-surface">{inviter}</span>
              </span>
            </div>
            <span className="hidden text-body-sm text-on-surface-variant sm:inline">
              Pending your response
            </span>
          </div>
        )}

        <div className="flex items-start gap-3 rounded-lg border border-secondary-fixed-dim/40 bg-surface-container-low p-4">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary-fixed/50 text-secondary">
            <Icon name="groups" className="size-4" />
          </span>
          {handOver ? (
            <p className="text-body-md text-on-surface-variant">
              You’ll become an <strong className="font-semibold text-on-surface">owner</strong>,
              with full authority over the wedding, and{' '}
              {firstName(inviter) ?? 'the person who invited you'} stays on the team as an admin.
              Nothing changes unless you accept.
            </p>
          ) : owner ? (
            <p className="text-body-md text-on-surface-variant">
              You’ll join as an{' '}
              <strong className="font-semibold text-on-surface">equal owner</strong>, with the same
              access as {firstName(inviter) ?? 'the person who invited you'}. You can plan
              everything together.
            </p>
          ) : (
            <p className="text-body-md text-on-surface-variant">
              You’ll join as{' '}
              <strong className="font-semibold text-on-surface">
                {invite.role === 'admin' ? 'an admin' : 'a manager'}
              </strong>
              .{' '}
              {invite.role === 'admin'
                ? 'You can plan everything and look after the team with the couple.'
                : 'You can help with events, tasks, guests, vendors, expenses, the website and photos.'}
            </p>
          )}
        </div>

        <div className="flex flex-col items-center gap-4">
          {problem ? (
            <div className="w-full">
              <ProblemNotice
                problem={problem}
                invite={invite}
                onRetry={onAccept}
                startOwn={startOwn}
              />
            </div>
          ) : (
            <>
              <AcceptButton joining={joining} onAccept={onAccept} label="Accept and join" />
              {!joining && <DeclineButton onDecline={onDecline} />}
              {!joining && startOwn}
            </>
          )}
        </div>

        <div className="border-t border-surface-variant pt-4">
          <PrivacyNote email={email} />
        </div>
      </section>
    </>
  );
}

function SeveralInvitations({
  invites,
  email,
  joining,
  problems,
  onAccept,
  onDecline,
  startOwn,
}: {
  invites: MyInvite[];
  email: string;
  joining: string | null;
  problems: Record<string, Problem>;
  onAccept: (inviteId: string) => void;
  onDecline: (inviteId: string) => void;
  startOwn: ReactNode;
}) {
  return (
    <>
      <Heading
        eyebrow={`${invites.length} pending invitations`}
        title={`You have ${invites.length} invitations.`}
        intro="Accept the weddings you’d like to join; you can switch between them at any time."
      />
      <ul className="flex flex-col gap-4">
        {invites.map((invite, index) => {
          const problem = problems[invite.id];
          return (
            <li key={invite.id}>
              <article
                aria-label={`Invitation to ${coupleName(invite)}’s wedding`}
                className="flex flex-col gap-4 rounded-xl border border-surface-variant bg-surface-container-lowest p-5 shadow-sm sm:p-6"
              >
                <div className="flex flex-col gap-2 border-b border-surface-variant pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="text-label-sm font-semibold tracking-widest text-on-surface-variant uppercase">
                      Wedding {index + 1}
                    </span>
                    <h2 className="font-serif text-headline-md text-on-surface">
                      {coupleName(invite)}
                    </h2>
                  </div>
                  {invite.invitedByName && (
                    <p className="flex items-center gap-2 text-body-sm text-on-surface-variant">
                      <span
                        className="flex size-7 items-center justify-center rounded-full bg-primary-container text-label-sm text-on-primary"
                        aria-hidden="true"
                      >
                        {initials(invite.invitedByName)}
                      </span>
                      <span>
                        Invited by{' '}
                        <strong className="font-semibold text-on-surface">
                          {invite.invitedByName}
                        </strong>
                      </span>
                    </p>
                  )}
                </div>
                <p className="flex flex-wrap items-center gap-3 text-body-sm text-on-surface-variant">
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-surface-variant bg-surface px-3 py-1.5">
                    <Icon name="location-on" className="size-4 text-primary-container" />
                    {invite.city}, {invite.state}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-surface-variant bg-surface px-3 py-1.5">
                    <Icon name="calendar-month" className="size-4 text-primary-container" />
                    {weddingDay(invite)}
                  </span>
                  <span className="rounded-md bg-primary-fixed/60 px-2.5 py-1 text-label-sm text-on-primary-fixed">
                    {joiningAs(invite)}
                  </span>
                </p>
                {problem ? (
                  <ProblemNotice
                    problem={problem}
                    invite={invite}
                    onRetry={() => onAccept(invite.id)}
                    startOwn={null}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <AcceptButton
                      joining={joining === invite.id}
                      disabled={joining !== null}
                      onAccept={() => onAccept(invite.id)}
                      label="Accept and join this wedding"
                    />
                    <DeclineButton
                      onDecline={() => onDecline(invite.id)}
                      disabled={joining !== null}
                    />
                  </div>
                )}
              </article>
            </li>
          );
        })}
      </ul>
      <div className="mt-6 flex flex-col items-center gap-4">
        {startOwn}
        <PrivacyNote email={email} short />
      </div>
    </>
  );
}

/**
 * "Start a separate wedding?": a modal dialog on wide screens, a bottom
 * sheet on phones. The native <dialog> keeps focus inside and closes on Esc.
 */
function StartOwnDialog({ ref, body }: { ref: Ref<HTMLDialogElement>; body: string }) {
  return (
    <dialog
      ref={ref}
      aria-labelledby="start-own-title"
      className="mx-auto mt-auto mb-0 w-full max-w-none rounded-t-3xl border border-surface-variant bg-surface-container-lowest p-6 text-on-surface shadow-xl backdrop:bg-on-surface/60 sm:m-auto sm:max-w-md sm:rounded-2xl sm:p-7"
    >
      <div
        className="mx-auto mb-4 h-1 w-12 rounded-full bg-surface-variant sm:hidden"
        aria-hidden="true"
      />
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <span className="mb-1 flex size-10 items-center justify-center rounded-lg bg-error-container text-on-error-container">
            <Icon name="error" className="size-5" />
          </span>
          <h2 id="start-own-title" className="font-serif text-headline-md text-on-surface">
            Start a separate wedding?
          </h2>
          <p className="text-body-md text-on-surface-variant">{body}</p>
        </div>
        <div className="flex flex-col gap-1 rounded-lg border border-surface-variant bg-surface-container-low p-3.5 text-body-sm text-on-surface-variant">
          <span className="font-semibold text-on-surface">What happens to your invitation?</span>
          <span>It stays open until it expires; you can still accept it from its email.</span>
        </div>
        <form method="dialog" className="flex flex-col gap-2">
          <button
            type="submit"
            autoFocus
            className="h-11 w-full rounded-md bg-primary text-label-md font-semibold text-on-primary transition-colors hover:bg-primary-container"
          >
            Go back to invitation
          </button>
          <Link
            href={routes.onboardingStartOwn}
            className="flex h-11 w-full items-center justify-center rounded-md border border-outline-variant bg-surface-container-lowest text-label-md font-semibold text-on-surface-variant transition-colors hover:bg-surface hover:text-on-surface"
          >
            Start my own wedding
          </Link>
        </form>
      </div>
    </dialog>
  );
}
