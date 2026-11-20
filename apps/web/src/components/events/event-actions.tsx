'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { FormAlert } from '@/components/forms/form-alert';
import { Icon } from '@/components/ui/icon';
import { api } from '@/lib/api/browser';
import { networkFailure, toFailure } from '@/lib/api/errors';
import { eventTone } from '@/lib/events/presets';
import { expensesPath, vendorsPath } from '@/lib/routes';
import type { components } from '@my-marriage/contracts';
import { useEventDrawer } from './event-drawer';

type WeddingEvent = components['schemas']['EventDto'];

const menuItemClass =
  'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-body-sm transition-colors';

/**
 * A card's "Manage" button, which opens the ceremony in the drawer, and
 * its "⋮" menu (Stitch "Events Management"): the ceremony's tasks, vendors
 * and expenses and, for owners only (managers have no delete actions), Delete.
 * Nothing shows on a read-only page; the API decides in the end.
 */
export function EventActions({
  weddingId,
  event,
  tasksHref,
  canDelete,
}: {
  weddingId: string;
  event: WeddingEvent;
  /** The Tasks page, filtered to this ceremony. */
  tasksHref: string;
  canDelete: boolean;
}) {
  const drawer = useEventDrawer();
  const [menuOpen, setMenuOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const confirmDialog = useRef<HTMLDialogElement>(null);
  const menuId = `event-${event.id}-menu`;

  // Closes on a click outside or Escape, like any menu.
  useEffect(() => {
    if (!menuOpen) return;
    function outside(e: MouseEvent) {
      if (!menu.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    function escape(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      setMenuOpen(false);
      toggle.current?.focus();
    }
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [menuOpen]);

  if (!drawer) return null;

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => drawer.edit(event)}
        aria-label={`Manage ${event.title}`}
        className={`inline-flex items-center gap-1 rounded-lg px-3.5 py-2 text-title-sm transition-colors ${
          // The wedding itself gets the filled button, as in the design.
          eventTone(event.title) === 'main'
            ? 'bg-primary text-on-primary shadow-sm hover:bg-primary-container'
            : 'bg-surface text-primary hover:bg-primary-fixed hover:text-on-primary-fixed'
        }`}
      >
        Manage
        <Icon name="arrow-forward" className="size-4" />
      </button>

      <div ref={menu} className="relative">
        <button
          ref={toggle}
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls={menuId}
          aria-label={`More for ${event.title}`}
          className="rounded-lg p-2 text-outline transition-colors hover:bg-surface hover:text-on-surface"
        >
          <Icon name="more-vert" className="size-4.5" />
        </button>
        {menuOpen && (
          <div
            id={menuId}
            className="absolute right-0 z-20 mt-1 flex w-52 flex-col gap-0.5 rounded-xl bg-surface-container-lowest p-1.5 shadow-lg ring-1 ring-outline-variant/40"
          >
            <Link
              href={tasksHref}
              className={`${menuItemClass} text-on-surface hover:bg-surface-container`}
            >
              <Icon name="checklist" className="size-4.5 text-on-surface-variant" />
              View tasks
            </Link>
            <Link
              href={vendorsPath(weddingId, new URLSearchParams({ eventId: event.id }))}
              className={`${menuItemClass} text-on-surface hover:bg-surface-container`}
            >
              <Icon name="storefront" className="size-4.5 text-on-surface-variant" />
              View vendors
            </Link>
            <Link
              href={expensesPath(weddingId, new URLSearchParams({ eventId: event.id }))}
              className={`${menuItemClass} text-on-surface hover:bg-surface-container`}
            >
              <Icon name="account-balance-wallet" className="size-4.5 text-on-surface-variant" />
              View expenses
            </Link>
            {canDelete && (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  confirmDialog.current?.showModal();
                }}
                className={`${menuItemClass} text-error hover:bg-error-container hover:text-on-error-container`}
              >
                <Icon name="delete" className="size-4.5" />
                Delete ceremony
              </button>
            )}
          </div>
        )}
      </div>

      {canDelete && (
        <DeleteEventDialog
          dialog={confirmDialog}
          weddingId={weddingId}
          event={event}
          onDeleted={() => drawer.announce(`${event.title} was deleted.`)}
        />
      )}
    </div>
  );
}

/** Asks before deleting, in a modal dialog; Escape or Cancel keeps the ceremony. */
function DeleteEventDialog({
  dialog,
  weddingId,
  event,
  onDeleted,
}: {
  dialog: React.RefObject<HTMLDialogElement | null>;
  weddingId: string;
  event: WeddingEvent;
  onDeleted: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const titleId = `delete-event-${event.id}-title`;

  async function confirm() {
    if (pending) return;
    setPending(true);
    setAlert(null);
    try {
      const { error, response } = await api.DELETE(
        '/api/v1/weddings/{weddingId}/events/{eventId}',
        { params: { path: { weddingId, eventId: event.id } } },
      );
      // Already gone counts as done: someone else deleted it first.
      if (response.ok || response.status === 404) {
        dialog.current?.close();
        onDeleted();
        router.refresh();
        return;
      }
      const failure = toFailure(response.status, error);
      setAlert(failure.message);
      if (failure.code === 'WEDDING_ARCHIVED') router.refresh();
    } catch {
      setAlert(networkFailure().message);
    }
    setPending(false);
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onClose={() => setAlert(null)}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl bg-surface-container-lowest p-6 text-on-surface shadow-xl backdrop:bg-on-surface/50"
    >
      <h2 id={titleId} className="font-serif text-headline-sm wrap-break-word text-on-surface">
        Delete {event.title}?
      </h2>
      <p className="mt-2 text-body-md text-on-surface-variant">
        It will be removed from your events. Its tasks stay, as General tasks. This can’t be undone
        here.
      </p>
      {alert && (
        <div className="mt-4">
          <FormAlert tone="error" title="Unable to delete the ceremony">
            {alert}
          </FormAlert>
        </div>
      )}
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          autoFocus
          onClick={() => dialog.current?.close()}
          className="flex-1 rounded-md bg-surface-container px-4 py-2.5 text-label-md font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={pending}
          aria-disabled={pending}
          className="flex-1 rounded-md bg-error px-4 py-2.5 text-label-md font-semibold text-on-error transition-colors hover:opacity-90 disabled:opacity-60"
        >
          {pending ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </dialog>
  );
}
