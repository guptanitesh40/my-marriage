'use client';

import { useId, useState } from 'react';
import { Icon } from '@/components/ui/icon';

/** Ceremonies shown before "Show more", so the card stays as short as its neighbours. */
export const CEREMONIES_SHOWN = 2;

export interface CeremonyConfirmed {
  eventId: string;
  title: string;
  confirmedPeople: number;
  invitedPeople: number;
}

/**
 * Confirmed people per ceremony, in ceremony order: the first few, then
 * the rest on request, in place.
 */
export function ConfirmedByCeremony({ events }: { events: readonly CeremonyConfirmed[] }) {
  const [all, setAll] = useState(false);
  const listId = useId();
  const hidden = events.length - CEREMONIES_SHOWN;
  const shown = all || hidden <= 0 ? events : events.slice(0, CEREMONIES_SHOWN);

  return (
    <>
      <ul id={listId} className="mt-2 flex flex-col gap-0.5 text-body-sm">
        {shown.map((event) => (
          <li key={event.eventId} className="flex justify-between gap-3">
            <span className="truncate text-on-surface">{event.title}</span>
            <span className="shrink-0 text-on-surface tabular-nums">
              <b>{event.confirmedPeople}</b>
              <span className="text-on-surface-variant"> of {event.invitedPeople}</span>
            </span>
          </li>
        ))}
      </ul>
      {hidden > 0 && (
        <button
          type="button"
          aria-expanded={all}
          aria-controls={listId}
          onClick={() => setAll((current) => !current)}
          className="mt-1.5 inline-flex min-h-8 items-center gap-1 self-start rounded-md text-label-md font-semibold text-primary hover:underline"
        >
          {all ? 'Show fewer' : `Show ${hidden} more`}
          <Icon
            name="expand-more"
            className={`size-4.5 transition-transform ${all ? 'rotate-180' : ''}`}
          />
        </button>
      )}
    </>
  );
}
