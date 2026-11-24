'use client';

import { useRouter } from 'next/navigation';
import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { Drawer } from '@/components/ui/drawer';
import { OpenOnArrival } from '@/components/ui/open-on-arrival';
import { Icon } from '@/components/ui/icon';
import type { components } from '@my-marriage/contracts';
import { EventForm } from './event-form';

type WeddingEvent = components['schemas']['EventDto'];

interface EventDrawerApi {
  add: () => void;
  edit: (event: WeddingEvent) => void;
  /** Tells screen readers what changed, after the change has left the page. */
  announce: (message: string) => void;
}

const DrawerContext = createContext<EventDrawerApi | null>(null);

/** The page's drawer, or null on a read-only page, where nothing can be changed. */
export function useEventDrawer(): EventDrawerApi | null {
  return useContext(DrawerContext);
}

/**
 * The drawer that adds or changes a ceremony, once per page, opened by
 * AddEventButton and the cards' Edit buttons. A native modal <dialog>:
 * focus stays inside while it is open, Escape closes it, and focus returns
 * to the button that opened it. After a save the list is fetched again
 * from the server, and the change is announced.
 */
export function EventDrawer({ weddingId, children }: { weddingId: string; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [announcement, setAnnouncement] = useState('');
  const [editing, setEditing] = useState<WeddingEvent | null>(null);
  // A fresh form after each save and for each edit; a closed "add" drawer
  // keeps what was typed.
  const [formKey, setFormKey] = useState(0);

  function show(event: WeddingEvent | null) {
    setAnnouncement('');
    if (event || editing) setFormKey((key) => key + 1);
    setEditing(event);
    dialog.current?.showModal();
  }

  function close() {
    dialog.current?.close();
  }

  function saved(title: string) {
    close();
    setFormKey((key) => key + 1);
    setAnnouncement(editing ? `${title} was updated.` : `${title} was added to your events.`);
    setEditing(null);
    router.refresh();
  }

  const drawer: EventDrawerApi = {
    add: () => show(null),
    edit: (event) => show(event),
    announce: setAnnouncement,
  };

  return (
    <DrawerContext.Provider value={drawer}>
      {children}
      <OpenOnArrival open={drawer.add} />
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <Drawer
        dialog={dialog}
        titleId="event-drawer-title"
        eyebrow={editing ? 'Edit ceremony' : 'New ceremony'}
        title={editing ? editing.title : 'Add a ceremony'}
      >
        <EventForm
          key={editing ? `edit-${editing.id}-${formKey}` : `add-${formKey}`}
          weddingId={weddingId}
          event={editing ?? undefined}
          onCancel={close}
          onSaved={saved}
        />
      </Drawer>
    </DrawerContext.Provider>
  );
}

/** Opens the page's drawer on a new ceremony. */
export function AddEventButton({
  children,
  variant = 'primary',
}: {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
}) {
  const drawer = useEventDrawer();
  if (!drawer) return null;
  return (
    <button
      type="button"
      onClick={drawer.add}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-5 py-2.5 text-label-md font-semibold shadow-sm transition-colors ${
        variant === 'primary'
          ? 'bg-primary text-on-primary hover:bg-primary-container'
          : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
      }`}
    >
      <Icon name="add" className="size-4.5" />
      {children}
    </button>
  );
}
