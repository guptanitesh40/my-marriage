'use client';

import { useRouter } from 'next/navigation';
import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { Drawer } from '@/components/ui/drawer';
import { Icon } from '@/components/ui/icon';
import type { Expense } from '@/lib/expenses/directory';
import { ExpenseDetails } from './expense-details';
import { ExpenseForm, type ExpenseChoices } from './expense-form';

interface ExpenseDrawerApi {
  /** Opens an empty form; only on a page that can be changed. */
  add: (() => void) | null;
  view: (expense: Expense) => void;
}

const ExpenseDrawerContext = createContext<ExpenseDrawerApi | null>(null);

export function useExpenseDrawer(): ExpenseDrawerApi | null {
  return useContext(ExpenseDrawerContext);
}

type Mode = { kind: 'add' } | { kind: 'view'; id: string } | { kind: 'edit'; id: string };

/**
 * The page's one drawer (Stitch "Expenses Management"): an expense's
 * details and history, and, while the wedding can be changed, the form
 * that adds or edits one. After any change the list is fetched again, so
 * the totals on the page always match.
 */
export function ExpenseDrawer({
  weddingId,
  expenses,
  choices,
  writable,
  canDelete,
  children,
}: {
  weddingId: string;
  expenses: readonly Expense[];
  choices: ExpenseChoices;
  writable: boolean;
  /** Owners of an active wedding; managers cannot delete (as for events and vendors). */
  canDelete: boolean;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [announcement, setAnnouncement] = useState('');
  const [mode, setMode] = useState<Mode>({ kind: 'add' });
  // A fresh form, or fresh details, after each save; a closed "add" drawer keeps what was typed.
  const [version, setVersion] = useState(0);

  const current = mode.kind === 'add' ? undefined : expenses.find((e) => e.id === mode.id);

  function show(next: Mode) {
    setAnnouncement('');
    if (next.kind !== 'add' || mode.kind !== 'add') setVersion((v) => v + 1);
    setMode(next);
    if (!dialog.current?.open) dialog.current?.showModal();
  }

  function close() {
    dialog.current?.close();
  }

  function announce(message: string) {
    setAnnouncement(message);
    router.refresh();
  }

  function saved(expense: Expense) {
    setVersion((v) => v + 1);
    if (mode.kind === 'edit') {
      setMode({ kind: 'view', id: expense.id });
      announce(`${expense.title} was updated.`);
    } else {
      // Straight to its details, where the first payment can be recorded.
      setMode({ kind: 'view', id: expense.id });
      announce(`${expense.title} was added.`);
    }
  }

  const api: ExpenseDrawerApi = {
    add: writable ? () => show({ kind: 'add' }) : null,
    view: (expense) => show({ kind: 'view', id: expense.id }),
  };

  // A just-added expense is not in the list until it is fetched again.
  const [added, setAdded] = useState<Expense | null>(null);
  const shown = current ?? (mode.kind !== 'add' && added?.id === mode.id ? added : undefined);
  const viewing = mode.kind === 'view' && shown;
  const editing = mode.kind === 'edit' && shown;

  return (
    <ExpenseDrawerContext.Provider value={api}>
      {children}
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <Drawer
        dialog={dialog}
        titleId="expense-drawer-title"
        wide={Boolean(viewing)}
        eyebrow={viewing ? shown.category : editing ? 'Edit expense' : 'Wedding finances'}
        title={viewing || editing ? shown.title : 'Add expense'}
        description={
          viewing
            ? undefined
            : editing
              ? 'Change the details or the agreed amount. Payments stay as they are.'
              : 'Record a wedding cost. You can add payments later.'
        }
      >
        {viewing ? (
          <ExpenseDetails
            key={`${shown.id}-${version}`}
            weddingId={weddingId}
            expense={shown}
            writable={writable}
            onClose={close}
            onEdit={() => show({ kind: 'edit', id: shown.id })}
            onChanged={announce}
            onDeleted={
              canDelete
                ? () => {
                    close();
                    setMode({ kind: 'add' });
                    announce(`${shown.title} was deleted.`);
                  }
                : undefined
            }
          />
        ) : writable && (mode.kind === 'add' || editing) ? (
          <ExpenseForm
            key={editing ? `edit-${shown.id}-${version}` : `add-${version}`}
            weddingId={weddingId}
            expense={editing ? shown : undefined}
            choices={choices}
            onCancel={editing ? () => show({ kind: 'view', id: shown.id }) : close}
            onSaved={(expense) => {
              setAdded(expense);
              saved(expense);
            }}
          />
        ) : null}
      </Drawer>
    </ExpenseDrawerContext.Provider>
  );
}

/** Opens the page's drawer on a new expense; nothing on a read-only page. */
export function AddExpenseButton({ children }: { children: ReactNode }) {
  const drawer = useExpenseDrawer();
  if (!drawer?.add) return null;
  return (
    <button
      type="button"
      onClick={drawer.add}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-title-sm text-on-primary shadow-md transition-colors hover:bg-primary-container"
    >
      <Icon name="add" className="size-5" />
      {children}
    </button>
  );
}
