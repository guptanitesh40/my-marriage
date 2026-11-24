'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent, type ReactNode, type RefObject } from 'react';
import { FormAlert } from '@/components/forms/form-alert';
import { SelectField } from '@/components/forms/select-field';
import { FieldFrame, inputClass, TextField } from '@/components/forms/text-field';
import { api } from '@/lib/api/browser';
import { networkFailure, toFailure } from '@/lib/api/errors';
import {
  dayLabel,
  METHOD_LABELS,
  type Expense,
  type ExpenseDetail,
  type ExpenseEntry,
  type PaymentMethod,
} from '@/lib/expenses/directory';
import { EXPENSE_INPUT_LIMITS } from '@/lib/expenses/input';
import { amountProblem, formatInr, parseRupees } from '@/lib/expenses/money';
import { RECEIPT_LIMITS } from '@/lib/expenses/files';
import { todayInIndia } from '@/lib/weddings/validation';
import { ReceiptPicker, useReceipts } from './receipts';

/** Failures that mean the page is out of date: it shows the truth after a refresh. */
const STALE = new Set([
  'WEDDING_ARCHIVED',
  'WEDDING_NOT_FOUND',
  'EXPENSE_NOT_FOUND',
  'ENTRY_ALREADY_REVERSED',
]);

type Done = (detail: ExpenseDetail, message: string) => void;

/** The modal shell shared by the ledger dialogs, over the details drawer. */
function LedgerDialog({
  dialog,
  id,
  title,
  description,
  alert,
  alertTitle,
  pending,
  submitLabel,
  pendingLabel,
  danger = false,
  disabled = false,
  onSubmit,
  onClose,
  children,
}: {
  dialog: RefObject<HTMLDialogElement | null>;
  id: string;
  title: string;
  description: ReactNode;
  alert: string | null;
  alertTitle: string;
  pending: boolean;
  submitLabel: string;
  pendingLabel: string;
  danger?: boolean;
  disabled?: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <dialog
      ref={dialog}
      aria-labelledby={`${id}-title`}
      onClose={onClose}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl bg-surface-container-lowest p-0 text-on-surface shadow-xl backdrop:bg-on-surface/50"
    >
      <form noValidate onSubmit={onSubmit} className="flex flex-col">
        <div className="flex flex-col gap-4 p-6">
          <div>
            <h2 id={`${id}-title`} className="font-serif text-headline-sm text-on-surface">
              {title}
            </h2>
            <div className="mt-1 text-body-sm text-on-surface-variant">{description}</div>
          </div>
          {alert && (
            <FormAlert tone="error" title={alertTitle}>
              {alert}
            </FormAlert>
          )}
          {children}
        </div>
        <div className="flex gap-3 border-t border-surface-container-highest bg-surface-container-low px-6 py-4">
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="flex-1 rounded-md bg-surface-container-lowest px-4 py-2.5 text-label-md font-semibold text-on-surface shadow-sm transition-colors hover:bg-surface-container"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending || disabled}
            aria-busy={pending || undefined}
            className={`flex-1 rounded-md px-4 py-2.5 text-label-md font-semibold shadow-sm transition-colors disabled:opacity-60 ${
              danger
                ? 'bg-error text-on-error hover:opacity-90'
                : 'bg-primary text-on-primary hover:bg-primary-container'
            }`}
          >
            {pending ? pendingLabel : submitLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}

/** "₹50,000" in a calm box: the context a dialog acts on. */
function Context({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex items-center justify-between gap-3 rounded-lg bg-secondary-container/40 px-4 py-3 text-body-sm text-on-secondary-container">
      <span>{label}</span>
      <span className="text-title-sm text-on-surface tabular-nums">{value}</span>
    </p>
  );
}

/** A rupee amount input, with its label, hint and error. */
function AmountField({
  id,
  label,
  value,
  onChange,
  hint,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
}) {
  const described = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean);
  return (
    <FieldFrame
      id={id}
      label={label}
      labelAside={<span className="text-label-sm font-medium text-primary">* Required</span>}
      hint={hint}
      error={error}
    >
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-body-md text-on-surface-variant"
        >
          ₹
        </span>
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={described.length > 0 ? described.join(' ') : undefined}
          className={`${inputClass} border-outline-variant pl-8 tabular-nums`}
        />
      </div>
    </FieldFrame>
  );
}

