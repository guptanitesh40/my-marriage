'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { api } from '@/lib/api/browser';
import { networkFailure, toFailure } from '@/lib/api/errors';
import type { Task } from '@/lib/tasks/filters';
import { useTaskDrawer } from './task-drawer';

const STALE = new Set(['WEDDING_ARCHIVED', 'WEDDING_NOT_FOUND', 'TASK_NOT_FOUND']);

/** The circle a task starts with: a check when completed, a clock while in progress. */
function Mark({ state }: { state: Task['state'] }) {
  if (state === 'completed') {
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-primary text-on-primary">
        <Icon name="check" className="size-3.5" />
      </span>
    );
  }
  if (state === 'in_progress') {
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant">
        <Icon name="schedule" className="size-3.5" />
      </span>
    );
  }
  return <span className="block size-5 rounded-full border-2 border-outline-variant" />;
}

/**
 * Completes an open task in one click, or reopens a completed one (to To
 * Do), from the list (Stitch "Tasks Management"). The circle changes at
 * once; it goes back, with the reason announced, if the save fails.
 * Cancelled tasks are changed from the drawer. On a read-only page it only
 * shows the state.
 */
export function QuickComplete({ weddingId, task }: { weddingId: string; task: Task }) {
  const router = useRouter();
  const drawer = useTaskDrawer();
  // The row remounts this when the saved state arrives (its key is the state).
  const [state, setState] = useState(task.state);
  const [pending, setPending] = useState(false);

  if (!drawer || task.state === 'cancelled') {
    return (
      <span className="shrink-0" aria-hidden="true">
        <Mark state={state} />
      </span>
    );
  }

  const done = state === 'completed';

  async function toggle() {
    if (pending || !drawer) return;
    const next = done ? 'todo' : 'completed';
    setState(next);
    setPending(true);
    try {
      const { data, error, response } = await api.PATCH(
        '/api/v1/weddings/{weddingId}/tasks/{taskId}',
        { params: { path: { weddingId, taskId: task.id } }, body: { state: next } },
      );
      if (data) {
        drawer.announce(
          next === 'completed' ? `${task.title} is completed.` : `${task.title} is open again.`,
        );
        router.refresh();
        return;
      }
      const failure = toFailure(response.status, error);
      drawer.announce(`${task.title} was not changed. ${failure.message}`);
      if (STALE.has(failure.code)) router.refresh();
    } catch {
      drawer.announce(`${task.title} was not changed. ${networkFailure().message}`);
    }
    setState(task.state);
    setPending(false);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={done}
      aria-label={`Completed: ${task.title}`}
      aria-busy={pending || undefined}
      className="-m-1.5 shrink-0 rounded-full p-1.5 transition-colors hover:bg-primary/10 disabled:cursor-wait"
    >
      <Mark state={state} />
    </button>
  );
}

/** Opens the drawer on the task. Nothing on a read-only page. */
export function EditTaskButton({ task }: { task: Task }) {
  const drawer = useTaskDrawer();
  if (!drawer) return null;
  return (
    <button
      type="button"
      onClick={() => drawer.edit(task)}
      aria-label={`Edit ${task.title}`}
      className="rounded-md p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
    >
      <Icon name="edit-note" className="size-5" />
    </button>
  );
}
