'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useFocusFirstProblem } from '@/components/auth/hooks';
import { FormAlert } from '@/components/forms/form-alert';
import { SelectField } from '@/components/forms/select-field';
import { SubmitButton } from '@/components/forms/submit-button';
import { FieldFrame, inputClass, TextField } from '@/components/forms/text-field';
import { Icon } from '@/components/ui/icon';
import { api } from '@/lib/api/browser';
import { networkFailure, toFailure } from '@/lib/api/errors';
import { EXPENSE_CATEGORIES, type Expense } from '@/lib/expenses/directory';
import { EXPENSE_INPUT_LIMITS, expenseInputErrors } from '@/lib/expenses/input';
import { RECEIPT_LIMITS } from '@/lib/expenses/files';
import { formatInr, parseRupees, rupeesInput } from '@/lib/expenses/money';
import { tidy } from '@/lib/weddings/validation';
import { ReceiptPicker, useReceipts } from './receipts';

/** What an expense can be linked to: the wedding's events and vendors. */
export interface ExpenseChoices {
  events: readonly { id: string; title: string }[];
  vendors: readonly { id: string; name: string }[];
}

const OTHER = 'Other';

/** Failures that mean the page is out of date: it shows the truth after a refresh. */
const STALE = new Set(['WEDDING_ARCHIVED', 'WEDDING_NOT_FOUND', 'EXPENSE_NOT_FOUND']);

function isListed(category: string): boolean {
  return (EXPENSE_CATEGORIES as readonly string[]).includes(category);
}

/**
 * An expense's details (PRD EXP-01): name, category and the amount agreed
 * are required; event, vendor, due date and notes are not. Payments,
 * discounts and extras are recorded from the expense's details, never
 * here. On a change, the history is untouched, and an event or vendor
 * deleted since stays linked unless another is chosen.
 */