/** Posts a ledger change and handles the answer the same way for every dialog. */
function useLedgerPost(dialog: RefObject<HTMLDialogElement | null>, onDone: Done) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<string | null>(null);

  async function send(
    request: () => Promise<{
      data?: { data: ExpenseDetail };
      error?: Parameters<typeof toFailure>[1];
      response: Response;
    }>,
    message: string,
  ): Promise<boolean> {
    setPending(true);
    setAlert(null);
    try {
      const { data, error, response } = await request();
      if (data) {
        dialog.current?.close();
        setPending(false);
        onDone(data.data, message);
        return true;
      }
      const failure = toFailure(response.status, error);
      setErrors(failure.fields);
      if (Object.keys(failure.fields).length === 0) setAlert(failure.message);
      if (STALE.has(failure.code)) router.refresh();
    } catch {
      setAlert(networkFailure().message);
    }
    setPending(false);
    return false;
  }

  function reset() {
    setErrors({});
    setAlert(null);
  }

  return { pending, errors, setErrors, alert, send, reset };
}

/**
 * Records money already paid outside the app (PRD EXP-02): never more
 * than is outstanding, and dated today or earlier.
 */
export function RecordPaymentDialog({
  dialog,
  weddingId,
  expense,
  onDone,
}: {
  dialog: RefObject<HTMLDialogElement | null>;
  weddingId: string;
  expense: Expense;
  onDone: Done;
}) {
  const today = todayInIndia();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [method, setMethod] = useState<PaymentMethod | ''>('');
  const [note, setNote] = useState('');
  const receipts = useReceipts(weddingId);
  const { pending, errors, setErrors, alert, send, reset } = useLedgerPost(dialog, (detail, m) => {
    setAmount('');
    setNote('');
    setMethod('');
    setDate(todayInIndia());
    receipts.reset();
    onDone(detail, m);
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || receipts.busy) return;
    const paise = parseRupees(amount);
    const problems: Record<string, string> = {};
    const amountError =
      amountProblem(amount) ??
      (paise !== null && paise > expense.outstandingPaise
        ? `Amount can’t be more than the outstanding ${formatInr(expense.outstandingPaise)}.`
        : undefined);
    if (amountError) problems.amountPaise = amountError;
    if (!date) problems.paidAt = 'Choose the day it was paid.';
    else if (date > today) problems.paidAt = 'Choose today or an earlier date.';
    setErrors(problems);
    if (Object.keys(problems).length > 0 || paise === null) return;
    void send(
      () =>
        api.POST('/api/v1/weddings/{weddingId}/expenses/{expenseId}/payments', {
          params: { path: { weddingId, expenseId: expense.id } },
          body: {
            amountPaise: paise,
            paidAt: date,
            ...(method ? { method } : {}),
            ...(note.trim() ? { note: note.trim() } : {}),
            ...(receipts.ids.length > 0 ? { receiptAssetIds: receipts.ids } : {}),
          },
        }),
      `Payment of ${formatInr(paise)} recorded.`,
    );
  }

  return (
    <LedgerDialog
      dialog={dialog}
      id="record-payment"
      title="Record payment"
      description="This records money already paid outside My Marriage. Nothing is sent from here."
      alert={alert}
      alertTitle="Unable to record the payment"
      pending={pending}
      submitLabel={receipts.busy ? 'Uploading…' : 'Record payment'}
      pendingLabel="Recording…"
      disabled={receipts.busy}
      onSubmit={submit}
      onClose={reset}
    >
      <Context label="Outstanding" value={formatInr(expense.outstandingPaise)} />
      <AmountField
        id="payment-amount"
        label="Amount paid (₹)"
        value={amount}
        onChange={setAmount}
        error={errors.amountPaise}
      />
      <TextField
        id="payment-date"
        type="date"
        label="Payment date"
        labelAside={<span className="text-label-sm font-medium text-primary">* Required</span>}
        max={today}
        value={date}
        onChange={(e) => setDate(e.target.value)}
        error={errors.paidAt}
      />
      <SelectField
        id="payment-method"
        label="Payment method"
        labelAside={<span className="text-label-sm text-on-surface-variant">Optional</span>}
        options={[
          { value: '', label: 'Not specified' },
          ...Object.entries(METHOD_LABELS).map(([value, label]) => ({ value, label })),
        ]}
        value={method}
        onChange={(e) => setMethod(e.target.value as PaymentMethod | '')}
        error={errors.method}
      />
      <TextField
        id="payment-note"
        label="Note"
        labelAside={<span className="text-label-sm text-on-surface-variant">Optional</span>}
        placeholder="e.g. Advance, or a cheque number"
        maxLength={EXPENSE_INPUT_LIMITS.note}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        error={errors.note}
      />
      <ReceiptPicker
        receipts={receipts}
        limit={RECEIPT_LIMITS.perEntry}
        label="Receipt or proof of payment"
        hint="A photo of the receipt, a bank slip or a UPI screenshot"
        error={errors.receiptAssetIds}
      />
    </LedgerDialog>
  );
}

