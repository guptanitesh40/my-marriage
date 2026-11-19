'use client';

import type { components } from '@my-marriage/contracts';
import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import { useFocusFirstProblem } from '@/components/auth/hooks';
import { FormAlert } from '@/components/forms/form-alert';
import { SubmitButton } from '@/components/forms/submit-button';
import { TextField } from '@/components/forms/text-field';
import { ButtonLink } from '@/components/ui/button-link';
import { Icon } from '@/components/ui/icon';
import { api } from '@/lib/api/browser';
import { networkFailure, toFailure, waitMessage } from '@/lib/api/errors';
import { emailError, type FieldErrors } from '@/lib/auth/validation';
import { routes } from '@/lib/routes';
import { longDate } from '@/lib/weddings/format';
import { StepHeading, StepProgress, stepCardClass } from './step-progress';

type MemberInvite = components['schemas']['MemberInviteDto'];

const backLinkClass =
  'mb-6 inline-flex items-center gap-1.5 rounded-sm text-label-md font-semibold text-on-surface-variant transition-colors hover:text-on-surface';

/**
 * Step 2 of onboarding (Stitch "Step 2: Partner" and "Sent State"): invite
 * your partner as the wedding's second owner, or skip. Once sent, shows the
 * pending invitation, with resend; "Edit invitation" sends one to another
 * address, which replaces it. The page passes in what the API says, so a
 * refresh shows the same state.
 */
export function PartnerInvite({
  weddingId,
  initial,
  created,
}: {
  weddingId: string;
  /** The pending (or expired) partner invitation, if there is one. */
  initial?: MemberInvite;
  /** "Ananya & Arjun’s wedding is created." with place and date, right after step 1. */
  created?: { couple: string; details: string };
}) {
  const [invite, setInvite] = useState(initial);
  const [editing, setEditing] = useState(!initial);

  if (invite && !editing) {
    return <SentInvitation weddingId={weddingId} invite={invite} onEdit={() => setEditing(true)} />;
  }
  return (
    <InviteForm
      weddingId={weddingId}
      defaultEmail={invite?.email}
      created={invite ? undefined : created}
      onSent={(sent) => {
        setInvite(sent);
        setEditing(false);
      }}
    />
  );
}

function InviteForm({
  weddingId,
  defaultEmail,
  created,
  onSent,
}: {
  weddingId: string;
  defaultEmail?: string;
  created?: { couple: string; details: string };
  onSent: (invite: MemberInvite) => void;
}) {
  const form = useRef<HTMLFormElement>(null);
  const focusProblem = useFocusFirstProblem(form);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [alert, setAlert] = useState<string | null>(null);

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
      const { data, error, response } = await api.POST(
        '/api/v1/weddings/{weddingId}/member-invites',
        { params: { path: { weddingId } }, body: { email, role: 'owner' } },
      );
      if (data) {
        onSent(data.data);
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
    <>
      <Link href={routes.onboarding} className={backLinkClass}>
        <Icon name="arrow-back" className="size-4" />
        Back to wedding details
      </Link>
      <StepProgress step={2} title="Invite your partner" aside="Optional" />
      {created && (
        <div className="mb-8 flex gap-3 rounded-lg border border-primary-fixed-dim bg-primary-fixed/60 px-4 py-3 text-body-sm text-on-primary-fixed">
          <Icon name="check-circle" className="mt-0.5 size-5 shrink-0" />
          <p role="status">
            <span className="font-semibold">{created.couple}’s wedding is created.</span>{' '}
            {created.details}.
          </p>
        </div>
      )}
      <StepHeading
        title="Better together"
        intro="Invite your partner to plan with you as an equal owner. You can also skip this and invite them any time later."
      />
      <div className={stepCardClass}>
        <form ref={form} noValidate onSubmit={submit} className="flex flex-col gap-5">
          {alert && (
            <FormAlert tone="error" title="Unable to send the invitation">
              {alert}
            </FormAlert>
          )}
          <TextField
            id="email"
            name="email"
            type="email"
            label="Partner’s email address"
            labelAside={
              <span className="text-label-sm text-on-surface-variant">
                Will receive owner rights
              </span>
            }
            placeholder="name@example.com"
            autoComplete="off"
            inputMode="email"
            trailingIcon="forward-to-inbox"
            required
            defaultValue={defaultEmail}
            error={errors.email}
          />
          <div className="flex gap-3 rounded-lg bg-surface-container-low p-4 text-body-sm text-on-surface-variant">
            <Icon name="groups" className="mt-0.5 size-5 shrink-0 text-secondary" />
            <div>
              <p className="font-semibold text-on-surface">Equal ownership</p>
              <p className="mt-0.5">
                Your partner gets the same owner rights as you once they accept. Your planning can
                start now, even while the invitation is pending.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <SubmitButton pending={pending} pendingLabel="Sending…">
              <Icon name="forward-to-inbox" className="size-4" />
              Send invitation
            </SubmitButton>
            <ButtonLink href={routes.dashboard} variant="secondary" size="lg" className="w-full">
              I’ll do this later
            </ButtonLink>
          </div>
        </form>
      </div>
      <p className="mt-6 px-2 text-body-sm text-on-surface-variant">
        We email only the address you enter, and only about this invitation.
      </p>
    </>
  );
}

