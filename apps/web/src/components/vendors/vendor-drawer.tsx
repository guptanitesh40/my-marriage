'use client';

import { useRouter } from 'next/navigation';
import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { Drawer } from '@/components/ui/drawer';
import { Icon } from '@/components/ui/icon';
import type { Vendor } from '@/lib/vendors/directory';
import { VendorDetails } from './vendor-details';
import { VendorForm, type VendorEventChoice } from './vendor-form';

interface VendorDrawerApi {
  /** Opens an empty form; only on a page that can be changed. */
  add: (() => void) | null;
  view: (vendor: Vendor) => void;
  /** Opens the vendor in the form; only on a page that can be changed. */
  edit: ((vendor: Vendor) => void) | null;
  /** Tells screen readers what happened. */
  announce: (message: string) => void;
}

const VendorDrawerContext = createContext<VendorDrawerApi | null>(null);

export function useVendorDrawer(): VendorDrawerApi | null {
  return useContext(VendorDrawerContext);
}

type Mode = { kind: 'add' } | { kind: 'view'; id: string } | { kind: 'edit'; id: string };

/**
 * The page's one drawer (Stitch "Vendors Management"): a vendor's details,
 * and, when the wedding can be changed, the form that adds or edits one.
 * The vendor shown is always the one in the latest list, so after a save
 * the details show what the server stored.
 */
export function VendorDrawer({
  weddingId,
  vendors,
  events,
  writable,
  canDelete,
  children,
}: {
  weddingId: string;
  vendors: readonly Vendor[];
  events: readonly VendorEventChoice[];
  writable: boolean;
  /** Owners of an active wedding; managers cannot delete (as for events). */
  canDelete: boolean;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [announcement, setAnnouncement] = useState('');
  const [mode, setMode] = useState<Mode>({ kind: 'add' });
  // A fresh form after each save and for each edit; a closed "add" drawer
  // keeps what was typed.
  const [formKey, setFormKey] = useState(0);

  const current = mode.kind === 'add' ? undefined : vendors.find((v) => v.id === mode.id);

  function show(next: Mode) {
    setAnnouncement('');
    if (next.kind !== 'add' || mode.kind !== 'add') setFormKey((key) => key + 1);
    setMode(next);
    if (!dialog.current?.open) dialog.current?.showModal();
  }

  function close() {
    dialog.current?.close();
  }

  function saved(vendor: Vendor) {
    setFormKey((key) => key + 1);
    if (mode.kind === 'edit') {
      // Back to the details, which show the change once the list is fetched again.
      setMode({ kind: 'view', id: vendor.id });
      setAnnouncement(`${vendor.name} was updated.`);
    } else {
      close();
      setMode({ kind: 'add' });
      setAnnouncement(`${vendor.name} was added to your vendors.`);
    }
    router.refresh();
  }

  const api: VendorDrawerApi = {
    add: writable ? () => show({ kind: 'add' }) : null,
    view: (vendor) => show({ kind: 'view', id: vendor.id }),
    edit: writable ? (vendor) => show({ kind: 'edit', id: vendor.id }) : null,
    announce: setAnnouncement,
  };

  const editing = mode.kind === 'edit' && current;
  const viewing = mode.kind === 'view' && current;

  return (
    <VendorDrawerContext.Provider value={api}>
      {children}
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <Drawer
        dialog={dialog}
        titleId="vendor-drawer-title"
        eyebrow={viewing ? current.category : editing ? 'Edit vendor' : 'Vendor directory'}
        title={viewing || editing ? current.name : 'Add vendor'}
        description={
          viewing
            ? undefined
            : editing
              ? 'Update the contact details, ceremonies or notes.'
              : 'Keep the details handy. You can update them anytime.'
        }
      >
        {viewing ? (
          <VendorDetails
            weddingId={weddingId}
            vendor={current}
            events={events}
            onClose={close}
            onEdit={writable ? () => show({ kind: 'edit', id: current.id }) : undefined}
            onDeleted={
              canDelete
                ? () => {
                    close();
                    setMode({ kind: 'add' });
                    setAnnouncement(`${current.name} was deleted.`);
                  }
                : undefined
            }
            announce={setAnnouncement}
          />
        ) : writable && (mode.kind === 'add' || editing) ? (
          <VendorForm
            key={editing ? `edit-${current.id}-${formKey}` : `add-${formKey}`}
            weddingId={weddingId}
            vendor={editing ? current : undefined}
            events={events}
            onCancel={editing ? () => show({ kind: 'view', id: current.id }) : close}
            onSaved={saved}
          />
        ) : null}
      </Drawer>
    </VendorDrawerContext.Provider>
  );
}

/** Opens the page's drawer on a new vendor; nothing on a read-only page. */
export function AddVendorButton({ children }: { children: ReactNode }) {
  const drawer = useVendorDrawer();
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
