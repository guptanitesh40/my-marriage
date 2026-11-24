'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon, type IconName } from '@/components/ui/icon';
import { api } from '@/lib/api/browser';
import {
  dayLabel,
  type Expense,
  type ExpenseDetail,
  type ExpenseEntry,
} from '@/lib/expenses/directory';
import { RECEIPT_LIMITS, type ExpenseFile } from '@/lib/expenses/files';
import { formatInr, share } from '@/lib/expenses/money';
import { toFailure, networkFailure } from '@/lib/api/errors';
import { DeleteExpenseDialog } from './expense-delete';
import { StatusPill } from './expense-status';
import { ReceiptList, ReceiptPicker, useReceipts } from './receipts';
import {
  AdjustAmountDialog,
  entryName,
  RecordPaymentDialog,
  ReverseEntryDialog,
} from './ledger-dialogs';

const sectionLabel = 'text-label-sm font-semibold tracking-wider text-on-surface-variant uppercase';

const ENTRY_ICONS: Record<ExpenseEntry['type'], IconName> = {
  payment: 'payments',
  discount: 'sell',
  extra: 'volunteer-activism',
  reversal: 'undo',
};

/** How an entry moves the money, signed as the person reads it. */
function entryAmount(entry: ExpenseEntry): string {
  if (entry.type === 'discount') return `−${formatInr(entry.amountPaise)}`;
  if (entry.type === 'extra') return `+${formatInr(entry.amountPaise)}`;
  return formatInr(entry.amountPaise);
}

function entryCaption(entry: ExpenseEntry): string | undefined {
  if (entry.type === 'discount') return 'off what’s owed';
  if (entry.type === 'extra') return 'added to what’s owed';
  return undefined;
}

/** A linked event or vendor, or what it was if it has since been deleted (PRD EXP-05). */
function LinkChip({ icon, label, gone }: { icon: IconName; label: string; gone?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-2.5 py-1 text-label-md text-on-surface">
      <Icon name={icon} className="size-4 text-secondary" />
      {label}
      {gone && <span className="text-on-surface-variant">· no longer available</span>}
    </span>
  );
}

/**
 * An expense's details (Stitch "Expenses Management", details): what is
 * owed, paid and outstanding, how discounts and extras changed the deal,
 * and its whole history, newest first. Recording and reversing happen in
 * dialogs over it; nothing here is edited in place.
 */
