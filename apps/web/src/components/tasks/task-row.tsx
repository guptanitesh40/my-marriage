import { Icon } from '@/components/ui/icon';
import { initials, firstName } from '@/lib/format';
import { PRIORITY_LABELS, STATE_LABELS, type Task } from '@/lib/tasks/filters';
import { dueLabel } from '@/lib/tasks/format';
import { EditTaskButton, QuickComplete } from './task-actions';

const PRIORITY_CHIP: Record<Task['priority'], string> = {
  high: 'bg-error-container text-on-error-container',
  normal: 'bg-secondary-container text-on-secondary-container',
  low: 'bg-surface-container-high text-on-surface-variant',
};

const STATE_CHIP: Partial<Record<Task['state'], string>> = {
  in_progress: 'bg-surface-container-highest text-on-surface',
  completed: 'bg-primary-fixed text-on-primary-fixed',
  cancelled: 'bg-surface-container-high text-on-surface-variant',
};

const DUE_TONE = {
  overdue: 'rounded-sm bg-error-container px-2 py-0.5 font-semibold text-on-error-container',
  soon: 'text-secondary',
  later: 'text-on-surface-variant',
  none: 'text-on-surface-variant italic',
} as const;

function Chip({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex shrink-0 rounded-sm px-2 py-0.5 text-label-sm ${className}`}>
      {children}
    </span>
  );
}

/**
 * One task in the list (Stitch "Tasks Management"): a table row on wide
 * screens, a card on phones. Shows the title and a line of its
 * description, its priority or status, ceremony (or General), assignee
 * (or Unassigned) and when it is due.
 */
export function TaskRow({
  weddingId,
  task,
  today,
}: {
  weddingId: string;
  task: Task;
  today: string;
}) {
  const due = dueLabel(task, today);
  const finished = task.state === 'completed' || task.state === 'cancelled';
  const titleId = `task-${task.id}-title`;
  const stateChip = STATE_CHIP[task.state];

  return (
    <article
      aria-labelledby={titleId}
      className="grid grid-cols-[auto_1fr_auto] items-start gap-x-3 gap-y-2 px-4 py-4 transition-colors hover:bg-surface-container-low/60 md:grid-cols-[auto_minmax(0,5fr)_minmax(0,2fr)_minmax(0,2fr)_minmax(0,2fr)_auto] md:items-center md:px-6 md:py-3.5"
    >
      <div className="pt-0.5 md:pt-0">
        <QuickComplete key={`${task.id}:${task.state}`} weddingId={weddingId} task={task} />
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3
            id={titleId}
            className={`text-title-sm wrap-break-word ${
              finished ? 'text-on-surface-variant line-through' : 'text-on-surface'
            }`}
          >
            {task.title}
          </h3>
          {stateChip ? (
            <Chip className={stateChip}>{STATE_LABELS[task.state]}</Chip>
          ) : (
            <Chip className={PRIORITY_CHIP[task.priority]}>{PRIORITY_LABELS[task.priority]}</Chip>
          )}
          {stateChip && !finished && (
            <Chip className={PRIORITY_CHIP[task.priority]}>{PRIORITY_LABELS[task.priority]}</Chip>
          )}
        </div>
        {task.description && (
          <p className="mt-0.5 line-clamp-1 text-body-sm wrap-break-word text-on-surface-variant">
            {task.description}
          </p>
        )}
      </div>

      {/* Ceremony, assignee and due date: a second line on phones, columns on wide screens. */}
      <div className="col-span-2 col-start-2 row-start-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-body-sm md:contents">
        <p>
          <span className="sr-only">Ceremony: </span>
          <Chip
            className={
              task.event
                ? 'bg-secondary-container/60 text-on-secondary-container'
                : 'bg-surface-container-high text-on-surface-variant'
            }
          >
            {task.event?.title ?? 'General'}
          </Chip>
        </p>
        <p className="flex min-w-0 items-center gap-2">
          <span className="sr-only">Assignee: </span>
          {task.assignee ? (
            <>
              <span
                aria-hidden="true"
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-label-sm text-on-primary"
              >
                {initials(task.assignee.displayName)}
              </span>
              <span className="truncate text-on-surface">
                {firstName(task.assignee.displayName)}
              </span>
            </>
          ) : (
            <>
              <span
                aria-hidden="true"
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant"
              >
                <Icon name="person-off" className="size-4" />
              </span>
              <span className="text-on-surface-variant italic">Unassigned</span>
            </>
          )}
        </p>
        <p>
          <span className="sr-only">Due: </span>
          <span className={`inline-flex items-center gap-1.5 ${DUE_TONE[due.tone]}`}>
            {due.tone === 'overdue' && <Icon name="event" className="size-3.5" />}
            {due.text}
          </span>
        </p>
      </div>

      <div className="col-start-3 row-start-1 flex justify-end md:col-start-auto md:row-start-auto">
        <EditTaskButton task={task} />
      </div>
    </article>
  );
}
