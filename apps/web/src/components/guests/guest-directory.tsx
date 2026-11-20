'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/icon';
import {
  answerLabel,
  deliveryOf,
  DELIVERY_LABELS,
  filterParams,
  isNarrowed,
  matches,
  NO_FILTERS,
  NOT_INVITED,
  people,
  RSVP_LABELS,
  sortGuests,
  SORTS,
  type Delivery,
  type Guest,
  type GuestFilters,
  type GuestSort,
} from '@/lib/guests/directory';
import { guestsPath } from '@/lib/routes';
import { useGuestDrawer } from './guest-drawer';
import type { GuestEventChoice } from './guest-form';
import { DeliveryChip, RsvpChip } from './guest-status';

const PAGE_SIZE = 50;

const selectClass =
  'w-full cursor-pointer appearance-none rounded-lg bg-surface-container-low py-2 pr-8 pl-3 text-body-sm text-on-surface shadow-xs focus-visible:outline-2 focus-visible:outline-primary-container';

const COLUMNS =
  'lg:grid-cols-[minmax(0,3fr)_minmax(0,3fr)_minmax(0,3fr)_minmax(0,4fr)_minmax(0,2fr)_auto]';

function Filter({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative min-w-0">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={selectClass}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Icon
        name="expand-more"
        className="pointer-events-none absolute top-1/2 right-2.5 size-4.5 -translate-y-1/2 text-on-surface-variant"
      />
    </div>
  );
}

/**
 * The guest list (Stitch "Guests & RSVP"): search, filters by ceremony,
 * RSVP and invitation status, and a row per family contact with its party
 * size, ceremonies and each ceremony's answer; a table on wide screens,
 * cards on phones, 50 at a time. Filtered in the browser; the filters are
 * kept in the address.
 */
