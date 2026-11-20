/**
 * Checks on a task before it is sent, so the form answers at once. The
 * same limits as the API's; the API decides in the end, and its field
 * errors are shown the same way.
 */

export const TASK_INPUT_LIMITS = { title: 120, description: 2000 } as const;

export interface TaskInput {
  title: string;
  description: string;
  dueDate: string;
  dueTime: string;
}

function tooLong(value: string, limit: number): string | undefined {
  return [...value].length > limit ? `Use ${limit} characters or fewer.` : undefined;
}

/** Field errors keyed as the API names the fields. */
export function taskInputErrors(input: TaskInput): Record<string, string> {
  const errors: Record<string, string> = {};
  const set = (field: string, message: string | undefined) => {
    if (message) errors[field] = message;
  };
  set(
    'title',
    input.title === ''
      ? 'Enter what needs to be done.'
      : tooLong(input.title, TASK_INPUT_LIMITS.title),
  );
  set('description', tooLong(input.description, TASK_INPUT_LIMITS.description));
  set(
    'dueTime',
    input.dueTime && !input.dueDate ? 'Choose the day first, then the time.' : undefined,
  );
  return errors;
}
