import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';
import { eventWhen, missingDetails, partOfDay } from '@/lib/events/format';
import { eventIcon, eventTone, type EventTone } from '@/lib/events/presets';
import type { components } from '@my-marriage/contracts';

type WeddingEvent = components['schemas']['EventDto'];
type TaskCounts = Pick<
  components['schemas']['EventTaskCountsDto'],
  'total' | 'completed' | 'overdue'
>;

/** The marker on the timeline and the day chip, in each ceremony's colours (Stitch). */
const TONES: Record<EventTone, { marker: string; day: string }> = {
  warm: {
    marker: 'bg-secondary-container text-on-secondary-container ring-surface-container-lowest',
    day: 'bg-secondary-container/50 text-on-secondary-container',
  },
  green: {
    marker: 'bg-primary-container text-on-primary-container ring-surface-container-lowest',
    day: 'bg-surface-container-high text-on-surface-variant',
  },
  brown: {
    marker: 'bg-secondary text-on-secondary ring-surface-container-lowest',
    day: 'bg-secondary-container/40 text-on-secondary-container',
  },
  gold: {
    marker: 'bg-secondary-fixed text-on-secondary-fixed ring-surface-container-lowest',
    day: 'bg-secondary-container/50 text-on-secondary-container',
  },
  main: {
    marker: 'bg-primary text-on-primary ring-primary/20',
    day: 'bg-secondary text-on-secondary',
  },
  neutral: {
    marker: 'bg-surface-container-highest text-on-surface ring-surface-container-lowest',
    day: 'bg-surface-container-high text-on-surface-variant',
  },
};

const STATES: Record<WeddingEvent['state'], { label: string; className: string; dot?: string }> = {
  scheduled: { label: 'Scheduled', className: 'bg-surface-container-high text-on-surface' },
  completed: {
    label: 'Completed',
    className: 'bg-primary-fixed text-on-primary-fixed',
    dot: 'bg-primary',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-error-container text-on-error-container',
    dot: 'bg-error',
  },
};

/** The small figure tiles on the right of a card, as in the design. */
const metricTileClass = 'flex min-w-20 flex-col rounded-lg bg-surface p-2';

/**
 * One ceremony in the list (Stitch "Events Management"): its marker on
 * the timeline, day and part of the day, when it happens, status, name,
 * venue and description; on the right, its tasks done (a link to them)
 * and `actions`. Only what the API knows is shown.
 */
export function EventCard({
  event,
  day,
  tasks,
  tasksHref,
  actions,
}: {
  event: WeddingEvent;
  day?: number;
  /** Its tasks, not counting cancelled ones; missing when they could not be loaded. */
  tasks?: TaskCounts;
  /** The Tasks page, filtered to this ceremony. */
  tasksHref?: string;
  actions?: ReactNode;
}) {
  const when = eventWhen(event);
  const missing = missingDetails(event);
  const state = STATES[event.state];
  const tone = eventTone(event.title);
  const part = partOfDay(event.startTime);
  const titleId = `event-${event.id}-title`;
  const cancelled = event.state === 'cancelled';

  // While its menu is open the card sits above the next one, which the menu overlaps.
  return (
    <article
      aria-labelledby={titleId}
      className="relative z-10 rounded-2xl bg-surface-container-lowest p-4 shadow-sm transition-all hover:shadow-md has-[[aria-expanded=true]]:z-30 lg:p-6"
    >
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex min-w-0 items-start gap-4">
          <span
            aria-hidden="true"
            className={`flex size-9 shrink-0 items-center justify-center rounded-full shadow-xs ring-4 ${TONES[tone].marker}`}
          >
            <Icon name={eventIcon(event.title)} className="size-4.5" />
          </span>
          <div className="flex min-w-0 flex-col">
            <p className="flex flex-wrap items-center gap-2">
              {day !== undefined && (
                <span
                  className={`rounded-md px-2 py-0.5 text-label-sm font-semibold tracking-wide uppercase ${TONES[tone].day}`}
                >
                  Day {day}
                  {part ? ` · ${part}` : ''}
                </span>
              )}
              {when && <span className="text-label-sm text-on-surface-variant">{when}</span>}
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-label-sm font-semibold ${state.className}`}
              >
                {state.dot && (
                  <span className={`size-1.5 rounded-full ${state.dot}`} aria-hidden="true" />
                )}
                {state.label}
              </span>
              {tone === 'main' && !cancelled && (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary-container px-2 py-0.5 text-label-sm font-semibold text-on-secondary-container">
                  <Icon name="stars" className="size-3.5" />
                  Main ceremony
                </span>
              )}
            </p>
            <h2
              id={titleId}
              className={`mt-1 font-serif text-headline-md tracking-tight wrap-break-word ${
                cancelled ? 'text-on-surface-variant line-through' : 'text-on-surface'
              }`}
            >
              {event.title}
            </h2>
            {(event.venue?.name || event.venue?.address) && (
              <p className="mt-2 flex items-start gap-1.5 text-body-sm">
                <Icon name="location-on" className="mt-0.5 size-4 shrink-0 text-secondary" />
                <span className="min-w-0 wrap-break-word">
                  {event.venue.name && (
                    <span className="font-medium text-on-surface">{event.venue.name}</span>
                  )}
                  {event.venue.address && (
                    <span className="text-on-surface-variant">
                      {event.venue.name ? ' · ' : ''}
                      {event.venue.address}
                    </span>
                  )}
                </span>
              </p>
            )}
            {event.description && (
              <p className="mt-1.5 line-clamp-1 text-body-sm wrap-break-word text-on-surface-variant">
                {event.description}
              </p>
            )}
            {missing.length > 0 && (
              <ul aria-label="Still to decide" className="mt-2 flex flex-wrap gap-2">
                {missing.map((label) => (
                  <li
                    key={label}
                    className="rounded-md border border-dashed border-outline-variant px-2 py-0.5 text-label-sm text-on-surface-variant"
                  >
                    {label}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {((tasks && tasksHref) || actions) && (
          <div className="flex flex-col items-start justify-between gap-4 pt-2 sm:flex-row sm:items-center lg:justify-end lg:pt-0 lg:pl-4">
            {tasks && tasksHref && <TaskTiles tasks={tasks} href={tasksHref} title={event.title} />}
            {actions && <div className="self-end sm:self-center">{actions}</div>}
          </div>
        )}
      </div>
    </article>
  );
}

/**
 * "TASKS 8 / 10 done", and how many are overdue, as the design's figure
 * tiles: a link to the ceremony's tasks. Its name is the words shown, with
 * the ceremony's added for screen readers.
 */
function TaskTiles({ tasks, href, title }: { tasks: TaskCounts; href: string; title: string }) {
  return (
    <Link
      href={href}
      className="flex gap-3 rounded-lg transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-primary-container"
    >
      <span className={metricTileClass}>
        <span className="text-label-sm text-on-surface-variant uppercase">
          Tasks<span className="sr-only"> for {title}:</span>
        </span>
        <span className="mt-0.5 text-title-sm font-semibold whitespace-nowrap text-primary">
          {tasks.total === 0 ? 'None yet' : `${tasks.completed} / ${tasks.total} done`}
        </span>
      </span>
      {tasks.overdue > 0 && (
        <span className={metricTileClass}>
          <span className="text-label-sm text-on-surface-variant uppercase">Overdue</span>
          <span className="mt-0.5 text-title-sm font-semibold text-error">{tasks.overdue}</span>
        </span>
      )}
    </Link>
  );
}