export function GuestDirectory({
  weddingId,
  guests,
  truncated,
  events,
  initialFilters,
}: {
  weddingId: string;
  guests: readonly Guest[];
  truncated: boolean;
  events: readonly GuestEventChoice[];
  initialFilters: GuestFilters;
}) {
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(0);
  const shown = sortGuests(
    guests.filter((guest) => matches(guest, filters)),
    filters.sort,
  );
  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const visible = shown.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);

  function change(next: Partial<GuestFilters>) {
    const updated = { ...filters, ...next };
    setFilters(updated);
    setPage(0);
    window.history.replaceState(null, '', guestsPath(weddingId, filterParams(updated)));
  }

  return (
    <section
      aria-label="Guest list"
      className="flex flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-xs"
    >
      <div className="flex flex-col gap-3 p-4">
        <div
          role="group"
          aria-label="Filters"
          className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]"
        >
          <div role="search" className="relative sm:col-span-2 lg:col-span-1">
            <label htmlFor="guest-search" className="sr-only">
              Search guests
            </label>
            <Icon
              name="search"
              className="pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2 text-on-surface-variant"
            />
            <input
              id="guest-search"
              type="search"
              value={filters.q}
              onChange={(e) => change({ q: e.target.value })}
              maxLength={100}
              placeholder="Search by name, email or phone"
              className="w-full rounded-lg bg-surface-container-low py-2 pr-3 pl-9 text-body-sm text-on-surface shadow-xs placeholder:text-on-surface-variant focus-visible:outline-2 focus-visible:outline-primary-container"
            />
          </div>
          <Filter
            id="guest-event-filter"
            label="Ceremony"
            value={filters.eventId}
            onChange={(eventId) => change({ eventId })}
            options={[
              { value: '', label: 'All ceremonies' },
              ...events.map((event) => ({ value: event.id, label: event.title })),
            ]}
          />
          <Filter
            id="guest-rsvp-filter"
            label="RSVP"
            value={filters.rsvp}
            onChange={(rsvp) => change({ rsvp: rsvp as GuestFilters['rsvp'] })}
            options={[
              { value: '', label: 'All RSVP states' },
              ...Object.entries(RSVP_LABELS).map(([value, label]) => ({ value, label })),
              { value: NOT_INVITED, label: 'Not invited yet' },
            ]}
          />
          <Filter
            id="guest-delivery-filter"
            label="Invitation status"
            value={filters.delivery}
            onChange={(delivery) => change({ delivery: delivery as Delivery | '' })}
            options={[
              { value: '', label: 'All invitation statuses' },
              ...Object.entries(DELIVERY_LABELS).map(([value, label]) => ({ value, label })),
            ]}
          />
          <Filter
            id="guest-sort"
            label="Sort by"
            value={filters.sort}
            onChange={(sort) => change({ sort: sort as GuestSort })}
            options={Object.entries(SORTS).map(([value, label]) => ({
              value,
              label: `Sort: ${label}`,
            }))}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <p role="status" className="text-label-md text-on-surface-variant">
            {shown.length === guests.length
              ? `${guests.length} ${guests.length === 1 ? 'guest' : 'guests'}`
              : `${shown.length} of ${guests.length} guests`}
            {truncated ? ' (the first 2,000)' : ''}
          </p>
          {isNarrowed(filters) && (
            <button
              type="button"
              onClick={() => change({ ...NO_FILTERS, sort: filters.sort })}
              className="rounded-md px-2 py-1 text-label-md font-semibold text-primary hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-14 text-center">
          <span
            aria-hidden="true"
            className="mb-4 flex size-14 items-center justify-center rounded-full bg-surface-container text-on-surface-variant"
          >
            <Icon name="filter-alt-off" className="size-6" />
          </span>
          <h2 className="font-serif text-headline-sm text-on-surface">No matching guests</h2>
          <p className="mt-1.5 max-w-md text-body-md text-on-surface-variant">
            Try another search or change your filters.
          </p>
          <button
            type="button"
            onClick={() => change({ ...NO_FILTERS, sort: filters.sort })}
            className="mt-5 rounded-lg bg-surface-container-high px-4 py-2 text-title-sm text-on-surface transition-colors hover:bg-surface-container-highest"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <div
            aria-hidden="true"
            className={`hidden gap-x-4 bg-surface-container-low px-4 py-3 text-label-sm font-semibold tracking-wider text-on-surface-variant uppercase lg:grid ${COLUMNS}`}
          >
            <span>Primary contact & party</span>
            <span>Contact</span>
            <span>Invited ceremonies</span>
            <span>RSVP by ceremony</span>
            <span>Invitation</span>
            <span className="w-24" />
          </div>
          <ul className="divide-y divide-surface-container-high">
            {visible.map((guest) => (
              <li key={guest.id}>
                <GuestRow guest={guest} />
              </li>
            ))}
          </ul>
          {pages > 1 && (
            <nav
              aria-label="Pages"
              className="flex items-center justify-between gap-3 border-t border-surface-container-high px-4 py-3 text-label-md"
            >
              <button
                type="button"
                disabled={current === 0}
                onClick={() => setPage(current - 1)}
                className="rounded-md px-3 py-1.5 font-semibold text-primary disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-on-surface-variant">
                Page {current + 1} of {pages}
              </span>
              <button
                type="button"
                disabled={current >= pages - 1}
                onClick={() => setPage(current + 1)}
                className="rounded-md px-3 py-1.5 font-semibold text-primary disabled:opacity-40"
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}

function NotAdded() {
  return <span className="text-on-surface-variant italic">Not added</span>;
}

/** One family contact: a table row on wide screens, a card on phones. */
/** Ceremony answers shown on a row before "more". */
const ANSWERS_SHOWN = 3;

function GuestRow({ guest }: { guest: Guest }) {
  const drawer = useGuestDrawer();
  const titleId = `guest-${guest.id}-name`;
  const extra = guest.invitations.length - 2;
  // Three answers, then the rest on request: a family invited to every
  // ceremony would otherwise make a very tall row.
  const [allAnswers, setAllAnswers] = useState(false);
  const answersId = `guest-${guest.id}-answers`;
  const hiddenAnswers = Math.max(0, guest.invitations.length - ANSWERS_SHOWN);
  const shownAnswers = allAnswers ? guest.invitations : guest.invitations.slice(0, ANSWERS_SHOWN);

  return (
    <article
      aria-labelledby={titleId}
      className={`grid grid-cols-1 gap-3 px-4 py-4 transition-colors hover:bg-surface-container-low/70 lg:items-center lg:gap-x-4 lg:py-3.5 ${COLUMNS}`}
    >
      <div className="flex min-w-0 items-start justify-between gap-2 lg:block">
        <h2 id={titleId} className="text-title-sm wrap-break-word text-on-surface">
          {guest.name}
        </h2>
        <p className="flex shrink-0 items-center gap-1 text-body-sm text-on-surface-variant">
          <Icon name="group" className="size-4" />
          {people(guest.partySize)}
        </p>
      </div>
      <div className="flex min-w-0 flex-col gap-0.5 text-body-sm">
        <p className="min-w-0 truncate text-on-surface">
          <span className="sr-only">Email: </span>
          {guest.email ?? <NotAdded />}
        </p>
        <p className="text-on-surface-variant">
          <span className="sr-only">Phone: </span>
          {guest.phone ?? <NotAdded />}
        </p>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <span className="sr-only">Ceremonies: </span>
        {guest.invitations.length === 0 ? (
          <span className="text-body-sm text-on-surface-variant italic">
            No ceremonies selected
          </span>
        ) : (
          <>
            {guest.invitations.slice(0, 2).map((invitation) => (
              <span
                key={invitation.id}
                className={`rounded-md bg-surface-container px-2 py-0.5 text-label-sm text-on-surface ${
                  invitation.available && !invitation.cancelled ? '' : 'line-through opacity-70'
                }`}
              >
                {invitation.title}
              </span>
            ))}
            {extra > 0 && (
              <span className="rounded-md bg-surface-container-high px-2 py-0.5 text-label-sm text-on-surface">
                +{extra} more
              </span>
            )}
          </>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-1 text-body-sm">
        <ul id={answersId} className="flex flex-col gap-1">
          {guest.invitations.length === 0 ? (
            <li className="text-on-surface-variant italic">Not invited yet</li>
          ) : (
            shownAnswers.map((invitation) => (
              <li key={invitation.id} className="flex flex-wrap items-center gap-1.5">
                <span className="sr-only">{answerLabel(invitation, guest.partySize)}</span>
                <span aria-hidden="true" className="text-on-surface">
                  {invitation.title}
                </span>
                <span aria-hidden="true">
                  <RsvpChip status={invitation.rsvp.status}>
                    {invitation.rsvp.status === 'attending'
                      ? `${invitation.rsvp.attendingCount ?? 0}/${guest.partySize}`
                      : undefined}
                  </RsvpChip>
                </span>
              </li>
            ))
          )}
        </ul>
        {hiddenAnswers > 0 && (
          <button
            type="button"
            aria-expanded={allAnswers}
            aria-controls={answersId}
            onClick={() => setAllAnswers((open) => !open)}
            className="inline-flex items-center gap-1 self-start rounded-md px-1.5 py-0.5 text-label-md font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            <Icon
              name="expand-more"
              className={`size-4 transition-transform ${allAnswers ? 'rotate-180' : ''}`}
            />
            {allAnswers ? 'Show fewer' : `${hiddenAnswers} more`}
            <span className="sr-only"> ceremonies for {guest.name}</span>
          </button>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 lg:contents">
        <div>
          <DeliveryChip delivery={deliveryOf(guest)} />
        </div>
        {drawer && (
          <div className="lg:flex lg:w-24 lg:justify-end">
            <button
              type="button"
              onClick={() => drawer.view(guest)}
              className="rounded-md px-3 py-1.5 text-label-md font-semibold whitespace-nowrap text-primary transition-colors hover:bg-primary/10"
            >
              View details<span className="sr-only"> for {guest.name}</span>
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