type Kind = 'discount' | 'extra';

const KINDS: Record<Kind, { label: string; hint: string }> = {
  discount: { label: 'Discount', hint: 'They agreed to take less' },
  extra: { label: 'Extra', hint: 'Paying more, e.g. a bonus' },
};

/**
 * A change to what is owed, agreed after the deal (decision 0014): a
 * discount the vendor accepted, or an extra such as a bonus for great
 * work. Shows what is owed before and after.
 */
export function AdjustAmountDialog({
  dialog,
  weddingId,
  expense,
  onDone,
}: {
  dialog: RefObject<HTMLDialogElement | null>;
  weddingId: string;
  expense: Expense;
  onDone: Done;
}) {
  const today = todayInIndia();
  const [kind, setKind] = useState<Kind>('discount');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [note, setNote] = useState('');
  const receipts = useReceipts(weddingId);
  const { pending, errors, setErrors, alert, send, reset } = useLedgerPost(dialog, (detail, m) => {
    setAmount('');
    setNote('');
    setDate(todayInIndia());
    receipts.reset();
    onDone(detail, m);
  });
  const paise = parseRupees(amount);
  const after =
    paise !== null && paise > 0
      ? expense.finalPaise + (kind === 'discount' ? -paise : paise)
      : undefined;

  function percent(value: number) {
    // Whole rupees of the agreed amount.
    setAmount(String(Math.floor((expense.amountPaise * value) / 100 / 100)));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || receipts.busy) return;
    const problems: Record<string, string> = {};
    const amountError =
      amountProblem(amount) ??
      (kind === 'discount' && paise !== null && paise > expense.outstandingPaise
        ? expense.outstandingPaise === 0
          ? 'Everything has been paid, so there is nothing left to discount.'
          : `A discount can’t be more than the ${formatInr(expense.outstandingPaise)} still to pay.`
        : undefined);
    if (amountError) problems.amountPaise = amountError;
    if (!date) problems.date = 'Choose the day it was agreed.';
    else if (date > today) problems.date = 'Choose today or an earlier date.';
    setErrors(problems);
    if (Object.keys(problems).length > 0 || paise === null) return;
    void send(
      () =>
        api.POST('/api/v1/weddings/{weddingId}/expenses/{expenseId}/adjustments', {
          params: { path: { weddingId, expenseId: expense.id } },
          body: {
            kind,
            amountPaise: paise,
            date,
            ...(note.trim() ? { note: note.trim() } : {}),
            ...(receipts.ids.length > 0 ? { receiptAssetIds: receipts.ids } : {}),
          },
        }),
      kind === 'discount'
        ? `Discount of ${formatInr(paise)} recorded.`
        : `Extra of ${formatInr(paise)} recorded.`,
    );
  }

  return (
    <LedgerDialog
      dialog={dialog}
      id="adjust-amount"
      title="Discount or extra"
      description="Record a change to what’s owed, agreed after the deal. The agreed amount and the history stay as they are."
      alert={alert}
      alertTitle="Unable to record the change"
      pending={pending}
      submitLabel={
        receipts.busy ? 'Uploading…' : kind === 'discount' ? 'Record discount' : 'Record extra'
      }
      pendingLabel="Recording…"
      disabled={receipts.busy}
      onSubmit={submit}
      onClose={reset}
    >
      <fieldset>
        <legend className="mb-1.5 text-label-md font-semibold text-on-surface">What changed</legend>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-surface-container-low p-1">
          {(Object.keys(KINDS) as Kind[]).map((option) => (
            <label key={option} className="cursor-pointer">
              <input
                type="radio"
                name="adjust-kind"
                value={option}
                checked={kind === option}
                onChange={() => setKind(option)}
                className="peer sr-only"
              />
              <span className="flex h-full flex-col rounded-md px-3 py-2 text-on-surface-variant transition-colors peer-checked:bg-surface-container-lowest peer-checked:text-primary peer-checked:shadow-sm peer-focus-visible:outline-2 peer-focus-visible:outline-primary-container hover:text-on-surface">
                <span className="text-label-md font-semibold">{KINDS[option].label}</span>
                <span className="text-label-sm">{KINDS[option].hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <AmountField
        id="adjust-amount-value"
        label={kind === 'discount' ? 'Discount (₹)' : 'Extra (₹)'}
        value={amount}
        onChange={setAmount}
        error={errors.amountPaise}
      />
      <div className="-mt-2 flex flex-wrap items-center gap-2">
        <span className="text-label-sm text-on-surface-variant">
          Of the agreed {formatInr(expense.amountPaise)}:
        </span>
        {[5, 10].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => percent(value)}
            className="rounded-full bg-surface-container px-3 py-1 text-label-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
          >
            {value}%
          </button>
        ))}
      </div>
      {after !== undefined && (
        <p
          aria-live="polite"
          className="rounded-lg bg-surface-container-low px-4 py-3 text-body-sm text-on-surface"
        >
          What’s owed: {formatInr(expense.finalPaise)} →{' '}
          <span className="font-semibold tabular-nums">{formatInr(Math.max(0, after))}</span>
        </p>
      )}
      <TextField
        id="adjust-date"
        type="date"
        label="Agreed on"
        labelAside={<span className="text-label-sm font-medium text-primary">* Required</span>}
        max={today}
        value={date}
        onChange={(e) => setDate(e.target.value)}
        error={errors.date}
      />
      <TextField
        id="adjust-note"
        label="Note"
        labelAside={<span className="text-label-sm text-on-surface-variant">Optional</span>}
        placeholder={
          kind === 'discount' ? 'e.g. Agreed 10% off the final quote' : 'e.g. Bonus for the album'
        }
        maxLength={EXPENSE_INPUT_LIMITS.note}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        error={errors.note}
      />
      <ReceiptPicker
        receipts={receipts}
        limit={RECEIPT_LIMITS.perEntry}
        label="Revised quote or agreement"
        hint="The new quote, an invoice or a message confirming it"
        error={errors.receiptAssetIds}
      />
    </LedgerDialog>
  );
}

