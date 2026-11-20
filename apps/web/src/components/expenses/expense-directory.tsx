'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/icon';
import {
  categoriesOf,
  dayLabel,
  filterParams,
  isNarrowed,
  matches,
  NO_FILTERS,
  NONE,
  shownStatus,
  sortExpenses,
  SORTS,
  STATUS_LABELS,
  type Expense,
  type ExpenseFilters,
  type ExpenseSort,
  type ShownStatus,
} from '@/lib/expenses/directory';
import { formatInr } from '@/lib/expenses/money';
import { expensesPath } from '@/lib/routes';
import { useExpenseDrawer } from './expense-drawer';
import type { ExpenseChoices } from './expense-form';
import { StatusPill } from './expense-status';

const selectClass =
  'w-full cursor-pointer appearance-none rounded-lg bg-surface-container-low py-2 pr-8 pl-3 text-body-sm text-on-surface shadow-xs focus-visible:outline-2 focus-visible:outline-primary-container';

const COLUMNS =
  'lg:grid-cols-[minmax(0,4fr)_minmax(0,2fr)_minmax(0,2.5fr)_minmax(0,2fr)_minmax(0,2fr)_minmax(0,2fr)_minmax(0,2.25fr)_auto]';

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
 * The expense list (Stitch "Expenses Management"): search, filters by
 * category, event, vendor and status, sorting, and a row per expense with
 * what is owed, paid and outstanding; a table on wide screens, cards on
 * phones. A wedding's expenses are all loaded, so this filters in the
 * browser; the filters are kept in the address.
 */
