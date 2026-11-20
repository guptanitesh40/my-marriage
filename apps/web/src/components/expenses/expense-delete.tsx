'use client';

import { useRouter } from 'next/navigation';
import { useState, type RefObject } from 'react';
import { FormAlert } from '@/components/forms/form-alert';
import { api } from '@/lib/api/browser';
import { networkFailure, toFailure } from '@/lib/api/errors';
import type { Expense } from '@/lib/expenses/directory';
import { formatInr } from '@/lib/expenses/money';

/**
 * Asks before deleting an expense, in a modal dialog; Escape or Cancel
 * keeps it. The API keeps the expense and its history, marked deleted
 * (decision 0014); it leaves the list and the totals.
 */
export function DeleteExpenseDialog({
  dialog,
  weddingId,
  expense,
  onDeleted,
}: {
  dialog: RefObject<HTMLDialogElement | null>;
  weddingId: string;
  expense: Expense;
  onDeleted: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const titleId = `delete-expense-${expense.id}-title`;

  async function confirm() {
    if (pending) return;
    setPending(true);
    setAlert(null);
    try {
      const { error, response } = await api.DELETE(
        '/api/v1/weddings/{weddingId}/expenses/{expenseId}',
        { params: { path: { weddingId, expenseId: expense.id } } },
      );
      // Already gone counts as done: someone else deleted it first.
      if (response.ok || response.status === 404) {
        dialog.current?.close();
        onDeleted();
        return;
      }
      const failure = toFailure(response.status, error);
      setAlert(failure.message);
      if (failure.code === 'WEDDING_ARCHIVED') router.refresh();
    } catch {
      setAlert(networkFailure().message);
    }
    setPending(false);
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onClose={() => setAlert(null)}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl bg-surface-container-lowest p-6 text-on-surface shadow-xl backdrop:bg-on-surface/50"
    >
      <h2 id={titleId} className="font-serif text-headline-sm wrap-break-word text-on-surface">
        Delete {expense.title}?
      </h2>
      <p className="mt-2 text-body-md text-on-surface-variant">
        It will be removed from your expenses and their totals
        {expense.paidPaise > 0 ? `, along with the ${formatInr(expense.paidPaise)} paid on it` : ''}
        . Its details and payment history are kept in your records. This can’t be undone here.
      </p>
      {alert && (
        <div className="mt-4">
          <FormAlert tone="error" title="Unable to delete the expense">
            {alert}
          </FormAlert>
        </div>
      )}
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          autoFocus
          onClick={() => dialog.current?.close()}
          className="flex-1 rounded-md bg-surface-container px-4 py-2.5 text-label-md font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={pending}
          aria-disabled={pending}
          className="flex-1 rounded-md bg-error px-4 py-2.5 text-label-md font-semibold text-on-error transition-colors hover:opacity-90 disabled:opacity-60"
        >
          {pending ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </dialog>
  );
}
