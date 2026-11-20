import type { components, operations } from '@my-marriage/contracts';

export type Task = components['schemas']['TaskDto'];
export type TaskState = Task['state'];
export type TaskPriority = Task['priority'];
type ListQuery = NonNullable<operations['TasksController_list']['parameters']['query']>;
export type TaskView = NonNullable<ListQuery['view']>;
export type TaskSort = NonNullable<ListQuery['sort']>;

export const TASK_VIEWS: readonly { value: TaskView; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'mine', label: 'My Tasks' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'completed', label: 'Completed' },
];

export const TASK_SORTS: readonly { value: TaskSort; label: string }[] = [
  { value: 'due', label: 'Due date (earliest)' },
  { value: 'due_desc', label: 'Due date (latest)' },
  { value: 'priority', label: 'Highest priority' },
  { value: 'updated', label: 'Recently updated' },
];

/** The API's `normal` is shown as Medium, as in the design. */
export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  normal: 'Medium',
  high: 'High',
};

export const STATE_LABELS: Record<TaskState, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

/** What the list shows, kept in the address so it survives a reload and can be shared. */
export interface TaskFilters {
  view: TaskView;
  q: string;
  /** An event ID, `none` for general tasks, or empty for all. */
  eventId: string;
  /** A member's user ID, `none` for unassigned, or empty for all. */
  assigneeId: string;
  state: TaskState | '';
  priority: TaskPriority | '';
  sort: TaskSort;
}

export const DEFAULT_FILTERS: TaskFilters = {
  view: 'all',
  q: '',
  eventId: '',
  assigneeId: '',
  state: '',
  priority: '',
  sort: 'due',
};

const ID_OR_NONE = /^(?:[a-f0-9]{24}|none)$/i;

function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

function pick<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/**
 * The filters in a page's query string. Anything unknown or malformed is
 * ignored, so an edited address never breaks the page.
 */
export function readFilters(params: Record<string, string | string[] | undefined>): TaskFilters {
  const id = (value: string) => (ID_OR_NONE.test(value) ? value.toLowerCase() : '');
  return {
    view: pick(
      one(params.view),
      TASK_VIEWS.map((v) => v.value),
      'all',
    ),
    q: one(params.q).trim().replace(/\s+/g, ' ').slice(0, 100),
    eventId: id(one(params.eventId)),
    assigneeId: id(one(params.assigneeId)),
    state: pick(one(params.state), Object.keys(STATE_LABELS) as TaskState[], '' as TaskState),
    priority: pick(
      one(params.priority),
      Object.keys(PRIORITY_LABELS) as TaskPriority[],
      '' as TaskPriority,
    ),
    sort: pick(
      one(params.sort),
      TASK_SORTS.map((s) => s.value),
      'due',
    ),
  };
}

/** The filters that differ from the defaults, as query parameters. */
export function filterParams(filters: TaskFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of Object.keys(DEFAULT_FILTERS) as (keyof TaskFilters)[]) {
    const value = filters[key];
    if (value && value !== DEFAULT_FILTERS[key]) params.set(key, value);
  }
  return params;
}

/** Whether anything narrows the list beyond the view: a search or a filter. */
export function isNarrowed(filters: TaskFilters): boolean {
  return Boolean(
    filters.q || filters.eventId || filters.assigneeId || filters.state || filters.priority,
  );
}
