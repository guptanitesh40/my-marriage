'use client';

import { useRouter } from 'next/navigation';
import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { Drawer } from '@/components/ui/drawer';
import { OpenOnArrival } from '@/components/ui/open-on-arrival';
import { Icon } from '@/components/ui/icon';
import { people, type Guest, type GuestDetail } from '@/lib/guests/directory';
import { GuestDetails } from './guest-details';
import { GuestForm, type GuestEventChoice } from './guest-form';

interface GuestDrawerApi {
  /** Opens an empty form; only while the wedding can be changed. */
  add: (() => void) | null;
  view: (guest: Guest) => void;
  edit: ((guest: Guest) => void) | null;
}

const GuestDrawerContext = createContext<GuestDrawerApi | null>(null);

export function useGuestDrawer(): GuestDrawerApi | null {
  return useContext(GuestDrawerContext);
}

type Mode = { kind: 'add' } | { kind: 'view'; id: string } | { kind: 'edit'; id: string };

/**
 * The page's one drawer (Stitch "Guests & RSVP"): a guest's details and
 * private invitation, and, while the wedding can be changed, the form that
 * adds or edits one. After any change the list is fetched again.
 */
export function GuestDrawer({
  weddingId,
  guests,
  events,
  upcoming,
  coupleName,
  writable,
  canRemove,
  children,
}: {
  weddingId: string;
  guests: readonly Guest[];
  events: readonly GuestEventChoice[];
  /** The ceremonies still to come, which reminders can be about. */
  upcoming: readonly GuestEventChoice[];
  coupleName: string;
  writable: boolean;
  canRemove: boolean;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [announcement, setAnnouncement] = useState('');
  const [mode, setMode] = useState<Mode>({ kind: 'add' });
  const [version, setVersion] = useState(0);
  // A just-added guest is not in the list until it is fetched again.
  const [added, setAdded] = useState<Guest | null>(null);

  const current =
    mode.kind === 'add'
      ? undefined
      : (guests.find((guest) => guest.id === mode.id) ??
        (added?.id === mode.id ? added : undefined));

  function show(next: Mode) {
    setAnnouncement('');
    if (next.kind !== 'add' || mode.kind !== 'add') setVersion((v) => v + 1);
    setMode(next);
    if (!dialog.current?.open) dialog.current?.showModal();
  }

  function close() {
    dialog.current?.close();
  }

  function announce(message: string) {
    setAnnouncement(message);
    router.refresh();
  }

  function saved(detail: GuestDetail) {
    setAdded(detail.guest);
    setVersion((v) => v + 1);
    setMode({ kind: 'view', id: detail.guest.id });
    announce(
      mode.kind === 'edit'
        ? `${detail.guest.name} was updated.`
        : `${detail.guest.name} was added.`,
    );
  }

  const api: GuestDrawerApi = {
    add: writable ? () => show({ kind: 'add' }) : null,
    view: (guest) => show({ kind: 'view', id: guest.id }),
    edit: writable ? (guest) => show({ kind: 'edit', id: guest.id }) : null,
  };

  const viewing = mode.kind === 'view' && current;
  const editing = mode.kind === 'edit' && current;

  return (
    <GuestDrawerContext.Provider value={api}>
      {children}
      <OpenOnArrival open={api.add} />
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <Drawer
        dialog={dialog}
        titleId="guest-drawer-title"
        wide={Boolean(viewing)}
        eyebrow={viewing ? people(current.partySize) : editing ? 'Edit guest' : 'Guest list'}
        title={viewing || editing ? current.name : 'Add guest'}
        description={
          viewing
            ? undefined
            : 'A guest contact can represent a whole family. You can invite them to different events.'
        }
      >
        {viewing ? (
          <GuestDetails
            key={`${current.id}-${version}`}
            weddingId={weddingId}
            guest={current}
            events={events}
            upcoming={upcoming}
            coupleName={coupleName}
            writable={writable}
            canRemove={canRemove}
            onClose={close}
            onEdit={() => show({ kind: 'edit', id: current.id })}
            onChanged={announce}
            onRemoved={(message) => {
              close();
              setMode({ kind: 'add' });
              announce(message);
            }}
          />
        ) : writable && (mode.kind === 'add' || editing) ? (
          <GuestForm
            key={editing ? `edit-${current.id}-${version}` : `add-${version}`}
            weddingId={weddingId}
            guest={editing ? current : undefined}
            events={events}
            onCancel={editing ? () => show({ kind: 'view', id: current.id }) : close}
            onSaved={saved}
          />
        ) : null}
      </Drawer>
    </GuestDrawerContext.Provider>
  );
}

/** Opens the page's drawer on a new guest; nothing on a read-only page. */
export function AddGuestButton({ children }: { children: ReactNode }) {
  const drawer = useGuestDrawer();
  if (!drawer?.add) return null;
  return (
    <button
      type="button"
      onClick={drawer.add}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-title-sm text-on-primary shadow-md transition-colors hover:bg-primary-container"
    >
      <Icon name="person-add" className="size-5" />
      {children}
    </button>
  );
}
