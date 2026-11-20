import 'server-only';
import { FormAlert } from '@/components/forms/form-alert';
import { ButtonLink } from '@/components/ui/button-link';
import { Icon, type IconName } from '@/components/ui/icon';
import { getEvents, type WeddingEvent } from '@/lib/events/events';
import { dayNumbers, eventSpan, nextEvent } from '@/lib/events/format';
import { eventsPath, tasksPath } from '@/lib/routes';
import { getTaskSummary, type EventTaskCounts } from '@/lib/tasks/tasks';
import { todayInIndia } from '@/lib/weddings/validation';
import { getWedding } from '@/lib/weddings/workspace';
import { EventBrowser, type EventItem } from './event-browser';
import { AddEventButton, EventDrawer } from './event-drawer';

/**
 * The Events page (Stitch "Events Management"): a summary of the
 * ceremonies and their tasks, then the ceremonies in date order with
 * search and tabs, or a first-ceremony prompt. For an active wedding:
 * "Add event", "Manage" and, for owners, "Delete". The layout has already
 * answered "not found" for anyone who is not a member, so this renders
 * nothing then.
 */
export async function EventsSection({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params;
  const [wedding, events, taskCounts] = await Promise.all([
    getWedding(weddingId),
    getEvents(weddingId),
    getTaskSummary(weddingId),
  ]);
  if (wedding.kind !== 'ok') return null;
  const writable = wedding.wedding.status === 'active';

  const page = (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex max-w-2xl flex-col gap-2">
          <p className="flex items-center gap-2 text-label-sm font-semibold tracking-widest text-secondary uppercase">
            <span className="size-1.5 rounded-full bg-secondary" aria-hidden="true" />
            Ceremonies & schedules
          </p>
          <h1 className="font-serif text-headline-lg-mobile tracking-tight text-on-surface sm:text-headline-lg">
            Events
          </h1>
          <p className="text-body-lg text-on-surface-variant">
            Plan and schedule every celebration of your wedding, in order. Add the ones you know;
            dates, times and venues can follow.
          </p>
        </div>
        {writable && events.kind === 'ok' && events.events.length > 0 && (
          <AddEventButton>Add event</AddEventButton>
        )}
      </header>

      {!writable && (
        <FormAlert tone="error" title="This wedding is read-only">
          It has been archived, so its events can still be seen but no longer changed.
        </FormAlert>
      )}

      {events.kind === 'unavailable' ? (
        <section className="rounded-2xl bg-surface-container-lowest p-8 shadow-sm">
          <h2 className="text-title-md text-on-surface">We couldn’t load the events</h2>
          <p className="mt-2 text-body-md text-on-surface-variant">
            Something went wrong on our side. Your events are safe; please try again in a moment.
          </p>
          <ButtonLink href={eventsPath(weddingId)} size="md" className="mt-5">
            Try again
          </ButtonLink>
        </section>
      ) : events.events.length === 0 ? (
        <EventsEmpty writable={writable} />
      ) : (
        <EventsOverview
          weddingId={weddingId}
          events={events.events}
          truncated={events.truncated}
          taskCounts={taskCounts}
          canDelete={wedding.wedding.role === 'owner'}
        />
      )}
    </div>
  );

  return writable ? <EventDrawer weddingId={weddingId}>{page}</EventDrawer> : page;
}

function EventsOverview({
  weddingId,
  events,
  truncated,
  taskCounts,
  canDelete,
}: {
  weddingId: string;
  events: WeddingEvent[];
  truncated: boolean;
  /** Each ceremony's task counts; null when they could not be loaded. */
  taskCounts: Map<string, EventTaskCounts> | null;
  /** Owners only; managers have no delete actions (PRD). */
  canDelete: boolean;
}) {
  const today = todayInIndia();
  const days = dayNumbers(events);
  const items: EventItem[] = events.map((event) => {
    const counts = taskCounts?.get(event.id);
    return {
      event,
      day: days.get(event.id),
      ...(taskCounts ? { tasks: counts ?? { total: 0, completed: 0, overdue: 0 } } : {}),
      tasksHref: tasksPath(weddingId, new URLSearchParams({ eventId: event.id })),
    };
  });
  return (
    <>
      <EventStats events={events} taskCounts={taskCounts} today={today} />
      <EventBrowser
        weddingId={weddingId}
        items={items}
        truncated={truncated}
        today={today}
        canDelete={canDelete}
      />
    </>
  );
}

function Stat({
  icon,
  iconClass = 'bg-surface-container text-primary',
  label,
  aside,
  value,
  note,
  noteClass = 'text-on-surface-variant',
  children,
}: {
  icon: IconName;
  iconClass?: string;
  label: string;
  /** Beside the label, e.g. a percentage. */
  aside?: string;
  value?: string;
  note?: string;
  noteClass?: string;
  /** Replaces the value and note. */
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-xl bg-surface-container-lowest p-3.5 shadow-sm">
      <span
        aria-hidden="true"
        className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${iconClass}`}
      >
        <Icon name={icon} className="size-5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-label-sm tracking-wider text-on-surface-variant uppercase">
            {label}
          </h2>
          {aside && <span className="text-label-sm font-semibold text-primary">{aside}</span>}
        </div>
        {children ?? (
          <p className="mt-0.5 flex min-w-0 flex-wrap items-baseline gap-x-1.5">
            <span className="font-serif text-headline-sm font-semibold text-on-surface">
              {value}
            </span>
            {note && <span className={`text-label-md ${noteClass}`}>{note}</span>}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * The design's summary tiles, from real data only: how many ceremonies,
 * the days they span, the next one, and their tasks done. (The design's
 * RSVP tile waits for guests.)
 */
function EventStats({
  events,
  taskCounts,
  today,
}: {
  events: WeddingEvent[];
  taskCounts: Map<string, EventTaskCounts> | null;
  today: string;
}) {
  const scheduled = events.filter((event) => event.state === 'scheduled').length;
  const span = eventSpan(events);
  const next = nextEvent(events, today);
  const counted = taskCounts ? [...taskCounts.values()] : [];
  const total = counted.reduce((sum, counts) => sum + counts.total, 0);
  const done = counted.reduce((sum, counts) => sum + counts.completed, 0);
  const share = total > 0 ? Math.round((done / total) * 100) : 0;
  const nextWhen = next
    ? next.inDays === 0
      ? 'today'
      : next.inDays === 1
        ? 'tomorrow'
        : `in ${next.inDays} days`
    : 'None scheduled ahead';

  return (
    <section aria-label="Summary" className="grid grid-cols-2 gap-3 sm:gap-3.5 xl:grid-cols-4">
      <Stat
        icon="event-available"
        label="Total ceremonies"
        value={String(events.length)}
        note={`${scheduled} scheduled`}
      />
      <Stat
        icon="date-range"
        iconClass="bg-secondary-container/40 text-secondary"
        label="Celebration span"
        value={span ? `${span.days} ${span.days === 1 ? 'day' : 'days'}` : '—'}
        note={span?.label ?? 'Dates to be set'}
        noteClass="font-medium text-secondary"
      />
      <Stat
        icon="schedule"
        iconClass="bg-primary-fixed/60 text-primary"
        label="Next ceremony"
        value={next ? next.event.title : '—'}
        note={nextWhen}
      />
      {taskCounts && (
        <Stat
          icon="check-circle"
          iconClass="bg-surface-container text-primary-container"
          label="Ceremony tasks"
          aside={total > 0 ? `${share}%` : undefined}
        >
          {total > 0 ? (
            <p className="mt-1.5 flex items-center gap-2">
              <span
                aria-hidden="true"
                className="block h-1.5 flex-1 overflow-hidden rounded-full bg-surface-container-highest"
              >
                <span
                  className="block h-full rounded-full bg-primary-container"
                  style={{ width: `${share}%` }}
                />
              </span>
              <span className="text-label-sm font-medium text-on-surface-variant">
                {done}/{total}
                <span className="sr-only"> done</span>
              </span>
            </p>
          ) : (
            <p className="mt-0.5 text-label-md text-on-surface-variant">None linked yet</p>
          )}
        </Stat>
      )}
    </section>
  );
}

/** The first visit: no ceremonies yet (Stitch "Workspace Handoff" empty state). */
function EventsEmpty({ writable }: { writable: boolean }) {
  return (
    <section className="flex flex-col items-center rounded-2xl bg-surface-container-lowest px-6 py-12 text-center shadow-sm">
      <span
        className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-surface-container text-primary shadow-sm"
        aria-hidden="true"
      >
        <Icon name="event-upcoming" className="size-7" />
      </span>
      <h2 className="text-title-md text-on-surface">No ceremonies added yet</h2>
      <p className="mt-1.5 mb-6 max-w-md text-body-md text-on-surface-variant">
        Add Haldi, Mehendi, Sangeet or your wedding day, even before the date and venue are decided.
      </p>
      {writable && <AddEventButton>Add first ceremony</AddEventButton>}
    </section>
  );
}

/** While the events load: three placeholder cards, announced once. */
export function EventsLoading() {
  return (
    <div className="flex flex-col gap-4">
      <p role="status" className="sr-only">
        Loading events…
      </p>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          aria-hidden="true"
          className="h-32 animate-pulse rounded-2xl bg-surface-container-lowest shadow-sm"
        />
      ))}
    </div>
  );
}
