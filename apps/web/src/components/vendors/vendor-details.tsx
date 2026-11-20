'use client';

import NextLink from 'next/link';
import { useRef, type ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/icon';
import { expensesPath } from '@/lib/routes';
import { initials, type Vendor } from '@/lib/vendors/directory';
import { DeleteVendorDialog } from './vendor-delete';
import type { VendorEventChoice } from './vendor-form';

const sectionLabel = 'text-label-sm font-semibold tracking-wider text-on-surface-variant uppercase';

function NotAdded({ children = 'Not added' }: { children?: ReactNode }) {
  return <span className="text-on-surface-variant italic">{children}</span>;
}

/** A phone number or email, as a link, with a button that copies it. */
function Channel({
  icon,
  label,
  value,
  href,
  announce,
}: {
  icon: IconName;
  label: string;
  value?: string;
  href: string;
  announce: (message: string) => void;
}) {
  async function copy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      announce(`${label} copied.`);
    } catch {
      announce(`Couldn’t copy the ${label.toLowerCase()}.`);
    }
  }
  return (
    <div className="flex min-w-0 items-start justify-between gap-2 rounded-lg bg-surface-container-lowest p-3 shadow-xs">
      <div className="flex min-w-0 flex-col">
        <span className="flex items-center gap-1 text-label-sm text-on-surface-variant">
          <Icon name={icon} className="size-3.5" />
          {label}
        </span>
        {value ? (
          <a
            href={href}
            className="mt-0.5 text-body-md break-all text-on-surface transition-colors hover:text-primary"
          >
            {value}
          </a>
        ) : (
          <span className="mt-0.5 text-body-md">
            <NotAdded />
          </span>
        )}
      </div>
      {value && (
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-md p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
        >
          <Icon name="content-copy" className="size-4" label={`Copy ${label.toLowerCase()}`} />
        </button>
      )}
    </div>
  );
}

/**
 * A vendor's details (Stitch "Vendors Management", details panel): the
 * contact, its ceremonies, private notes and address, each saying when it
 * has not been added. Edit appears only when the wedding can be changed.
 */
export function VendorDetails({
  weddingId,
  vendor,
  events,
  onClose,
  onEdit,
  onDeleted,
  announce,
}: {
  weddingId: string;
  vendor: Vendor;
  events: readonly VendorEventChoice[];
  onClose: () => void;
  onEdit?: () => void;
  /** Offers Delete, to owners of an active wedding only; the API decides in the end. */
  onDeleted?: () => void;
  announce: (message: string) => void;
}) {
  const confirmDialog = useRef<HTMLDialogElement>(null);
  const when = new Map(events.map((event) => [event.id, event.when]));
  const updated = new Date(vendor.updatedAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 pb-6">
        <section
          aria-labelledby="vendor-contact"
          className="rounded-xl bg-surface-container-low p-4"
        >
          <h3 id="vendor-contact" className={sectionLabel}>
            Primary contact
          </h3>
          <div className="mt-3 flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-label-md font-semibold text-on-surface"
            >
              {vendor.contactName ? (
                initials(vendor.contactName)
              ) : (
                <Icon name="account-circle" className="size-5" />
              )}
            </span>
            <p className="min-w-0 text-title-sm wrap-break-word text-on-surface">
              {vendor.contactName ?? <NotAdded>No contact person added</NotAdded>}
            </p>
          </div>
          <div className="mt-3 flex flex-col gap-2.5">
            <Channel
              icon="call"
              label="Phone"
              value={vendor.phone}
              href={`tel:${vendor.phone?.replace(/[^\d+]/g, '') ?? ''}`}
              announce={announce}
            />
            <Channel
              icon="mail"
              label="Email"
              value={vendor.email}
              href={`mailto:${vendor.email ?? ''}`}
              announce={announce}
            />
          </div>
        </section>

        <section aria-labelledby="vendor-ceremonies">
          <h3 id="vendor-ceremonies" className={sectionLabel}>
            Assigned ceremonies ({vendor.events.length})
          </h3>
          {vendor.events.length === 0 ? (
            <p className="mt-2 rounded-lg bg-surface-container-low px-4 py-3 text-body-sm text-on-surface-variant">
              Not linked to any ceremony yet.
            </p>
          ) : (
            <ul className="mt-2 flex flex-col gap-2">
              {vendor.events.map((event) => (
                <li
                  key={event.id}
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 rounded-lg bg-surface-container-low px-4 py-3"
                >
                  <span className="flex min-w-0 items-center gap-2.5 text-title-sm text-on-surface">
                    <span
                      aria-hidden="true"
                      className="size-2 shrink-0 rounded-full bg-secondary"
                    />
                    <span className="wrap-break-word">{event.title}</span>
                  </span>
                  <span className="text-body-sm text-on-surface-variant">
                    {when.get(event.id) ?? 'Date to be decided'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <NextLink
          href={expensesPath(weddingId, new URLSearchParams({ vendorId: vendor.id }))}
          className="flex items-center justify-between gap-3 rounded-xl bg-surface-container-low px-4 py-3 text-title-sm text-primary transition-colors hover:bg-surface-container"
        >
          <span className="flex items-center gap-2">
            <Icon name="account-balance-wallet" className="size-4.5" />
            Expenses and payments
          </span>
          <Icon name="arrow-forward" className="size-4.5" />
        </NextLink>

        <section aria-labelledby="vendor-notes">
          <h3 id="vendor-notes" className={sectionLabel}>
            Private organizer notes
          </h3>
          <div className="mt-2 rounded-xl bg-surface-container-low p-4">
            {vendor.notes ? (
              <p className="text-body-md whitespace-pre-line wrap-break-word text-on-surface">
                {vendor.notes}
              </p>
            ) : (
              <p className="text-body-md">
                <NotAdded>No notes yet</NotAdded>
              </p>
            )}
            <p className="mt-3 flex items-center gap-1.5 text-label-sm text-on-surface-variant">
              <Icon name="schedule" className="size-3.5" />
              Last updated {updated}
            </p>
          </div>
        </section>

        <section aria-labelledby="vendor-location">
          <h3 id="vendor-location" className={sectionLabel}>
            Studio location
          </h3>
          <p className="mt-2 flex items-start gap-2 rounded-xl bg-surface-container-low p-4 text-body-sm text-on-surface">
            <Icon name="location-on" className="mt-0.5 size-4 shrink-0 text-secondary" />
            {vendor.address ? (
              <span className="whitespace-pre-line wrap-break-word">{vendor.address}</span>
            ) : (
              <NotAdded>No address added</NotAdded>
            )}
          </p>
        </section>
      </div>

      <div className="flex gap-3 border-t border-surface-container-highest bg-surface-container-low px-6 py-4">
        {onDeleted && (
          <button
            type="button"
            onClick={() => confirmDialog.current?.showModal()}
            className="flex items-center gap-1.5 rounded-md px-3 py-3 text-label-md font-semibold text-error transition-colors hover:bg-error-container hover:text-on-error-container"
          >
            <Icon name="delete" className="size-4.5" />
            Delete
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-md bg-surface-container-lowest px-4 py-3 text-label-md font-semibold text-on-surface shadow-sm transition-colors hover:bg-surface-container"
        >
          Close
        </button>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-label-md font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container"
          >
            <Icon name="edit" className="size-4" />
            Edit vendor
          </button>
        )}
      </div>
      {onDeleted && (
        <DeleteVendorDialog
          dialog={confirmDialog}
          weddingId={weddingId}
          vendor={vendor}
          onDeleted={onDeleted}
        />
      )}
    </div>
  );
}