function SentInvitation({
  weddingId,
  invite,
  onEdit,
}: {
  weddingId: string;
  invite: MemberInvite;
  onEdit: () => void;
}) {
  const [current, setCurrent] = useState(invite);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const expired = current.status === 'expired';

  async function resend() {
    if (pending) return;
    setPending(true);
    setNotice(null);
    try {
      const { data, error, response } = await api.POST(
        '/api/v1/weddings/{weddingId}/member-invites/{inviteId}/resend',
        { params: { path: { weddingId, inviteId: current.id } } },
      );
      if (data) {
        setCurrent(data.data);
        setNotice({
          tone: 'success',
          text: `A new link is on its way to ${data.data.email}. Earlier links no longer work.`,
        });
      } else {
        const failure = toFailure(response.status, error);
        setNotice({
          tone: 'error',
          text: failure.code === 'RATE_LIMITED' ? waitMessage(failure) : failure.message,
        });
      }
    } catch {
      setNotice({ tone: 'error', text: networkFailure().message });
    }
    setPending(false);
  }

  return (
    <>
      <button type="button" onClick={onEdit} className={backLinkClass}>
        <Icon name="arrow-back" className="size-4" />
        Edit invitation
      </button>
      <StepProgress step={2} title="Invite your partner" aside="Invitation sent" />
      <StepHeading
        title="Invitation on its way"
        intro="Your partner has been invited to plan with you as an equal owner. Your planning can start now."
      />
      <div className={stepCardClass}>
        {notice && (
          <FormAlert tone={notice.tone} title={notice.tone === 'error' ? 'Not sent' : undefined}>
            {notice.text}
          </FormAlert>
        )}
        {!notice && current.emailStatus === 'failed' && (
          <FormAlert tone="error" title="The email could not be sent">
            Check the address, or resend the invitation.
          </FormAlert>
        )}
        {!notice && expired && (
          <FormAlert tone="error" title="This invitation has expired">
            It stopped working on {longDate(current.expiresAt)}. Resend it to send a new link.
          </FormAlert>
        )}
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed">
            <Icon name="check" className="size-4" />
          </span>
          <div>
            <p className="text-body-md font-semibold text-on-surface">
              Invitation sent to {current.email}
            </p>
            {!expired && (
              <p className="text-body-sm text-on-surface-variant">
                Pending acceptance · The link works until {longDate(current.expiresAt)}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-surface-container-low p-4">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary-container font-semibold text-on-surface uppercase"
            aria-hidden="true"
          >
            {current.email.charAt(0)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-md font-semibold text-on-surface">{current.email}</p>
            <p className="text-body-sm text-on-surface-variant">
              Co-owner · rights start once they accept
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-secondary-container px-2.5 py-1 text-label-sm font-semibold text-on-surface">
            {expired ? 'Expired' : 'Pending'}
          </span>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => void resend()}
            disabled={pending}
            aria-busy={pending || undefined}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-surface-container px-7 py-3.5 text-label-md font-semibold text-on-surface transition-colors hover:bg-surface-container-high disabled:cursor-wait"
          >
            <Icon name="sync" className="size-4" />
            {pending ? 'Sending…' : 'Resend invitation'}
          </button>
          <ButtonLink href={routes.dashboard} size="lg" className="flex-1">
            Continue to your dashboard
          </ButtonLink>
        </div>
      </div>
    </>
  );
}
