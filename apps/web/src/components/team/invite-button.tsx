'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent, type ReactNode } from 'react';
import { FormAlert } from '@/components/forms/form-alert';
import { Icon } from '@/components/ui/icon';
import { api } from '@/lib/api/browser';
import { networkFailure, toFailure, waitMessage } from '@/lib/api/errors';
import { ROLE_SCOPE } from '@/lib/weddings/roles';
import { PLAIN_BUTTON, PRIMARY_BUTTON, Sheet } from '@/components/ui/sheet';

/** `handOver`: an owner giving their own place to someone (decision 0025). */
type HelperRole = 'admin' | 'manager' | 'handOver';

const ROLE_HELP: Record<HelperRole, string> = {
  manager:
    'Helps with events, tasks, vendors, expenses, guests, the website and photos. Doesn’t manage the team.',
  admin:
    'Plans everything and runs the team with you: invites, removes and changes helpers. Can’t remove the bride or groom or archive the wedding.',
  handOver:
    'Hand over your ownership. Once they accept they become an owner in your place, and you stay on the team as an admin. They can already be on your team.',
};

/**
 * "Invite someone" (Stitch "Invite a manager" drawer): an admin or a
 * manager, with an optional label such as "Bride's father", or, for an
 * owner (`canHandOver`), someone to take over their place as an owner
 * (decision 0025), confirmed before it is sent. `partner` invites the
 * second owner instead (owners only). The email carries a private link;
 * nothing is granted or given up until they accept.
 */
