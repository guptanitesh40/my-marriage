'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Icon } from '@/components/ui/icon';
import {
  DEFAULT_FILTERS,
  filterParams,
  isNarrowed,
  PRIORITY_LABELS,
  STATE_LABELS,
  TASK_SORTS,
  TASK_VIEWS,
  type TaskFilters,
} from '@/lib/tasks/filters';
import { tasksPath } from '@/lib/routes';
import type { components } from '@my-marriage/contracts';
import type { TaskChoices } from './task-form';

type Counts = components['schemas']['TaskCountsDto'];

const VIEW_COUNTS: Record<TaskFilters['view'], keyof Counts> = {
  all: 'all',
  mine: 'mine',
  overdue: 'overdue',
  completed: 'completed',
};

const selectClass =
  'cursor-pointer appearance-none rounded-md bg-surface-container-low py-2 pr-8 pl-3 text-body-sm ' +
  'text-on-surface transition-colors hover:bg-surface-container focus-visible:outline-2 ' +
  'focus-visible:outline-primary-container';

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="relative inline-flex min-w-0">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${selectClass} max-w-full`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Icon
        name="expand-more"
        className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-outline"
      />
    </label>
  );
}

/**
 * Search, the All / My Tasks / Overdue / Completed views, the filters and
 * the sort order (PRD TASK-03). Each change goes into the address, and the
 * server lists the matching tasks; the list stays until the new one is
 * ready.
 */
export function TaskToolbar({
  weddingId,
  filters,
  counts,
  shown,
  truncated,
  choices,
}: {
  weddingId: string;
  filters: TaskFilters;
  counts: Counts;
  /** How many tasks the list shows. */
  shown: number;
  truncated: boolean;
  choices: TaskChoices;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // What was last asked for, which the address catches up with: each change
  // builds on it, so quick changes in a row all count, and the controls show
  // it at once. They follow the address when something else changes it
  // (Clear all filters, Back), never overwriting what is still being typed.
  const [requested, setRequested] = useState(filters);
  const [seen, setSeen] = useState(filters);
  const [search, setSearch] = useState(filters.q);
  if (filters !== seen) {
    setSeen(filters);
    if (filterParams(filters).toString() !== filterParams(requested).toString()) {
      setRequested(filters);
      setSearch(filters.q);
    }
  }
  const typing = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(typing.current), []);

  function show(next: TaskFilters) {
    setRequested(next);
    startTransition(() => {
      router.replace(tasksPath(weddingId, filterParams(next)), { scroll: false });
    });
  }

  function change<K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) {
    clearTimeout(typing.current);
    show({ ...requested, q: search.trim(), [key]: value });
  }

  function searchFor(text: string) {
    setSearch(text);
    clearTimeout(typing.current);
    // Waits for a pause in typing, so each key is not a request.
    typing.current = setTimeout(() => show({ ...requested, q: text.trim() }), 350);
  }

  function clear() {
    clearTimeout(typing.current);
    setSearch('');
    show({ ...DEFAULT_FILTERS, view: requested.view, sort: requested.sort });
  }

  const narrowed = isNarrowed(requested);

  return (
    <div className="flex flex-col gap-4 border-b border-surface-container-high p-4 md:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <form
          role="search"
          className="relative w-full lg:max-w-md"
          onSubmit={(e) => {
            e.preventDefault();
            clearTimeout(typing.current);
            show({ ...requested, q: search.trim() });
          }}
        >
          <label htmlFor="task-search" className="sr-only">
            Search tasks
          </label>
          <Icon
            name="search"
            className="pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2 text-outline"
          />
          <input
            id="task-search"
            type="search"
            value={search}
            onChange={(e) => searchFor(e.target.value)}
            maxLength={100}
            placeholder="Search tasks by title, assignee or notes…"
            className="w-full rounded-lg bg-surface-container-low py-2 pr-3 pl-9 text-body-sm text-on-surface placeholder:text-outline focus:bg-surface-container-lowest focus-visible:outline-2 focus-visible:outline-primary-container"
          />
        </form>

        <div
          role="group"
          aria-label="Views"
          className="grid shrink-0 grid-cols-2 gap-1 rounded-lg bg-surface-container-low p-1 sm:flex"
        >
          {TASK_VIEWS.map((view) => {
            const current = requested.view === view.value;
            const count = counts[VIEW_COUNTS[view.value]];
            return (
              <button
                key={view.value}
                type="button"
                aria-pressed={current}
                onClick={() => change('view', view.value)}
                className={`rounded-md px-3 py-1 text-body-sm font-semibold whitespace-nowrap transition-colors ${
                  current
                    ? 'bg-surface-container-lowest text-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {view.label}{' '}
                <span
                  className={
                    view.value === 'overdue' && count > 0 ? 'font-bold text-error' : 'opacity-70'
                  }
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div role="group" aria-label="Filters" className="flex flex-wrap gap-2">
          <FilterSelect
            label="Event"
            value={requested.eventId}
            onChange={(value) => change('eventId', value)}
            options={[
              { value: '', label: 'Event: All events' },
              { value: 'none', label: 'General' },
              ...choices.events.map((event) => ({ value: event.id, label: event.title })),
            ]}
          />
          <FilterSelect
            label="Status"
            value={requested.state}
            onChange={(value) => change('state', value as TaskFilters['state'])}
            options={[
              { value: '', label: 'Status: All' },
              ...Object.entries(STATE_LABELS).map(([value, label]) => ({ value, label })),
            ]}
          />
          <FilterSelect
            label="Priority"
            value={requested.priority}
            onChange={(value) => change('priority', value as TaskFilters['priority'])}
            options={[
              { value: '', label: 'Priority: All' },
              ...Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label })),
            ]}
          />
          <FilterSelect
            label="Assignee"
            value={requested.assigneeId}
            onChange={(value) => change('assigneeId', value)}
            options={[
              { value: '', label: 'Assignee: All' },
              { value: 'none', label: 'Unassigned' },
              ...choices.members.map((member) => ({
                value: member.userId,
                label: member.displayName,
              })),
            ]}
          />
          <FilterSelect
            label="Sort by"
            value={requested.sort}
            onChange={(value) => change('sort', value as TaskFilters['sort'])}
            options={TASK_SORTS.map((sort) => ({
              value: sort.value,
              label: `Sort: ${sort.label}`,
            }))}
          />
        </div>

        <p className="flex shrink-0 items-center gap-3 text-body-sm text-on-surface-variant">
          <span role="status">
            {pending
              ? 'Updating…'
              : `Showing ${truncated ? 'the first ' : ''}${shown} ${shown === 1 ? 'task' : 'tasks'}`}
          </span>
          {narrowed && (
            <button
              type="button"
              onClick={clear}
              className="rounded-sm text-label-md font-semibold text-primary underline-offset-4 hover:underline"
            >
              Clear filters
            </button>
          )}
        </p>
      </div>
    </div>
  );
}
