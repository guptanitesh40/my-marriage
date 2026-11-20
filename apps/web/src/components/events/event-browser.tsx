'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { isUpcoming } from '@/lib/events/format';
import type { components } from '@my-marriage/contracts';
import { EventActions } from './event-actions';
import { EventCard } from './event-card';

type WeddingEvent = components['schemas']['EventDto'];
type TaskCounts = components['schemas']['EventTaskCountsDto'];

export interface EventItem {
  event: WeddingEvent;
  day?: number;
  tasks?: Pick<TaskCounts, 'total' | 'completed' | 'overdue'>;
  tasksHref: string;
}

type Tab = 'all' | 'upcoming' | 'completed';

/** Words in the name, venue or description, as typed. */
function matches(event: WeddingEvent, words: string): boolean {
  if (!words) return true;
  const text = [event.title, event.venue?.name, event.venue?.address, event.description]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return words
    .toLowerCase()
    .split(/\s+/)
    .every((word) => text.includes(word));
}

/**
 * The ceremonies with search and the All / Upcoming / Completed tabs
 * (Stitch "Events Management"), joined by a timeline. A wedding has at
 * most a hundred events, all already loaded, so this filters in the
 * browser.
 */
export function EventBrowser({
  weddingId,
  items,
  truncated,
  today,
  canDelete,
}: {
  weddingId: string;
  items: readonly EventItem[];
  truncated: boolean;
  /** India's date, for "upcoming". */
  today: string;
  canDelete: boolean;
}) {
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const words = search.trim();

  const inTab = {
    all: items,
    upcoming: items.filter((item) => isUpcoming(item.event, today)),
    completed: items.filter((item) => item.event.state === 'completed'),
  };
  const shown = inTab[tab].filter((item) => matches(item.event, words));
  const tabs: { value: Tab; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'completed', label: 'Completed' },
  ];

  return (
    <section aria-label="Ceremonies" className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-xl bg-surface-container-lowest p-2.5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div role="search" className="relative w-full md:max-w-sm">
          <label htmlFor="event-search" className="sr-only">
            Search events
          </label>
          <Icon
            name="search"
            className="pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2 text-outline"
          />
          <input
            id="event-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            maxLength={100}
            placeholder="Search by ceremony, venue or notes…"
            className="w-full rounded-lg bg-surface py-2 pr-3 pl-9 text-body-sm text-on-surface placeholder:text-outline focus:bg-surface-container-lowest focus-visible:outline-2 focus-visible:outline-primary-container"
          />
        </div>
        <div role="group" aria-label="Show" className="flex gap-1">
          {tabs.map((option) => {
            const current = tab === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={current}
                onClick={() => setTab(option.value)}
                className={`rounded-lg px-3 py-1.5 text-label-md whitespace-nowrap transition-all ${
                  current
                    ? 'bg-tertiary text-on-tertiary shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                {option.label} ({inTab[option.value].length})
              </button>
            );
          })}
        </div>
      </div>

      <p role="status" className="text-body-sm text-on-surface-variant">
        {shown.length === 1 ? '1 ceremony' : `${shown.length} ceremonies`}
        {truncated && tab === 'all' && !words ? ' (the first 100)' : ''}
      </p>

      {shown.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl bg-surface-container-lowest px-6 py-12 text-center shadow-sm">
          <h2 className="font-serif text-headline-sm text-on-surface">No ceremonies match</h2>
          <p className="mt-1.5 text-body-md text-on-surface-variant">
            {words ? 'Try another name or venue.' : 'None are in this group yet.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setTab('all');
            }}
            className="mt-5 rounded-md bg-surface-container px-5 py-2.5 text-label-md font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
          >
            Show all ceremonies
          </button>
        </div>
      ) : (
        <ol className="flex flex-col gap-4">
          {shown.map((item, index) => (
            <li key={item.event.id} className="relative">
              {/* The timeline joining the ceremonies, through their icons. */}
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -top-4 left-[2.125rem] h-4 w-0.5 bg-surface-container-highest lg:left-[2.625rem]"
                />
              )}
              <EventCard
                event={item.event}
                day={item.day}
                tasks={item.tasks}
                tasksHref={item.tasksHref}
                actions={
                  <EventActions
                    weddingId={weddingId}
                    event={item.event}
                    tasksHref={item.tasksHref}
                    canDelete={canDelete}
                  />
                }
              />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
