'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { useFocusFirstProblem } from '@/components/auth/hooks';
import { FormAlert } from '@/components/forms/form-alert';
import { SelectField } from '@/components/forms/select-field';
import { SubmitButton } from '@/components/forms/submit-button';
import { FieldFrame, inputClass, TextField } from '@/components/forms/text-field';
import { api } from '@/lib/api/browser';
import { networkFailure, toFailure } from '@/lib/api/errors';
import {
  PRIORITY_LABELS,
  STATE_LABELS,
  type Task,
  type TaskPriority,
  type TaskState,
} from '@/lib/tasks/filters';
import { TASK_INPUT_LIMITS, taskInputErrors } from '@/lib/tasks/input';
import { tidy } from '@/lib/weddings/validation';
import type { components } from '@my-marriage/contracts';

type Member = components['schemas']['MemberDto'];

/** What a task can be linked to: the wedding's events and its active team. */
export interface TaskChoices {
  events: readonly { id: string; title: string }[];
  members: readonly Member[];
}

/** Failures that mean the page is out of date: it shows the truth after a refresh. */
const STALE = new Set(['WEDDING_ARCHIVED', 'WEDDING_NOT_FOUND', 'TASK_NOT_FOUND']);
/** A refused event or assignee: the lists in the form may be out of date. */
const STALE_FIELDS = ['eventId', 'assigneeId'];