export function ExpenseDirectory({
  weddingId,
  expenses,
  truncated,
  choices,
  initialFilters,
}: {
  weddingId: string;
  expenses: readonly Expense[];
  truncated: boolean;
  choices: ExpenseChoices;
  initialFilters: ExpenseFilters;
}) {
  const [filters, setFilters] = useState(initialFilters);
  const shown = sortExpenses(
    expenses.filter((expense) => matches(expense, filters)),
    filters.sort,
  );

  function change(next: Partial<ExpenseFilters>) {
    const updated = { ...filters, ...next };
    setFilters(updated);
    window.history.replaceState(null, '', expensesPath(weddingId, filterParams(updated)));
  }

  // Events and vendors deleted since still filter the expenses that name them.
  function gone<T extends { id: string; available: boolean }>(
    pick: (expense: Expense) => readonly T[],
  ): T[] {
    const links = new Map<string, T>();
    for (const expense of expenses) {
      for (const link of pick(expense)) if (!link.available) links.set(link.id, link);
    }
    return [...links.values()];
  }
  const eventOptions = [
    { value: '', label: 'All events' },
    { value: NONE, label: 'General / No event' },
    ...choices.events.map((event) => ({ value: event.id, label: event.title })),
    ...gone((e) => e.events).map((event) => ({
      value: event.id,
      label: `${event.title} (no longer available)`,
    })),
  ];
  const vendorOptions = [
    { value: '', label: 'All vendors' },
    { value: NONE, label: 'No vendor' },
    ...choices.vendors.map((vendor) => ({ value: vendor.id, label: vendor.name })),
    ...gone((e) => (e.vendor ? [e.vendor] : [])).map((vendor) => ({
      value: vendor.id,
      label: `${vendor.name} (no longer available)`,
    })),
  ];
  const categories = categoriesOf(expenses);
  const count = (status: ShownStatus) =>
    expenses.filter((expense) =>
      status === 'overdue' ? expense.overdue : shownStatus(expense) === status,
    ).length;
  const chips: { value: ShownStatus | ''; label: string; count: number }[] = [
    { value: '', label: 'All', count: expenses.length },
    ...(['unpaid', 'partially_paid', 'overdue', 'paid'] as const).map((status) => ({
      value: status,
      label: STATUS_LABELS[status],
      count: count(status),
    })),
  ];

  return (
    <section
      aria-label="Expense list"
      className="flex flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-xs"
    >
      <div className="flex flex-col gap-3 p-4">
        <div
          role="group"
          aria-label="Filters"
          className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]"
        >
          <div role="search" className="relative sm:col-span-2 lg:col-span-1">
            <label htmlFor="expense-search" className="sr-only">
              Search expenses
            </label>
            <Icon
              name="search"
              className="pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2 text-on-surface-variant"
            />
            <input
              id="expense-search"
              type="search"
              value={filters.q}
              onChange={(e) => change({ q: e.target.value })}
              maxLength={100}
              placeholder="Search expenses"
              className="w-full rounded-lg bg-surface-container-low py-2 pr-3 pl-9 text-body-sm text-on-surface shadow-xs placeholder:text-on-surface-variant focus-visible:outline-2 focus-visible:outline-primary-container"
            />
          </div>
          <Filter
            id="expense-category-filter"
            label="Category"
            value={filters.category}
            onChange={(category) => change({ category })}
            options={[
              { value: '', label: `All categories (${categories.length})` },
              ...categories.map((category) => ({ value: category, label: category })),
            ]}
          />
          <Filter
            id="expense-event-filter"
            label="Event"
            value={filters.eventId}
            onChange={(eventId) => change({ eventId })}
            options={eventOptions}
          />
          <Filter
            id="expense-vendor-filter"
            label="Vendor"
            value={filters.vendorId}
            onChange={(vendorId) => change({ vendorId })}
            options={vendorOptions}
          />
          <Filter
            id="expense-sort"
            label="Sort by"
            value={filters.sort}
            onChange={(sort) => change({ sort: sort as ExpenseSort })}
            options={Object.entries(SORTS).map(([value, label]) => ({
              value,
              label: `Sort: ${label}`,
            }))}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label="Payment status" className="flex flex-wrap gap-1.5">
            {chips.map((chip) => {
              const current = filters.status === chip.value;
              return (
                <button
                  key={chip.value || 'all'}
                  type="button"
                  aria-pressed={current}
                  onClick={() => change({ status: chip.value })}
                  className={`rounded-full px-3 py-1 text-label-md whitespace-nowrap transition-colors ${
                    current
                      ? 'bg-tertiary text-on-tertiary'
                      : chip.value === 'overdue' && chip.count > 0
                        ? 'bg-error-container text-on-error-container hover:opacity-90'
                        : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  }`}
                >
                  {chip.label} ({chip.count})
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            <p role="status" className="text-label-md text-on-surface-variant">
              {shown.length === expenses.length
                ? `${expenses.length} ${expenses.length === 1 ? 'expense' : 'expenses'}`
                : `${shown.length} of ${expenses.length} expenses`}
              {truncated ? ' (the first 500)' : ''}
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
      </div>

      {shown.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-14 text-center">
          <span
            aria-hidden="true"
            className="mb-4 flex size-14 items-center justify-center rounded-full bg-surface-container text-on-surface-variant"
          >
            <Icon name="filter-alt-off" className="size-6" />
          </span>
          <h2 className="font-serif text-headline-sm text-on-surface">No matching expenses</h2>
          <p className="mt-1.5 max-w-md text-body-md text-on-surface-variant">
            Try another search or adjust your filters.
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
            <span>Expense & category</span>
            <span>Events</span>
            <span>Vendor</span>
            <span className="text-right">Owed</span>
            <span className="text-right">Paid</span>
            <span className="text-right">Outstanding</span>
            <span>Status</span>
            <span className="w-24" />
          </div>
          <ul className="divide-y divide-surface-container-high">
            {shown.map((expense) => (
              <li key={expense.id}>
                <ExpenseRow expense={expense} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function Money({
  label,
  value,
  className = 'text-on-surface',
  children,
}: {
  label: string;
  value: number;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <p className="flex items-baseline justify-between gap-2 sm:flex-col sm:items-start sm:justify-start lg:items-end">
      <span className="text-label-sm text-on-surface-variant lg:sr-only">{label}</span>
      <span className="flex flex-col items-end sm:items-start lg:items-end">
        <span className={`text-title-sm whitespace-nowrap tabular-nums ${className}`}>
          {formatInr(value)}
        </span>
        {children}
      </span>
    </p>
  );
}

/** One expense: a table row on wide screens, a card on phones. */
function ExpenseRow({ expense }: { expense: Expense }) {
  const drawer = useExpenseDrawer();
  const titleId = `expense-${expense.id}-title`;
  const adjusted = expense.finalPaise !== expense.amountPaise;

  return (
    <article
      aria-labelledby={titleId}
      className={`grid grid-cols-1 gap-3 px-4 py-4 transition-colors hover:bg-surface-container-low/70 lg:items-center lg:gap-x-4 lg:py-3.5 ${COLUMNS}`}
    >
      <div className="min-w-0">
        <h2 id={titleId} className="text-title-sm wrap-break-word text-on-surface">
          {expense.title}
        </h2>
        <p className="text-body-sm wrap-break-word text-secondary">{expense.category}</p>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-body-sm lg:contents">
        <p className="min-w-0 text-on-surface">
          <span className="sr-only">Event: </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="calendar-month" className="size-4 text-on-surface-variant lg:hidden" />
            {expense.events.length === 0 ? (
              <span className="text-on-surface-variant">General</span>
            ) : (
              <span className="min-w-0">
                {expense.events.slice(0, 2).map((event, index) => (
                  <span key={event.id}>
                    {index > 0 && ', '}
                    <span className={event.available ? '' : 'text-on-surface-variant line-through'}>
                      {event.title}
                    </span>
                  </span>
                ))}
                {expense.events.length > 2 && (
                  <span className="text-on-surface-variant">
                    {' '}
                    +{expense.events.length - 2} more
                  </span>
                )}
              </span>
            )}
          </span>
        </p>
        <p className="min-w-0 wrap-break-word text-on-surface">
          <span className="sr-only">Vendor: </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="storefront" className="size-4 text-on-surface-variant lg:hidden" />
            {expense.vendor ? (
              <span
                className={expense.vendor.available ? '' : 'text-on-surface-variant line-through'}
              >
                {expense.vendor.name}
              </span>
            ) : (
              <span className="text-on-surface-variant">No vendor</span>
            )}
          </span>
        </p>
      </div>
      <div className="grid grid-cols-1 gap-1.5 rounded-lg bg-surface-container-low p-3 sm:grid-cols-3 sm:gap-2 lg:contents">
        <Money label="Owed" value={expense.finalPaise}>
          {adjusted && (
            <span className="text-label-sm text-on-surface-variant">
              agreed {formatInr(expense.amountPaise)}
            </span>
          )}
        </Money>
        <Money label="Paid" value={expense.paidPaise} className="text-primary" />
        <Money
          label="Outstanding"
          value={expense.outstandingPaise}
          className={expense.overdue ? 'text-error' : 'text-on-surface'}
        />
      </div>
      <div className="flex items-center justify-between gap-2 lg:contents">
        <div className="flex flex-col items-start gap-0.5">
          <StatusPill expense={expense} />
          <span className="text-label-sm text-on-surface-variant">
            {expense.dueDate ? `Due ${dayLabel(expense.dueDate)}` : 'No due date'}
          </span>
        </div>
        {drawer && (
          <div className="lg:flex lg:w-24 lg:justify-end">
            <button
              type="button"
              onClick={() => drawer.view(expense)}
              className="rounded-md px-3 py-1.5 text-label-md font-semibold whitespace-nowrap text-primary transition-colors hover:bg-primary/10"
            >
              View details<span className="sr-only"> for {expense.title}</span>
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
