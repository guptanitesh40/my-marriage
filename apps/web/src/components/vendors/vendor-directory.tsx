'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { eventTone } from '@/lib/events/presets';
import { vendorsPath } from '@/lib/routes';
import {
  categoriesOf,
  filterParams,
  initials,
  isNarrowed,
  matches,
  NO_FILTERS,
  NOT_LINKED,
  type Vendor,
  type VendorFilters,
} from '@/lib/vendors/directory';
import { useVendorDrawer } from './vendor-drawer';
import type { VendorEventChoice } from './vendor-form';

/** Ceremonies shown on a row before "+N more". */
const SHOWN_EVENTS = 3;

/** Avatar tints from the design, picked by category so a category keeps its colour. */
const AVATARS = [
  'bg-primary/10 text-primary',
  'bg-secondary-fixed/50 text-secondary',
  'bg-surface-container-high text-on-surface-variant',
  'bg-primary-fixed/60 text-on-primary-fixed-variant',
  'bg-secondary-container/60 text-on-secondary-container',
];

function avatarOf(category: string): string {
  let hash = 0;
  for (const char of category) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) % 9973;
  return AVATARS[hash % AVATARS.length] ?? 'bg-primary/10 text-primary';
}

const filterClass =
  'w-full cursor-pointer appearance-none rounded-lg bg-surface-container-low py-2 pr-8 pl-3 text-body-md text-on-surface shadow-xs focus-visible:outline-2 focus-visible:outline-primary-container';

/**
 * The vendor directory (Stitch "Vendors Management"): search, category and
 * ceremony filters, then a row per vendor, as a table on wide screens and
 * as cards on phones. A wedding's vendors are all loaded, so this filters
 * in the browser; the filters are kept in the address.
 */