export function InviteButton({
  weddingId,
  kind,
  variant = 'primary',
  canHandOver = false,
  initialRole = 'manager',
  children,
}: {
  weddingId: string;
  kind: 'helper' | 'partner';
  variant?: 'primary' | 'secondary';
  canHandOver?: boolean;
  initialRole?: HelperRole;
  children: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<HelperRole>(initialRole);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState(false);
  const partner = kind === 'partner';
  const handOver = !partner && canHandOver && role === 'handOver';
  const roles: HelperRole[] = canHandOver ? ['manager', 'admin', 'handOver'] : ['manager', 'admin'];
  const id = `${kind}-${initialRole}`;

  function close() {
    setOpen(false);
    setAlert(null);
    setEmailError(null);
    setConfirmError(false);
    setConfirmed(false);
    setRole(initialRole);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const label = String(form.get('label') ?? '').trim();
    setAlert(null);
    setEmailError(null);
    setConfirmError(false);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Enter an email address, like name@example.com.');
      return;
    }
    if (handOver && !confirmed) {
      setConfirmError(true);
      return;
    }
    setPending(true);
    try {
      const { data, error, response } = await api.POST(
        '/api/v1/weddings/{weddingId}/member-invites',
        {
          params: { path: { weddingId } },
          body: {
            email,
            role: partner || handOver ? 'owner' : role === 'admin' ? 'admin' : 'manager',
            ...(handOver ? { handOver: true } : {}),
            ...(label ? { label } : {}),
          },
        },
      );
      if (data) {
        setPending(false);
        close();
        router.refresh();
        return;
      }
      const failure = toFailure(response.status, error);
      const field = failure.fields.email?.[0];
      if (field) setEmailError(field);
      else setAlert(failure.code === 'RATE_LIMITED' ? waitMessage(failure) : failure.message);
    } catch {
      setAlert(networkFailure().message);
    }
    setPending(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={variant === 'primary' ? PRIMARY_BUTTON : PLAIN_BUTTON}
      >
        {children}
      </button>
      <Sheet
        open={open}
        onClose={close}
        side
        eyebrow={partner ? 'Second owner' : 'Team & Family'}
        title={
          partner
            ? 'Invite your partner'
            : initialRole === 'handOver'
              ? 'Hand over ownership'
              : 'Invite someone'
        }
        description={
          partner
            ? 'They become an equal owner of the wedding, with the same rights as you.'
            : initialRole === 'handOver'
              ? 'Give your place as an owner to the person this wedding really belongs to.'
              : 'Invite someone you trust to help plan your wedding.'
        }
      >
        <form noValidate onSubmit={submit} className="flex flex-1 flex-col gap-5">
          {alert && (
            <FormAlert tone="error" title="Couldn’t send the invitation">
              {alert}
            </FormAlert>
          )}
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-email`} className="text-label-md text-on-surface">
              Email address
            </label>
            <div className="relative">
              <Icon
                name="mail"
                className="pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2 text-on-surface-variant"
              />
              <input
                id={`${id}-email`}
                name="email"
                type="email"
                autoComplete="off"
                required
                aria-invalid={emailError ? true : undefined}
                aria-describedby={`${id}-email-hint`}
                className="w-full rounded-md border border-outline-variant bg-surface-container-lowest py-2.5 pr-3 pl-10 text-body-md text-on-surface focus:border-primary focus:outline-2 focus:outline-primary/30"
              />
            </div>
            <p
              id={`${id}-email-hint`}
              className={`text-body-sm ${emailError ? 'text-error' : 'text-on-surface-variant'}`}
            >
              {emailError ?? 'We’ll send them a private link to accept.'}
            </p>
          </div>

          {!partner && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-label-md text-on-surface">Role</legend>
              {roles.map((option) => (
                <label
                  key={option}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl p-3 ring-1 transition-colors ${
                    role === option
                      ? 'bg-primary-fixed/40 ring-primary'
                      : 'bg-surface-container-low ring-transparent hover:bg-surface-container'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={option}
                    checked={role === option}
                    onChange={() => setRole(option)}
                    className="mt-1 size-4 accent-primary"
                  />
                  <span>
                    <span className="block text-title-sm text-on-surface">
                      {option === 'handOver' ? 'Owner, in my place' : ROLE_SCOPE[option].title}
                    </span>
                    <span className="block text-body-sm text-on-surface-variant">
                      {ROLE_HELP[option]}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-label`} className="text-label-md text-on-surface">
              Label <span className="font-normal text-on-surface-variant">(optional)</span>
            </label>
            <input
              id={`${id}-label`}
              name="label"
              maxLength={40}
              placeholder={
                partner || handOver ? 'e.g. Groom' : 'e.g. Bride’s father, Wedding planner'
              }
              className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-body-md text-on-surface focus:border-primary focus:outline-2 focus:outline-primary/30"
            />
            <p className="text-body-sm text-on-surface-variant">
              Shown beside their name on the team page.
            </p>
          </div>

          {handOver && (
            <div className="flex flex-col gap-3 rounded-xl bg-error-container/30 p-4 ring-1 ring-error/20">
              <p className="flex items-start gap-2 text-body-sm text-on-surface">
                <Icon name="warning" className="mt-0.5 size-4.5 shrink-0 text-error" />
                <span>
                  <strong className="font-semibold">
                    When they accept, you stop being an owner.
                  </strong>{' '}
                  You stay on the team as an admin, but you can no longer archive or delete the
                  wedding, change owners or hide photos. Only an owner could make you an owner
                  again. Any other owner stays an owner.
                </span>
              </p>
              <label className="flex cursor-pointer items-start gap-3 text-body-sm text-on-surface">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => {
                    setConfirmed(event.target.checked);
                    if (event.target.checked) setConfirmError(false);
                  }}
                  aria-invalid={confirmError || undefined}
                  aria-describedby={confirmError ? `${id}-confirm-error` : undefined}
                  className="mt-0.5 size-4.5 shrink-0 accent-primary"
                />
                I understand: I’m handing over my ownership and will become an admin.
              </label>
              {confirmError && (
                <p id={`${id}-confirm-error`} role="alert" className="text-body-sm text-error">
                  Tick the box to confirm you want to hand over your ownership.
                </p>
              )}
            </div>
          )}

          <p className="flex items-start gap-2 rounded-lg bg-surface-container-low p-3 text-body-sm text-on-surface-variant">
            <Icon name="info" className="mt-0.5 size-4 shrink-0 text-secondary" />
            They can join with this address whether or not they already have an account. Any wedding
            of their own stays as it is.
          </p>

          <div className="mt-auto flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={close} className={PLAIN_BUTTON}>
              Cancel
            </button>
            <button type="submit" disabled={pending} className={PRIMARY_BUTTON}>
              <Icon name="forward-to-inbox" className="size-5" />
              {pending ? 'Sending…' : handOver ? 'Send hand-over invitation' : 'Send invitation'}
            </button>
          </div>
        </form>
      </Sheet>
    </>
  );
}
