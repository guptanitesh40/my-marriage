'use client';

import type { components } from '@my-marriage/contracts';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { FormAlert } from '@/components/forms/form-alert';
import { Icon } from '@/components/ui/icon';
import { api } from '@/lib/api/browser';
import { networkFailure, toFailure } from '@/lib/api/errors';
import { openTasks } from '@/lib/team/format';
import { ROLE_SCOPE } from '@/lib/weddings/roles';
import { DANGER_BUTTON, PLAIN_BUTTON, PRIMARY_BUTTON, Sheet } from '@/components/ui/sheet';

type Member = components['schemas']['TeamMemberDto'];
type Open = 'details' | 'label' | 'remove' | null;

/**
 * A member's menu (Stitch "Manager Detail & Remove"): their details,
 * making a manager an admin or back, their label, and removing them. An
 * owner (`protectedOwner`) only has a label to change: the bride and groom
 * are never changed or removed. The API checks all of it again.
 */
export function MemberActions({
  weddingId,
  member,
  protectedOwner = false,
}: {
  weddingId: string;
  member: Member;
  protectedOwner?: boolean;
}) {
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [open, setOpen] = useState<Open>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const canChange = !protectedOwner && !member.isYou;
  const otherRole = member.role === 'admin' ? 'manager' : 'admin';

  useEffect(() => {
    if (!menu) return;
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setMenu(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setMenu(false);
      toggle.current?.focus();
    }
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [menu]);

  function show(next: Open) {
    setMenu(false);
    setProblem(null);
    setOpen(next);
  }

  async function update(body: { role?: 'admin' | 'manager'; label?: string | null }) {
    setBusy(true);
    setProblem(null);
    try {
      const { data, error, response } = await api.PATCH(
        '/api/v1/weddings/{weddingId}/members/{memberId}',
        { params: { path: { weddingId, memberId: member.userId } }, body },
      );
      if (data) {
        setOpen(null);
        setMenu(false);
        router.refresh();
      } else {
        setProblem(toFailure(response.status, error).message);
      }
    } catch {
      setProblem(networkFailure().message);
    }
    setBusy(false);
  }

  async function remove() {
    setBusy(true);
    setProblem(null);
    try {
      const { error, response } = await api.DELETE(
        '/api/v1/weddings/{weddingId}/members/{memberId}',
        { params: { path: { weddingId, memberId: member.userId } } },
      );
      if (response.ok) {
        setOpen(null);
        router.refresh();
      } else {
        setProblem(toFailure(response.status, error).message);
      }
    } catch {
      setProblem(networkFailure().message);
    }
    setBusy(false);
  }

  function saveLabel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const label = String(new FormData(event.currentTarget).get('label') ?? '').trim();
    void update({ label: label || null });
  }

  const item =
    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-body-sm text-on-surface hover:bg-surface-container';

  return (
    <div ref={root} className="relative">
      <button
        ref={toggle}
        type="button"
        aria-expanded={menu}
        aria-controls={menuId}
        onClick={() => setMenu((value) => !value)}
        className="flex size-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container"
      >
        <Icon name="more-vert" className="size-5" label={`Actions for ${member.displayName}`} />
      </button>
      {problem && open === null && (
        <p
          role="alert"
          className="absolute top-full right-0 z-10 mt-1 w-56 text-body-sm text-error"
        >
          {problem}
        </p>
      )}
      {menu && (
        <div
          id={menuId}
          className="absolute top-full right-0 z-40 mt-1 flex w-60 flex-col rounded-xl bg-surface-container-lowest p-1.5 shadow-xl ring-1 ring-outline-variant/50"
        >
          <button type="button" className={item} onClick={() => show('details')}>
            <Icon name="visibility" className="size-4.5 text-on-surface-variant" />
            View details
          </button>
          {canChange && (
            <button
              type="button"
              className={item}
              disabled={busy}
              onClick={() => void update({ role: otherRole })}
            >
              <Icon name="admin-panel-settings" className="size-4.5 text-on-surface-variant" />
              {otherRole === 'admin' ? 'Make admin' : 'Make manager'}
            </button>
          )}
          <button type="button" className={item} onClick={() => show('label')}>
            <Icon name="edit" className="size-4.5 text-on-surface-variant" />
            {member.label ? 'Change label' : 'Add a label'}
          </button>
          {canChange && (
            <button
              type="button"
              className={`${item} text-error hover:bg-error-container/40`}
              onClick={() => show('remove')}
            >
              <Icon name="person-remove" className="size-4.5" />
              Remove access
            </button>
          )}
        </div>
      )}

      <Sheet
        open={open === 'details'}
        onClose={() => setOpen(null)}
        side
        eyebrow={ROLE_SCOPE[member.role].title}
        title={member.displayName}
        description={[member.label, member.email].filter(Boolean).join(' · ')}
      >
        <dl className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-surface-container-low p-4">
            <dt className="text-label-sm tracking-wider text-on-surface-variant uppercase">
              Assigned tasks
            </dt>
            <dd className="mt-1 font-serif text-headline-md text-on-surface">
              {member.openTaskCount}
            </dd>
            <dd className="text-body-sm text-on-surface-variant">not done yet</dd>
          </div>
          <div className="rounded-xl bg-surface-container-low p-4">
            <dt className="text-label-sm tracking-wider text-on-surface-variant uppercase">
              Access level
            </dt>
            <dd className="mt-1 text-title-md text-on-surface">{ROLE_SCOPE[member.role].title}</dd>
            <dd className="text-body-sm text-on-surface-variant">
              {member.role === 'owner' ? 'Protected' : 'Can be changed'}
            </dd>
          </div>
        </dl>
        <div className="flex flex-col gap-2">
          <p className="text-label-sm font-semibold tracking-wider text-secondary uppercase">
            Permissions
          </p>
          <ul className="flex flex-col gap-2 text-body-sm text-on-surface">
            {ROLE_SCOPE[member.role].can.map((line) => (
              <li key={line} className="flex items-start gap-2">
                <Icon name="check" className="mt-0.5 size-4 shrink-0 text-primary" />
                {line}
              </li>
            ))}
            <li className="flex items-start gap-2 text-on-surface-variant">
              <Icon name="block" className="mt-0.5 size-4 shrink-0 text-error" />
              {ROLE_SCOPE[member.role].cannot}
            </li>
          </ul>
        </div>
        <div className="mt-auto flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-between">
          {canChange ? (
            <button
              type="button"
              onClick={() => setOpen('remove')}
              className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-label-md font-semibold text-error hover:bg-error-container/40"
            >
              <Icon name="person-remove" className="size-5" />
              Remove access…
            </button>
          ) : (
            <span />
          )}
          <button type="button" onClick={() => setOpen(null)} className={PRIMARY_BUTTON}>
            Done
          </button>
        </div>
      </Sheet>

      <Sheet
        open={open === 'label'}
        onClose={() => setOpen(null)}
        title={member.label ? 'Change label' : 'Add a label'}
        description={`Shown beside ${member.displayName}’s name on the team page.`}
      >
        <form onSubmit={saveLabel} className="flex flex-col gap-4">
          {problem && <FormAlert tone="error">{problem}</FormAlert>}
          <LabelField initial={member.label ?? ''} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setOpen(null)} className={PLAIN_BUTTON}>
              Cancel
            </button>
            <button type="submit" disabled={busy} className={PRIMARY_BUTTON}>
              {busy ? 'Saving…' : 'Save label'}
            </button>
          </div>
        </form>
      </Sheet>

      <Sheet
        open={open === 'remove'}
        onClose={() => setOpen(null)}
        title={`Remove ${member.displayName}?`}
        description={`${member.displayName} will no longer be able to open or manage this wedding. Everything they added stays.`}
      >
        <div className="flex flex-col gap-4">
          {member.openTaskCount > 0 && (
            <p className="flex items-start gap-2 rounded-lg bg-secondary-fixed/40 p-3 text-body-sm text-on-surface">
              <Icon name="info" className="mt-0.5 size-4 shrink-0 text-secondary" />
              {openTasks(member.openTaskCount)} assigned to them will become unassigned.
            </p>
          )}
          {problem && <FormAlert tone="error">{problem}</FormAlert>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setOpen(null)} className={PLAIN_BUTTON}>
              Keep {member.role === 'admin' ? 'admin' : 'manager'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void remove()}
              className={DANGER_BUTTON}
            >
              <Icon name="person-remove" className="size-5" />
              {busy ? 'Removing…' : 'Remove access'}
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}

function LabelField({ initial }: { initial: string }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-label-md text-on-surface">
        Label
      </label>
      <input
        id={id}
        name="label"
        defaultValue={initial}
        maxLength={40}
        placeholder="e.g. Bride’s father"
        className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-body-md text-on-surface focus:border-primary focus:outline-2 focus:outline-primary/30"
      />
      <p className="text-body-sm text-on-surface-variant">Leave it empty to remove the label.</p>
    </div>
  );
}