export function VendorDirectory({
  weddingId,
  vendors,
  truncated,
  events,
  initialFilters,
}: {
  weddingId: string;
  vendors: readonly Vendor[];
  truncated: boolean;
  events: readonly VendorEventChoice[];
  initialFilters: VendorFilters;
}) {
  const [filters, setFilters] = useState(initialFilters);
  const categories = categoriesOf(vendors);
  const shown = vendors.filter((vendor) => matches(vendor, filters));

  function change(next: Partial<VendorFilters>) {
    const updated = { ...filters, ...next };
    setFilters(updated);
    // Kept in the address, without a new history entry or a server round trip.
    window.history.replaceState(null, '', vendorsPath(weddingId, filterParams(updated)));
  }

  // A filter from a link that no longer matches anything here still shows, so it can be cleared.
  const categoryOptions =
    filters.category && !categories.includes(filters.category)
      ? [...categories, filters.category]
      : categories;
  const eventKnown =
    !filters.eventId ||
    filters.eventId === NOT_LINKED ||
    events.some((event) => event.id === filters.eventId);

  return (
    <section
      aria-label="Vendor directory"
      className="flex flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-xs"
    >
      <div className="flex flex-col items-stretch justify-between gap-3 p-4 lg:flex-row lg:items-center">
        <div
          role="group"
          aria-label="Filters"
          className="flex max-w-3xl flex-1 flex-col items-stretch gap-2.5 sm:flex-row sm:items-center"
        >
          <div role="search" className="relative flex-1">
            <label htmlFor="vendor-search" className="sr-only">
              Search vendors
            </label>
            <Icon
              name="search"
              className="pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2 text-on-surface-variant"
            />
            <input
              id="vendor-search"
              type="search"
              value={filters.q}
              onChange={(e) => change({ q: e.target.value })}
              maxLength={100}
              placeholder="Search by name, category or contact…"
              className="w-full rounded-lg bg-surface-container-low py-2 pr-3 pl-9 text-body-md text-on-surface shadow-xs placeholder:text-on-surface-variant focus-visible:outline-2 focus-visible:outline-primary-container"
            />
          </div>
          <div className="relative sm:min-w-48">
            <label htmlFor="vendor-category-filter" className="sr-only">
              Category
            </label>
            <select
              id="vendor-category-filter"
              value={filters.category}
              onChange={(e) => change({ category: e.target.value })}
              className={filterClass}
            >
              <option value="">All categories ({categories.length})</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <Icon
              name="expand-more"
              className="pointer-events-none absolute top-1/2 right-2.5 size-4.5 -translate-y-1/2 text-on-surface-variant"
            />
          </div>
          <div className="relative sm:min-w-44">
            <label htmlFor="vendor-event-filter" className="sr-only">
              Ceremony
            </label>
            <select
              id="vendor-event-filter"
              value={filters.eventId}
              onChange={(e) => change({ eventId: e.target.value })}
              className={filterClass}
            >
              <option value="">All events</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
              {!eventKnown && <option value={filters.eventId}>A deleted ceremony</option>}
              <option value={NOT_LINKED}>Not linked to an event</option>
            </select>
            <Icon
              name="expand-more"
              className="pointer-events-none absolute top-1/2 right-2.5 size-4.5 -translate-y-1/2 text-on-surface-variant"
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <p role="status" className="text-label-md text-on-surface-variant">
            {shown.length === vendors.length
              ? `Showing ${vendors.length} ${vendors.length === 1 ? 'vendor' : 'vendors'}`
              : `Showing ${shown.length} of ${vendors.length} vendors`}
            {truncated ? ' (the first 500)' : ''}
          </p>
          {isNarrowed(filters) && (
            <button
              type="button"
              onClick={() => change(NO_FILTERS)}
              className="rounded-md px-2 py-1 text-label-md font-semibold text-primary hover:underline"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {shown.length === 0 ? (
        <NoResults onClear={() => change(NO_FILTERS)} />
      ) : (
        <>
          <div
            aria-hidden="true"
            className="hidden grid-cols-[minmax(0,5fr)_minmax(0,3fr)_minmax(0,4fr)_minmax(0,4fr)_auto] gap-x-4 bg-surface-container-low px-4 py-3 text-label-sm font-semibold tracking-wider text-on-surface-variant uppercase lg:grid"
          >
            <span>Vendor & category</span>
            <span>Contact partner</span>
            <span>Phone & email</span>
            <span>Linked ceremonies</span>
            <span className="w-36 text-right">Action</span>
          </div>
          <ul className="divide-y divide-surface-container-high">
            {shown.map((vendor) => (
              <li key={vendor.id}>
                <VendorRow vendor={vendor} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function NotAdded() {
  return <span className="text-on-surface-variant italic">Not added</span>;
}

/** One vendor: a table row on wide screens, a card on phones. */
function VendorRow({ vendor }: { vendor: Vendor }) {
  const drawer = useVendorDrawer();
  const titleId = `vendor-${vendor.id}-name`;
  const extra = vendor.events.length - SHOWN_EVENTS;

  return (
    <article
      aria-labelledby={titleId}
      className="grid grid-cols-1 gap-3 px-4 py-4 transition-colors hover:bg-surface-container-low/70 lg:grid-cols-[minmax(0,5fr)_minmax(0,3fr)_minmax(0,4fr)_minmax(0,4fr)_auto] lg:items-center lg:gap-x-4 lg:py-3.5"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className={`flex size-10 shrink-0 items-center justify-center rounded-lg font-serif text-lg font-medium ${avatarOf(vendor.category)}`}
        >
          {initials(vendor.name)}
        </span>
        <div className="flex min-w-0 flex-col">
          <h2 id={titleId} className="text-title-sm wrap-break-word text-on-surface">
            {vendor.name}
          </h2>
          <p className="text-body-sm wrap-break-word text-secondary">{vendor.category}</p>
        </div>
      </div>

      <p className="flex min-w-0 items-center gap-2 text-body-md text-on-surface">
        <Icon name="account-circle" className="size-4.5 shrink-0 text-on-surface-variant" />
        <span className="sr-only">Contact: </span>
        {vendor.contactName ? (
          <span className="wrap-break-word">{vendor.contactName}</span>
        ) : (
          <NotAdded />
        )}
      </p>

      <div className="flex min-w-0 flex-col gap-0.5 text-body-sm">
        <p className="flex min-w-0 items-center gap-1.5 text-on-surface">
          <Icon name="call" className="size-4 shrink-0 text-on-surface-variant" />
          <span className="sr-only">Phone: </span>
          {vendor.phone ? (
            <a
              href={`tel:${vendor.phone.replace(/[^\d+]/g, '')}`}
              className="transition-colors hover:text-primary"
            >
              {vendor.phone}
            </a>
          ) : (
            <NotAdded />
          )}
        </p>
        <p className="flex min-w-0 items-center gap-1.5 text-on-surface-variant">
          <Icon name="mail" className="size-4 shrink-0" />
          <span className="sr-only">Email: </span>
          {vendor.email ? (
            <a
              href={`mailto:${vendor.email}`}
              className="min-w-0 truncate transition-colors hover:text-primary"
            >
              {vendor.email}
            </a>
          ) : (
            <NotAdded />
          )}
        </p>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <span className="sr-only">Ceremonies: </span>
        {vendor.events.length === 0 ? (
          <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-label-sm text-on-surface-variant">
            No events linked
          </span>
        ) : (
          <>
            {vendor.events.slice(0, SHOWN_EVENTS).map((event) => (
              <span
                key={event.id}
                className={`rounded-full px-2 py-0.5 text-label-sm font-medium ${
                  eventTone(event.title) === 'main'
                    ? 'bg-primary-fixed text-on-primary-fixed'
                    : 'bg-secondary-container/60 text-on-secondary-container'
                }`}
              >
                {event.title}
              </span>
            ))}
            {extra > 0 && (
              <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-label-sm font-medium text-on-surface">
                +{extra} more
              </span>
            )}
            <span className="ml-1 text-label-sm text-on-surface-variant">
              ({vendor.events.length} {vendor.events.length === 1 ? 'event' : 'events'})
            </span>
          </>
        )}
      </div>

      {drawer && (
        <div className="flex items-center justify-end gap-1 lg:w-36">
          <button
            type="button"
            onClick={() => drawer.view(vendor)}
            className="rounded-md px-3 py-1.5 text-label-md font-semibold whitespace-nowrap text-primary transition-colors hover:bg-primary/10"
          >
            View details<span className="sr-only"> for {vendor.name}</span>
          </button>
          {drawer.edit && (
            <button
              type="button"
              onClick={() => drawer.edit?.(vendor)}
              className="rounded-md p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
            >
              <Icon name="edit" className="size-4.5" label={`Edit ${vendor.name}`} />
            </button>
          )}
        </div>
      )}
    </article>
  );
}

/** Vendors exist, but none match what was chosen. */
function NoResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span
        aria-hidden="true"
        className="mb-4 flex size-14 items-center justify-center rounded-full bg-surface-container text-on-surface-variant"
      >
        <Icon name="filter-alt-off" className="size-6" />
      </span>
      <h2 className="font-serif text-headline-sm text-on-surface">No matching vendors found</h2>
      <p className="mt-1.5 max-w-md text-body-md text-on-surface-variant">
        We couldn’t find a vendor matching your search and filters. Try other words, or clear the
        filters.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-5 rounded-lg bg-surface-container-high px-4 py-2 text-title-sm text-on-surface transition-colors hover:bg-surface-container-highest"
      >
        Clear all filters
      </button>
    </div>
  );
}