export function ExpenseDetails({
  weddingId,
  expense: listed,
  writable,
  onClose,
  onEdit,
  onChanged,
  onDeleted,
}: {
  weddingId: string;
  /** The expense as listed, shown until its history arrives. */
  expense: Expense;
  writable: boolean;
  onClose: () => void;
  onEdit: () => void;
  /** After a payment, discount, extra or reversal: what to announce. */
  onChanged: (message: string) => void;
  /** Offers Delete, to owners of an active wedding only; the API decides in the end. */
  onDeleted?: () => void;
}) {
  const [detail, setDetail] = useState<ExpenseDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [reversing, setReversing] = useState<ExpenseEntry | null>(null);
  const paymentDialog = useRef<HTMLDialogElement>(null);
  const adjustDialog = useRef<HTMLDialogElement>(null);
  const reverseDialog = useRef<HTMLDialogElement>(null);
  const deleteDialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let live = true;
    api
      .GET('/api/v1/weddings/{weddingId}/expenses/{expenseId}', {
        params: { path: { weddingId, expenseId: listed.id } },
      })
      .then(({ data }) => {
        if (!live) return;
        if (data) setDetail(data.data);
        else setFailed(true);
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [weddingId, listed.id, attempt]);

  const expense = detail?.expense ?? listed;
  const entries = detail?.entries;
  const byId = new Map(entries?.map((entry) => [entry.id, entry]));
  const adjusted = expense.discountPaise > 0 || expense.extraPaise > 0;

  function changed(next: ExpenseDetail, message: string) {
    setDetail(next);
    onChanged(message);
  }

  function reverse(entry: ExpenseEntry) {
    setReversing(entry);
    reverseDialog.current?.showModal();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 pb-6">
        <div className="flex flex-wrap gap-2">
          {expense.events.length === 0 ? (
            <LinkChip icon="calendar-month" label="General" />
          ) : (
            expense.events.map((event) => (
              <LinkChip
                key={event.id}
                icon="calendar-month"
                label={event.title}
                gone={!event.available}
              />
            ))
          )}
          <LinkChip
            icon="storefront"
            label={expense.vendor?.name ?? 'No vendor'}
            gone={expense.vendor ? !expense.vendor.available : false}
          />
        </div>

        <section aria-label="Amounts" className="rounded-xl bg-surface-container-low p-4">
          <dl className="grid grid-cols-3 gap-3 text-center">
            {[
              ['Owed', expense.finalPaise, 'text-on-surface'],
              ['Paid', expense.paidPaise, 'text-primary'],
              [
                'Outstanding',
                expense.outstandingPaise,
                expense.overdue ? 'text-error' : 'text-secondary',
              ],
            ].map(([label, value, tone]) => (
              <div key={label as string} className="flex flex-col">
                <dt className="text-label-sm tracking-wider text-on-surface-variant uppercase">
                  {label}
                </dt>
                <dd className={`mt-1 text-title-md tabular-nums ${tone as string}`}>
                  {formatInr(value as number)}
                </dd>
              </div>
            ))}
          </dl>
          <span
            aria-hidden="true"
            className="mt-4 block h-1.5 overflow-hidden rounded-full bg-surface-container-high"
          >
            <span
              className="block h-full rounded-full bg-primary"
              style={{ width: `${share(expense.paidPaise, expense.finalPaise)}%` }}
            />
          </span>
          {adjusted && (
            <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-body-sm text-on-surface-variant">
              <span>Agreed {formatInr(expense.amountPaise)}</span>
              {expense.discountPaise > 0 && (
                <span className="text-primary">Discounts −{formatInr(expense.discountPaise)}</span>
              )}
              {expense.extraPaise > 0 && (
                <span className="text-secondary">Extras +{formatInr(expense.extraPaise)}</span>
              )}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-surface-container-high pt-3 text-body-sm">
            <StatusPill expense={expense} />
            <span className="text-on-surface-variant">
              {expense.dueDate ? `Due ${dayLabel(expense.dueDate)}` : 'No due date'}
            </span>
          </div>
        </section>

        {writable && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={expense.outstandingPaise === 0}
                onClick={() => paymentDialog.current?.showModal()}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2.5 text-label-md font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon name="add" className="size-4.5" />
                Record payment
              </button>
              <button
                type="button"
                onClick={() => adjustDialog.current?.showModal()}
                className="inline-flex items-center gap-1.5 rounded-md bg-surface-container px-4 py-2.5 text-label-md font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
              >
                <Icon name="sell" className="size-4.5" />
                Discount or extra
              </button>
            </div>
            {expense.outstandingPaise === 0 && (
              <p className="text-body-sm text-on-surface-variant">
                Paid in full: nothing left to pay. To pay more, record an extra first.
              </p>
            )}
          </div>
        )}

        <section aria-labelledby="expense-files-heading" className="flex flex-col gap-2">
          <h3 id="expense-files-heading" className={sectionLabel}>
            Receipts & documents
          </h3>
          {detail ? (
            detail.receipts.length > 0 ? (
              <ReceiptList files={detail.receipts} />
            ) : (
              !writable && (
                <p className="rounded-lg bg-surface-container-low px-4 py-3 text-body-sm text-on-surface-variant">
                  No files kept with this expense.
                </p>
              )
            )
          ) : (
            expense.receiptCount > 0 && (
              <p role="status" className="text-body-sm text-on-surface-variant">
                Loading {expense.receiptCount === 1 ? 'the file' : 'the files'}…
              </p>
            )
          )}
          {writable && detail && (
            <AddFiles
              weddingId={weddingId}
              expenseId={expense.id}
              kept={detail.receipts}
              onAdded={(count) => {
                setAttempt((n) => n + 1);
                onChanged(count === 1 ? 'File added.' : `${count} files added.`);
              }}
            />
          )}
        </section>

        {expense.notes && (
          <section aria-labelledby="expense-notes-heading">
            <h3 id="expense-notes-heading" className={sectionLabel}>
              Private notes
            </h3>
            <p className="mt-2 rounded-xl bg-surface-container-low p-4 text-body-md whitespace-pre-line wrap-break-word text-on-surface">
              {expense.notes}
            </p>
          </section>
        )}

        <section aria-labelledby="expense-history-heading">
          <h3 id="expense-history-heading" className={sectionLabel}>
            Payment history
          </h3>
          {failed && !entries ? (
            <div className="mt-2 rounded-lg bg-surface-container-low px-4 py-3 text-body-sm text-on-surface-variant">
              We couldn’t load the history.{' '}
              <button
                type="button"
                onClick={() => {
                  setFailed(false);
                  setAttempt((n) => n + 1);
                }}
                className="font-semibold text-primary underline"
              >
                Try again
              </button>
            </div>
          ) : !entries ? (
            <p role="status" className="mt-2 text-body-sm text-on-surface-variant">
              Loading the history…
            </p>
          ) : entries.length === 0 ? (
            <p className="mt-2 rounded-lg bg-surface-container-low px-4 py-3 text-body-sm text-on-surface-variant">
              No payments recorded yet.
            </p>
          ) : (
            <ol className="mt-2 flex flex-col gap-2">
              {entries.map((entry) => {
                const original = entry.reversalOfId ? byId.get(entry.reversalOfId) : undefined;
                const caption = entryCaption(entry);
                return (
                  <li
                    key={entry.id}
                    className={`rounded-lg px-4 py-3 ${
                      entry.type === 'reversal'
                        ? 'border border-dashed border-outline-variant bg-surface-container-lowest'
                        : 'bg-surface-container-low'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-2.5">
                        <Icon
                          name={ENTRY_ICONS[entry.type]}
                          className="mt-0.5 size-4.5 shrink-0 text-on-surface-variant"
                        />
                        <div className="min-w-0">
                          <p className="text-title-sm text-on-surface">
                            {entry.type === 'reversal' && original
                              ? `Reversed: ${entryName(original).toLowerCase()} of ${dayLabel(original.date)}`
                              : entryName(entry)}
                            {entry.reversed && (
                              <span className="ml-2 rounded-full bg-surface-container-highest px-2 py-0.5 text-label-sm text-on-surface-variant">
                                Reversed
                              </span>
                            )}
                          </p>
                          <p className="text-body-sm text-on-surface-variant">
                            {dayLabel(entry.date)} · Recorded by{' '}
                            {entry.recordedBy.displayName ?? 'a former member'}
                          </p>
                          {entry.note && (
                            <p className="mt-1 text-body-sm wrap-break-word text-on-surface italic">
                              “{entry.note}”
                            </p>
                          )}
                          <ReceiptList files={entry.receipts} compact />
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end">
                        <span
                          className={`text-title-sm tabular-nums ${
                            entry.reversed
                              ? 'text-on-surface-variant line-through'
                              : 'text-on-surface'
                          }`}
                        >
                          {entryAmount(entry)}
                        </span>
                        {caption && (
                          <span className="text-label-sm text-on-surface-variant">{caption}</span>
                        )}
                        {writable && entry.type !== 'reversal' && !entry.reversed && (
                          <button
                            type="button"
                            onClick={() => reverse(entry)}
                            className="mt-1 rounded px-1 text-label-sm font-semibold text-on-surface-variant underline transition-colors hover:text-error"
                          >
                            Reverse
                            <span className="sr-only">
                              {' '}
                              {entryName(entry).toLowerCase()} of {formatInr(entry.amountPaise)}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>

      <div className="flex gap-3 border-t border-surface-container-highest bg-surface-container-low px-6 py-4">
        {onDeleted && (
          <button
            type="button"
            onClick={() => deleteDialog.current?.showModal()}
            className="flex items-center gap-1.5 rounded-md px-3 py-3 text-label-md font-semibold text-error transition-colors hover:bg-error-container hover:text-on-error-container"
          >
            <Icon name="delete" className="size-4.5" />
            Delete
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-md bg-surface-container-lowest px-4 py-3 text-label-md font-semibold text-on-surface shadow-sm transition-colors hover:bg-surface-container"
        >
          Close
        </button>
        {writable && (
          <button
            type="button"
            onClick={onEdit}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-label-md font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container"
          >
            <Icon name="edit" className="size-4" />
            Edit expense
          </button>
        )}
      </div>

      {onDeleted && (
        <DeleteExpenseDialog
          dialog={deleteDialog}
          weddingId={weddingId}
          expense={expense}
          onDeleted={onDeleted}
        />
      )}
      {writable && (
        <>
          <RecordPaymentDialog
            dialog={paymentDialog}
            weddingId={weddingId}
            expense={expense}
            onDone={changed}
          />
          <AdjustAmountDialog
            dialog={adjustDialog}
            weddingId={weddingId}
            expense={expense}
            onDone={changed}
          />
          <ReverseEntryDialog
            dialog={reverseDialog}
            weddingId={weddingId}
            expense={expense}
            entry={reversing}
            onDone={changed}
          />
        </>
      )}
    </div>
  );
}

/**
 * Attaches more files to an expense from its details, without opening the
 * edit form: upload, then "Attach". Removing a file is done in the form.
 */
function AddFiles({
  weddingId,
  expenseId,
  kept,
  onAdded,
}: {
  weddingId: string;
  expenseId: string;
  kept: readonly ExpenseFile[];
  onAdded: (count: number) => void;
}) {
  const receipts = useReceipts(weddingId);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const room = RECEIPT_LIMITS.perExpense - kept.length;
  if (room <= 0) {
    return (
      <p className="text-body-sm text-on-surface-variant">
        This expense keeps the most files it can ({RECEIPT_LIMITS.perExpense}). Edit it to remove
        one.
      </p>
    );
  }

  async function attach() {
    if (saving || receipts.busy || receipts.ids.length === 0) return;
    setSaving(true);
    setProblem(null);
    try {
      const { data, error, response } = await api.PATCH(
        '/api/v1/weddings/{weddingId}/expenses/{expenseId}',
        {
          params: { path: { weddingId, expenseId } },
          body: { receiptAssetIds: [...kept.map((file) => file.id), ...receipts.ids] },
        },
      );
      if (data) {
        const count = receipts.ids.length;
        receipts.reset();
        onAdded(count);
      } else {
        const failure = toFailure(response.status, error);
        setProblem(failure.fields.receiptAssetIds ?? failure.message);
      }
    } catch {
      setProblem(networkFailure().message);
    }
    setSaving(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <ReceiptPicker
        receipts={receipts}
        limit={room}
        label={kept.length > 0 ? 'Add more files' : 'Add a file'}
        hint="The quote, invoice or contract, or a photo of the bill"
        error={problem ?? undefined}
      />
      {receipts.ids.length > 0 && (
        <button
          type="button"
          onClick={() => void attach()}
          disabled={saving || receipts.busy}
          aria-busy={saving || undefined}
          className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-md bg-primary px-4 py-2.5 text-label-md font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container disabled:opacity-60"
        >
          <Icon name="attach-file" className="size-4.5" />
          {saving
            ? 'Attaching…'
            : receipts.ids.length === 1
              ? 'Attach file'
              : `Attach ${receipts.ids.length} files`}
        </button>
      )}
    </div>
  );
}
