import 'server-only';
import { FormAlert } from '@/components/forms/form-alert';
import { ButtonLink } from '@/components/ui/button-link';
import { Icon, type IconName } from '@/components/ui/icon';
import { getEvents } from '@/lib/events/events';
import { tasksPath } from '@/lib/routes';
import { filterParams, isNarrowed, readFilters, type TaskFilters } from '@/lib/tasks/filters';
import { getMembers, getTasks, type TaskList } from '@/lib/tasks/tasks';
import { todayInIndia } from '@/lib/weddings/validation';
import { getWedding } from '@/lib/weddings/workspace';
import type { TaskChoices } from './task-form';
import { AddTaskButton, TaskDrawer } from './task-drawer';
import { TaskRow } from './task-row';
import { TaskToolbar } from './task-toolbar';

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * The Tasks page (Stitch "Tasks Management"): real counts, then the
 * wedding's tasks with search, views, filters and sorting, or a first-task
 * prompt; "Add task" and editing for an active wedding. The layout has
 * already answered "not found" for anyone who is not a member.
 */
export async function TasksSection({
  params,
  searchParams,
}: {
  params: Promise<{ weddingId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { weddingId } = await params;
  const filters = readFilters(await searchParams);
  const [wedding, tasks, members, events] = await Promise.all([
    getWedding(weddingId),
    getTasks(weddingId, filters),
    getMembers(weddingId),
    getEvents(weddingId),
  ]);
  if (wedding.kind !== 'ok') return null;
  const writable = wedding.wedding.status === 'active';
  const choices: TaskChoices = {
    events: events.kind === 'ok' ? events.events.map(({ id, title }) => ({ id, title })) : [],
    members: members ?? [],
  };

  const page = (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex max-w-2xl flex-col gap-2">
          <p className="flex items-center gap-2 text-label-sm font-semibold tracking-widest text-secondary uppercase">
            <span className="size-1.5 rounded-full bg-secondary" aria-hidden="true" />
            Checklist & timelines
          </p>
          <h1 className="font-serif text-headline-lg-mobile tracking-tight text-on-surface sm:text-headline-lg">
            Tasks
          </h1>
          <p className="text-body-lg text-on-surface-variant">
            Keep every detail of your celebration on track, across families, helpers and ceremonies.
          </p>
        </div>
        {writable && tasks.kind === 'ok' && tasks.counts.all > 0 && (
          <AddTaskButton>Add task</AddTaskButton>
        )}
      </header>

      {!writable && (
        <FormAlert tone="error" title="This wedding is read-only">
          It has been archived, so its tasks can still be seen but no longer changed.
        </FormAlert>
      )}

      {tasks.kind === 'unavailable' ? (
        <section className="rounded-2xl bg-surface-container-lowest p-8 shadow-sm">
          <h2 className="text-title-md text-on-surface">We couldn’t load the tasks</h2>
          <p className="mt-2 text-body-md text-on-surface-variant">
            Something went wrong on our side. Your tasks are safe; please try again in a moment.
          </p>
          <ButtonLink href={tasksPath(weddingId, filterParams(filters))} size="md" className="mt-5">
            Try again
          </ButtonLink>
        </section>
      ) : tasks.counts.all === 0 ? (
        <TasksEmpty writable={writable} />
      ) : (
        <>
          <TaskStats counts={tasks.counts} />
          <TaskPanel weddingId={weddingId} filters={filters} tasks={tasks} choices={choices} />
        </>
      )}
    </div>
  );

  return writable ? (
    <TaskDrawer weddingId={weddingId} choices={choices}>
      {page}
    </TaskDrawer>
  ) : (
    page
  );
}

function Stat({
  label,
  value,
  note,
  icon,
  tone = 'default',
  children,
}: {
  label: string;
  value: number;
  note: string;
  icon: IconName;
  tone?: 'default' | 'alert';
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h2
          className={`text-label-sm tracking-wider uppercase ${
            tone === 'alert' ? 'text-error' : 'text-on-surface-variant'
          }`}
        >
          {label}
        </h2>
        <span
          aria-hidden="true"
          className={`flex size-8 items-center justify-center rounded-lg ${
            tone === 'alert'
              ? 'bg-error-container text-on-error-container'
              : 'bg-surface-container text-on-surface-variant'
          }`}
        >
          <Icon name={icon} className="size-4.5" />
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <span className="flex items-baseline gap-2">
          <span
            className={`font-serif text-headline-lg-mobile ${
              tone === 'alert' && value > 0 ? 'text-error' : 'text-on-surface'
            }`}
          >
            {value}
          </span>
          <span className="text-body-sm text-on-surface-variant">{note}</span>
        </span>
        {children}
      </div>
    </div>
  );
}

/** The wedding's real task counts (no other figures from the design's sample). */
function TaskStats({ counts }: { counts: TaskList['counts'] }) {
  const share = counts.all > 0 ? Math.round((counts.completed / counts.all) * 100) : 0;
  return (
    <section aria-label="Task summary" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <Stat label="Total tasks" value={counts.all} note="in this wedding" icon="checklist" />
      <Stat label="In progress" value={counts.inProgress} note="being worked on" icon="schedule" />
      <Stat
        label="Overdue"
        value={counts.overdue}
        note="past due and open"
        icon="error"
        tone="alert"
      />
      <Stat
        label="Completed"
        value={counts.completed}
        note={`of ${counts.all}`}
        icon="check-circle"
      >
        <span
          className="block h-1.5 overflow-hidden rounded-full bg-surface-container-high"
          aria-hidden="true"
        >
          <span className="block h-full rounded-full bg-primary" style={{ width: `${share}%` }} />
        </span>
      </Stat>
    </section>
  );
}

function TaskPanel({
  weddingId,
  filters,
  tasks,
  choices,
}: {
  weddingId: string;
  filters: TaskFilters;
  tasks: TaskList;
  choices: TaskChoices;
}) {
  const today = todayInIndia();
  return (
    <section
      aria-label="Task list"
      className="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm"
    >
      <TaskToolbar
        weddingId={weddingId}
        filters={filters}
        counts={tasks.counts}
        shown={tasks.tasks.length}
        truncated={tasks.truncated}
        choices={choices}
      />
      {tasks.tasks.length === 0 ? (
        <NoResults weddingId={weddingId} filters={filters} />
      ) : (
        <>
          <div
            aria-hidden="true"
            className="hidden grid-cols-[auto_minmax(0,5fr)_minmax(0,2fr)_minmax(0,2fr)_minmax(0,2fr)_auto] gap-x-3 bg-surface-container-low px-6 py-3 text-label-sm tracking-wider text-on-surface-variant uppercase md:grid"
          >
            <span className="w-5" />
            <span>Task</span>
            <span>Ceremony</span>
            <span>Assignee</span>
            <span>Due date</span>
            <span className="w-8" />
          </div>
          <ol className="divide-y divide-surface-container-high">
            {tasks.tasks.map((task) => (
              <li key={task.id}>
                <TaskRow weddingId={weddingId} task={task} today={today} />
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}

/** Tasks exist, but none match what was chosen. */
function NoResults({ weddingId, filters }: { weddingId: string; filters: TaskFilters }) {
  const narrowed = isNarrowed(filters);
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span
        aria-hidden="true"
        className="mb-4 flex size-12 items-center justify-center rounded-full bg-surface-container text-on-surface-variant"
      >
        <Icon name="filter-alt-off" className="size-6" />
      </span>
      <h2 className="font-serif text-headline-sm text-on-surface">
        {narrowed ? 'No tasks match your filters' : 'Nothing here yet'}
      </h2>
      <p className="mt-1.5 max-w-md text-body-md text-on-surface-variant">
        {narrowed
          ? 'Try a different search, ceremony, status or assignee.'
          : 'No tasks are in this view right now.'}
      </p>
      {(narrowed || filters.view !== 'all') && (
        <ButtonLink href={tasksPath(weddingId)} variant="secondary" size="md" className="mt-5">
          {narrowed ? 'Clear all filters' : 'Show all tasks'}
        </ButtonLink>
      )}
    </div>
  );
}

/** The first visit: no tasks yet (Stitch "Tasks Management", empty state). */
function TasksEmpty({ writable }: { writable: boolean }) {
  return (
    <section className="flex flex-col items-center rounded-2xl bg-surface-container-lowest px-6 py-14 text-center shadow-sm">
      <span
        className="mb-4 flex size-14 items-center justify-center rounded-full bg-surface-container text-primary"
        aria-hidden="true"
      >
        <Icon name="checklist" className="size-7" />
      </span>
      <p className="text-label-sm font-semibold tracking-widest text-secondary uppercase">
        Getting started
      </p>
      <h2 className="mt-1 font-serif text-headline-md text-on-surface">
        Let’s get your plans moving
      </h2>
      <p className="mt-1.5 mb-6 max-w-md text-body-md text-on-surface-variant">
        Capture catering tastings, outfit trials, guest hampers and decor confirmations in one
        place, and share them out across your team.
      </p>
      {writable && <AddTaskButton>Add your first task</AddTaskButton>}
    </section>
  );
}

/** While the tasks load: placeholder tiles and rows, announced once. */
export function TasksLoading() {
  return (
    <div className="flex flex-col gap-6">
      <p role="status" className="sr-only">
        Loading tasks…
      </p>
      <div aria-hidden="true" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-2xl bg-surface-container-lowest shadow-sm"
          />
        ))}
      </div>
      <div
        aria-hidden="true"
        className="flex flex-col gap-px overflow-hidden rounded-2xl bg-surface-container-high shadow-sm"
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 animate-pulse bg-surface-container-lowest" />
        ))}
      </div>
    </div>
  );
}