export function ExpenseForm({
  weddingId,
  expense,
  choices,
  onCancel,
  onSaved,
}: {
  weddingId: string;
  expense?: Expense;
  choices: ExpenseChoices;
  onCancel: () => void;
  onSaved: (expense: Expense) => void;
}) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const focusProblem = useFocusFirstProblem(form);
  const stored = expense?.category ?? '';
  const [choice, setChoice] = useState(stored === '' || isListed(stored) ? stored : OTHER);
  // Its events, including any deleted since: kept unless unticked.
  const [eventIds, setEventIds] = useState<string[]>(
    expense?.events.map((event) => event.id) ?? [],
  );
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<string | null>(null);
  const receipts = useReceipts(weddingId);
  // An edit starts from the expense's files; until they arrive, its files are left as they are.
  const [savedFiles, setSavedFiles] = useState<string[] | null>(expense ? null : []);
  const { reset: resetReceipts } = receipts;
  const expenseId = expense?.id;
  const hasFiles = (expense?.receiptCount ?? 0) > 0;

  useEffect(() => {
    if (!expenseId || !hasFiles) return;
    let live = true;
    api
      .GET('/api/v1/weddings/{weddingId}/expenses/{expenseId}', {
        params: { path: { weddingId, expenseId } },
      })
      .then(({ data }) => {
        if (!live || !data) return;
        resetReceipts(data.data.receipts);
        setSavedFiles(data.data.receipts.map((file) => file.id));
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [weddingId, expenseId, hasFiles, resetReceipts]);
  const filesKnown = savedFiles !== null || !hasFiles;
  const filesChanged = filesKnown && receipts.ids.join(',') !== (savedFiles ?? []).join(',');

  async function submit(submitted: FormEvent<HTMLFormElement>) {
    submitted.preventDefault();
    if (pending || receipts.busy) return;
    const values = new FormData(submitted.currentTarget);
    const text = (name: string) => String(values.get(name) ?? '');
    const input = {
      title: tidy(text('title')),
      category: choice === OTHER ? tidy(text('customCategory')) || OTHER : choice,
      amount: text('amount'),
      notes: text('notes').trim(),
    };
    const problems = expenseInputErrors(input);
    // What has been paid, given any discounts and extras, is the least it can be.
    const lowest = expense ? expense.paidPaise + expense.discountPaise - expense.extraPaise : 0;
    const typed = parseRupees(input.amount);
    if (!problems.amountPaise && typed !== null && typed < lowest) {
      problems.amountPaise = `The agreed amount can’t be less than ${formatInr(lowest)}, given what has been paid and any discounts or extras.`;
    }
    setAlert(null);
    setErrors(problems);
    if (Object.keys(problems).length > 0) return focusProblem();
    const amountPaise = parseRupees(input.amount) ?? 0;
    const vendorId = text('vendorId');
    const dueDate = text('dueDate');

    setPending(true);
    try {
      const { data, error, response } = expense
        ? await api.PATCH('/api/v1/weddings/{weddingId}/expenses/{expenseId}', {
            params: { path: { weddingId, expenseId: expense.id } },
            body: {
              title: input.title,
              category: input.category,
              amountPaise,
              eventIds,
              vendorId: vendorId || null,
              dueDate: dueDate || null,
              notes: input.notes || null,
              ...(filesChanged ? { receiptAssetIds: receipts.ids } : {}),
            },
          })
        : await api.POST('/api/v1/weddings/{weddingId}/expenses', {
            params: { path: { weddingId } },
            body: {
              title: input.title,
              category: input.category,
              amountPaise,
              eventIds,
              ...(vendorId ? { vendorId } : {}),
              ...(dueDate ? { dueDate } : {}),
              ...(input.notes ? { notes: input.notes } : {}),
              ...(receipts.ids.length > 0 ? { receiptAssetIds: receipts.ids } : {}),
            },
          });
      if (data) {
        onSaved(data.data);
        return;
      }
      const failure = toFailure(response.status, error);
      setErrors(failure.fields);
      if (Object.keys(failure.fields).length === 0) setAlert(failure.message);
      if (STALE.has(failure.code) || 'eventIds' in failure.fields || 'vendorId' in failure.fields) {
        router.refresh();
      }
    } catch {
      setAlert(networkFailure().message);
    }
    setPending(false);
    focusProblem();
  }

  // A link deleted since stays a choice, so saving keeps it.
  // Events deleted since stay as choices while linked, so saving keeps them.
  const eventChoices = [
    ...choices.events.map((event) => ({ id: event.id, label: event.title })),
    ...(expense?.events ?? [])
      .filter((event) => !event.available)
      .map((event) => ({ id: event.id, label: `${event.title} (no longer available)` })),
  ];
  function toggle(id: string, on: boolean) {
    setEventIds((ids) => (on ? [...ids, id] : ids.filter((other) => other !== id)));
  }
  const vendorOptions = [
    { value: '', label: 'No vendor' },
    ...choices.vendors.map((vendor) => ({ value: vendor.id, label: vendor.name })),
    ...(expense?.vendor && !expense.vendor.available
      ? [{ value: expense.vendor.id, label: `${expense.vendor.name} (no longer available)` }]
      : []),
  ];
  const optional = <span className="text-label-sm text-on-surface-variant">Optional</span>;
  const required = <span className="text-label-sm font-medium text-primary">* Required</span>;

  return (
    <form ref={form} noValidate onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 pb-6">
        {alert && (
          <FormAlert
            tone="error"
            title={expense ? 'Unable to save your changes' : 'Unable to add the expense'}
          >
            {alert}
          </FormAlert>
        )}

        <TextField
          id="expense-title"
          name="title"
          label="Expense name"
          labelAside={required}
          placeholder="e.g. Wedding photography package"
          autoComplete="off"
          autoFocus
          required
          maxLength={EXPENSE_INPUT_LIMITS.title}
          defaultValue={expense?.title}
          error={errors.title}
        />
        <SelectField
          id="expense-category"
          name="category"
          label="Category"
          labelAside={required}
          placeholder="Select a category"
          required
          options={[...EXPENSE_CATEGORIES, OTHER]}
          value={choice}
          onChange={(e) => setChoice(e.target.value)}
          error={choice === OTHER ? undefined : errors.category}
        />
        {choice === OTHER && (
          <TextField
            id="expense-custom-category"
            name="customCategory"
            label="Category name (optional)"
            placeholder="e.g. Pandit & puja"
            autoComplete="off"
            maxLength={EXPENSE_INPUT_LIMITS.category}
            defaultValue={isListed(stored) || stored === OTHER ? '' : stored}
            hint="Left empty, it is saved as Other."
            error={errors.category}
          />
        )}
        <FieldFrame
          id="expense-amount"
          label="Agreed amount (₹)"
          labelAside={required}
          hint="The amount in the deal. Record discounts, extras and payments later, from the expense."
          error={errors.amountPaise}
        >
          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-body-md text-on-surface-variant"
            >
              ₹
            </span>
            <input
              id="expense-amount"
              name="amount"
              inputMode="decimal"
              autoComplete="off"
              required
              placeholder="80,000"
              defaultValue={expense ? rupeesInput(expense.amountPaise) : undefined}
              aria-invalid={errors.amountPaise ? true : undefined}
              aria-describedby={`expense-amount-hint${errors.amountPaise ? ' expense-amount-error' : ''}`}
              className={`${inputClass} border-outline-variant pl-8 tabular-nums`}
            />
          </div>
        </FieldFrame>
        <fieldset aria-describedby={errors.eventIds ? 'expense-events-error' : undefined}>
          <legend className="mb-1.5 flex w-full items-baseline justify-between gap-3 text-label-md font-semibold text-on-surface">
            Events
            <span className="text-label-sm font-normal text-on-surface-variant">
              Optional · select all it covers
            </span>
          </legend>
          {eventChoices.length === 0 ? (
            <p className="rounded-lg bg-surface-container-low px-4 py-3 text-body-sm text-on-surface-variant">
              No ceremonies yet. Leave it as a general expense, or add ceremonies on the Events
              page.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {eventChoices.map((event) => {
                const checked = eventIds.includes(event.id);
                return (
                  <label key={event.id} className="cursor-pointer">
                    <input
                      type="checkbox"
                      value={event.id}
                      checked={checked}
                      onChange={(e) => toggle(event.id, e.target.checked)}
                      className="peer sr-only"
                    />
                    <span
                      className={`flex min-h-9 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-label-md font-semibold transition-all peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary-container ${
                        checked
                          ? 'bg-primary text-on-primary shadow-xs'
                          : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      <Icon name={checked ? 'check' : 'add'} className="size-4" />
                      {event.label}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
          <p className="mt-1.5 text-body-sm text-on-surface-variant">
            {eventIds.length === 0
              ? 'None selected: a general expense.'
              : `For ${eventIds.length} ${eventIds.length === 1 ? 'ceremony' : 'ceremonies'}.`}
          </p>
          {errors.eventIds && (
            <p id="expense-events-error" className="mt-1.5 text-body-sm text-error">
              {errors.eventIds}
            </p>
          )}
        </fieldset>
        <SelectField
          id="expense-vendor"
          name="vendorId"
          label="Vendor"
          labelAside={optional}
          options={vendorOptions}
          defaultValue={expense?.vendor?.id ?? ''}
          error={errors.vendorId}
        />
        <TextField
          id="expense-due"
          name="dueDate"
          type="date"
          label="Payment due date"
          labelAside={optional}
          defaultValue={expense?.dueDate}
          error={errors.dueDate}
        />
        <FieldFrame
          id="expense-notes"
          label="Notes"
          labelAside={optional}
          hint="Private to your wedding’s owners and managers."
          error={errors.notes}
        >
          <textarea
            id="expense-notes"
            name="notes"
            rows={3}
            maxLength={EXPENSE_INPUT_LIMITS.notes}
            defaultValue={expense?.notes}
            placeholder="What’s included, deliverables, terms…"
            aria-invalid={errors.notes ? true : undefined}
            aria-describedby={`expense-notes-hint${errors.notes ? ' expense-notes-error' : ''}`}
            className={`${inputClass} border-outline-variant`}
          />
        </FieldFrame>
        {filesKnown ? (
          <ReceiptPicker
            receipts={receipts}
            limit={RECEIPT_LIMITS.perExpense}
            hint="The quote, invoice or contract, or a photo of the bill"
            error={errors.receiptAssetIds}
          />
        ) : (
          <p role="status" className="text-body-sm text-on-surface-variant">
            Loading the expense’s files…
          </p>
        )}
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
          <SubmitButton
            pending={pending || receipts.busy}
            pendingLabel={receipts.busy ? 'Uploading…' : 'Saving…'}
          >
            {expense ? 'Save changes' : 'Save expense'}
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