/** Low/Medium/High or the four statuses, as one row of choices (Stitch drawer). */
function Segmented<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  error,
}: {
  legend: string;
  name: string;
  options: Record<T, string>;
  value: T;
  onChange: (value: T) => void;
  error?: string;
}) {
  return (
    <fieldset aria-describedby={error ? `${name}-error` : undefined}>
      <legend className="mb-1.5 text-label-md font-semibold text-on-surface">{legend}</legend>
      <div className="flex gap-1 rounded-lg bg-surface-container-low p-1">
        {(Object.keys(options) as T[]).map((option) => (
          <label key={option} className="min-w-0 flex-1 cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              className="peer sr-only"
            />
            <span className="flex h-full items-center justify-center rounded-md px-2 py-2 text-center text-label-md text-on-surface-variant transition-colors peer-checked:bg-surface-container-lowest peer-checked:text-primary peer-checked:shadow-sm peer-focus-visible:outline-2 peer-focus-visible:outline-primary-container hover:text-on-surface">
              {options[option]}
            </span>
          </label>
        ))}
      </div>
      {error && (
        <p id={`${name}-error`} className="mt-1.5 text-body-sm text-error">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/**
 * A task's fields (PRD TASK-01, TASK-02): empty for a new one, or filled
 * in from `task` to change it. Only the title is required; a task may be
 * general, unassigned and without a due date. New tasks are To Do and
 * Medium. The due day and time are India's. The API has the last word on
 * every rule, including who can be assigned.
 */
export function TaskForm({
  weddingId,
  task,
  choices,
  onCancel,
  onSaved,
}: {
  weddingId: string;
  /** The task being changed; a new one when left out. */
  task?: Task;
  choices: TaskChoices;
  onCancel: () => void;
  onSaved: (title: string) => void;
}) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const focusProblem = useFocusFirstProblem(form);
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'normal');
  const [state, setState] = useState<TaskState>(task?.state ?? 'todo');
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<string | null>(null);

  function send(input: {
    title: string;
    description: string;
    eventId: string;
    assigneeId: string;
    dueDate: string;
    dueTime: string;
  }) {
    const dueTime = input.dueDate && input.dueTime ? input.dueTime : '';
    if (task) {
      return api.PATCH('/api/v1/weddings/{weddingId}/tasks/{taskId}', {
        params: { path: { weddingId, taskId: task.id } },
        body: {
          title: input.title,
          description: input.description || null,
          eventId: input.eventId || null,
          assigneeId: input.assigneeId || null,
          dueDate: input.dueDate || null,
          dueTime: dueTime || null,
          priority,
          state,
        },
      });
    }
    return api.POST('/api/v1/weddings/{weddingId}/tasks', {
      params: { path: { weddingId } },
      body: {
        title: input.title,
        ...(input.description ? { description: input.description } : {}),
        ...(input.eventId ? { eventId: input.eventId } : {}),
        ...(input.assigneeId ? { assigneeId: input.assigneeId } : {}),
        ...(input.dueDate ? { dueDate: input.dueDate } : {}),
        ...(dueTime ? { dueTime } : {}),
        priority,
        state,
      },
    });
  }

  async function submit(submitted: FormEvent<HTMLFormElement>) {
    submitted.preventDefault();
    if (pending) return;
    const values = new FormData(submitted.currentTarget);
    const text = (name: string) => String(values.get(name) ?? '');
    const input = {
      title: tidy(text('title')),
      description: text('description').trim(),
      eventId: text('eventId'),
      assigneeId: text('assigneeId'),
      dueDate,
      dueTime: text('dueTime'),
    };
    const problems = taskInputErrors(input);
    setAlert(null);
    setErrors(problems);
    if (Object.keys(problems).length > 0) return focusProblem();

    setPending(true);
    try {
      const { data, error, response } = await send(input);
      if (data) {
        onSaved(data.data.title);
        return;
      }
      const failure = toFailure(response.status, error);
      setErrors(failure.fields);
      if (Object.keys(failure.fields).length === 0) setAlert(failure.message);
      if (STALE.has(failure.code) || STALE_FIELDS.some((field) => field in failure.fields)) {
        router.refresh();
      }
    } catch {
      setAlert(networkFailure().message);
    }
    setPending(false);
    focusProblem();
  }

  const eventOptions = [
    { value: '', label: 'General / No event' },
    ...choices.events.map((event) => ({ value: event.id, label: event.title })),
  ];
  const memberOptions = [
    { value: '', label: 'Unassigned' },
    ...choices.members.map((member) => ({
      value: member.userId,
      label: `${member.displayName} (${member.role === 'owner' ? 'Owner' : 'Manager'})`,
    })),
  ];
  // The task's event or assignee only if still one of the choices.
  const eventId = choices.events.some((e) => e.id === task?.event?.id) ? task?.event?.id : '';
  const assigneeId = choices.members.some((m) => m.userId === task?.assignee?.userId)
    ? task?.assignee?.userId
    : '';

  return (
    <form ref={form} noValidate onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 pb-6">
        {alert && (
          <FormAlert
            tone="error"
            title={task ? 'Unable to save your changes' : 'Unable to add the task'}
          >
            {alert}
          </FormAlert>
        )}

        <TextField
          id="task-title"
          name="title"
          label="Task name"
          labelAside={<span className="text-label-sm font-medium text-primary">* Required</span>}
          placeholder="e.g. Confirm Haldi decorations"
          autoComplete="off"
          autoFocus
          required
          maxLength={TASK_INPUT_LIMITS.title}
          defaultValue={task?.title}
          error={errors.title}
        />

        <FieldFrame id="task-description" label="Description" error={errors.description}>
          <textarea
            id="task-description"
            name="description"
            rows={3}
            maxLength={TASK_INPUT_LIMITS.description}
            defaultValue={task?.description}
            placeholder="Add vendor requirements, contacts or deliverables…"
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={errors.description ? 'task-description-error' : undefined}
            className={`${inputClass} border-outline-variant`}
          />
        </FieldFrame>

        <SelectField
          id="task-event"
          name="eventId"
          label="Event"
          options={eventOptions}
          defaultValue={eventId}
          error={errors.eventId}
        />

        <SelectField
          id="task-assignee"
          name="assigneeId"
          label="Assign to"
          options={memberOptions}
          defaultValue={assigneeId}
          error={errors.assigneeId}
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-4">
          <TextField
            id="task-due-date"
            name="dueDate"
            type="date"
            label="Due date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            error={errors.dueDate}
          />
          <TextField
            id="task-due-time"
            name="dueTime"
            type="time"
            label="Time (optional)"
            disabled={!dueDate}
            defaultValue={task?.dueTime}
            hint={dueDate ? 'India time' : 'Choose the day first.'}
            error={errors.dueTime}
          />
        </div>

        <Segmented
          legend="Priority"
          name="priority"
          options={PRIORITY_LABELS}
          value={priority}
          onChange={setPriority}
          error={errors.priority}
        />
        <Segmented
          legend="Status"
          name="state"
          options={STATE_LABELS}
          value={state}
          onChange={setState}
          error={errors.state}
        />
      </div>

      <div className="flex gap-3 border-t border-surface-container-highest bg-surface-container-low px-6 py-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-md bg-surface-container-lowest px-4 py-3 text-label-md font-semibold text-on-surface shadow-sm transition-colors hover:bg-surface-container"
        >
          Cancel
        </button>
        <div className="flex-1">
          <SubmitButton pending={pending} pendingLabel="Saving…">
            {task ? 'Save changes' : 'Create task'}
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
