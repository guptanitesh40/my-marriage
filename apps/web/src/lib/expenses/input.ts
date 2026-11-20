import { amountProblem } from './money';

/**
 * Checks on an expense before it is sent, so the form answers at once. The
 * same rules as the API's; the API decides in the end, and its field
 * errors are shown the same way.
 */

export const EXPENSE_INPUT_LIMITS = { title: 120, category: 60, notes: 4000, note: 500 } as const;

export interface ExpenseInput {
  title: string;
  category: string;
  amount: string;
  notes: string;
}

function tooLong(value: string, limit: number): string | undefined {
  return [...value].length > limit ? `Use ${limit} characters or fewer.` : undefined;
}

/** Field errors keyed as the API names the fields. */
export function expenseInputErrors(input: ExpenseInput): Record<string, string> {
  const errors: Record<string, string> = {};
  const set = (field: string, message: string | undefined) => {
    if (message) errors[field] = message;
  };
  set(
    'title',
    input.title === ''
      ? 'Enter an expense name.'
      : tooLong(input.title, EXPENSE_INPUT_LIMITS.title),
  );
  set(
    'category',
    input.category === ''
      ? 'Choose a category.'
      : tooLong(input.category, EXPENSE_INPUT_LIMITS.category),
  );
  set('amountPaise', amountProblem(input.amount));
  set('notes', tooLong(input.notes, EXPENSE_INPUT_LIMITS.notes));
  return errors;
}