/** How an entry is named in the history and in the reversal dialog. */
export function entryName(entry: Pick<ExpenseEntry, 'type' | 'method'>): string {
  if (entry.type === 'payment') {
    return entry.method ? `Payment · ${METHOD_LABELS[entry.method]}` : 'Payment';
  }
  if (entry.type === 'discount') return 'Discount agreed';
  if (entry.type === 'extra') return 'Extra agreed';
  return 'Reversal';
}

/**
 * Undoes one payment, discount or extra by a compensating entry; both stay
 * in the history. Shows its effect on the totals before it is confirmed.
 */
export function ReverseEntryDialog({
  dialog,
  weddingId,
  expense,
  entry,
  onDone,
}: {
  dialog: RefObject<HTMLDialogElement | null>;
  weddingId: string;
  expense: Expense;
  entry: ExpenseEntry | null;
  onDone: Done;
}) {
  const [note, setNote] = useState('');
  const receipts = useReceipts(weddingId);
  const { pending, errors, alert, send, reset } = useLedgerPost(dialog, (detail, m) => {
    setNote('');
    receipts.reset();
    onDone(detail, m);
  });
  const amount = entry?.amountPaise ?? 0;
  const effect =
    entry?.type === 'payment'
      ? `Paid goes from ${formatInr(expense.paidPaise)} to ${formatInr(expense.paidPaise - amount)}; outstanding from ${formatInr(expense.outstandingPaise)} to ${formatInr(expense.outstandingPaise + amount)}.`
      : entry?.type === 'discount'
        ? `What’s owed goes back from ${formatInr(expense.finalPaise)} to ${formatInr(expense.finalPaise + amount)}.`
        : `What’s owed goes from ${formatInr(expense.finalPaise)} to ${formatInr(expense.finalPaise - amount)}.`;
  const blocked = entry?.type === 'extra' && expense.finalPaise - amount < expense.paidPaise;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !entry || blocked || receipts.busy) return;
    void send(
      () =>
        api.POST('/api/v1/weddings/{weddingId}/expenses/{expenseId}/payments/reverse', {
          params: { path: { weddingId, expenseId: expense.id } },
          body: {
            entryId: entry.id,
            ...(note.trim() ? { note: note.trim() } : {}),
            ...(receipts.ids.length > 0 ? { receiptAssetIds: receipts.ids } : {}),
          },
        }),
      `${entryName(entry)} of ${formatInr(amount)} reversed.`,
    );
  }

  return (
    <LedgerDialog
      dialog={dialog}
      id="reverse-entry"
      title="Reverse this entry?"
      description={
        entry ? `${entryName(entry)} · ${formatInr(amount)} · ${dayLabel(entry.date)}` : undefined
      }
      alert={alert}
      alertTitle="Unable to reverse it"
      pending={pending}
      submitLabel={receipts.busy ? 'Uploading…' : 'Reverse'}
      pendingLabel="Reversing…"
      danger
      disabled={blocked || receipts.busy}
      onSubmit={submit}
      onClose={() => {
        setNote('');
        reset();
      }}
    >
      <div className="rounded-lg bg-secondary-container/40 px-4 py-3 text-body-sm text-on-secondary-container">
        <p className="font-semibold text-on-surface">{effect}</p>
        <p className="mt-1">
          The original entry stays in the history, with a reversal entry next to it.
        </p>
      </div>
      {blocked && (
        <p className="text-body-sm text-error">
          This extra has already been paid. Reverse a payment first, so what’s owed doesn’t drop
          below what’s been paid.
        </p>
      )}
      <TextField
        id="reverse-note"
        label="Reason"
        labelAside={<span className="text-label-sm text-on-surface-variant">Optional</span>}
        placeholder="e.g. Entered twice"
        maxLength={EXPENSE_INPUT_LIMITS.note}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        error={errors.note}
      />
      <ReceiptPicker
        receipts={receipts}
        limit={RECEIPT_LIMITS.perEntry}
        label="Proof of refund or correction"
        hint="A refund receipt or a message from the vendor"
        error={errors.receiptAssetIds}
      />
    </LedgerDialog>
  );
}
