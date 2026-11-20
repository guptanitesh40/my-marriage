'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormAlert } from '@/components/forms/form-alert';
import { api } from '@/lib/api/browser';
import { networkFailure, toFailure } from '@/lib/api/errors';
import type { Vendor } from '@/lib/vendors/directory';

/**
 * Asks before deleting a vendor, in a modal dialog; Escape or Cancel keeps
 * it. The API keeps the record, marked deleted (decision 0013).
 */
export function DeleteVendorDialog({
  dialog,
  weddingId,
  vendor,
  onDeleted,
}: {
  dialog: React.RefObject<HTMLDialogElement | null>;
  weddingId: string;
  vendor: Vendor;
  onDeleted: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const titleId = `delete-vendor-${vendor.id}-title`;

  async function confirm() {
    if (pending) return;
    setPending(true);
    setAlert(null);
    try {
      const { error, response } = await api.DELETE(
        '/api/v1/weddings/{weddingId}/vendors/{vendorId}',
        { params: { path: { weddingId, vendorId: vendor.id } } },
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
        Delete {vendor.name}?
      </h2>
      <p className="mt-2 text-body-md text-on-surface-variant">
        It will be removed from your vendor directory and its ceremonies. Its details are kept in
        your records. This can’t be undone here.
      </p>
      {alert && (
        <div className="mt-4">
          <FormAlert tone="error" title="Unable to delete the vendor">
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
