import 'server-only';
import { FormAlert } from '@/components/forms/form-alert';
import { ButtonLink } from '@/components/ui/button-link';
import { Icon, type IconName } from '@/components/ui/icon';
import { getEvents } from '@/lib/events/events';
import { filterParams, readFilters, type ExpenseTotals } from '@/lib/expenses/directory';
import { getExpenses } from '@/lib/expenses/expenses';
import { formatInr, share } from '@/lib/expenses/money';
import { expensesPath } from '@/lib/routes';
import { getVendors } from '@/lib/vendors/vendors';
import { getWedding } from '@/lib/weddings/workspace';
import { ExpenseDirectory } from './expense-directory';
import { AddExpenseButton, ExpenseDrawer } from './expense-drawer';
import type { ExpenseChoices } from './expense-form';

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * The Expenses page (Stitch "Expenses Management"): totals from the real
 * ledger, then the expenses with search and filters, or a first-expense
 * prompt. Adding, editing and recording only while the wedding is active.
 * The layout has already answered "not found" for anyone not a member.
 */
export async function ExpensesSection({
  params,
  searchParams,
}: {
  params: Promise<{ weddingId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { weddingId } = await params;
  const filters = readFilters(await searchParams);
  const [wedding, expenses, events, vendors] = await Promise.all([
    getWedding(weddingId),
    getExpenses(weddingId),
    getEvents(weddingId),
    getVendors(weddingId),
  ]);
  if (wedding.kind !== 'ok') return null;
  const writable = wedding.wedding.status === 'active';
  const choices: ExpenseChoices = {
    events: events.kind === 'ok' ? events.events.map(({ id, title }) => ({ id, title })) : [],
    vendors: vendors.kind === 'ok' ? vendors.vendors.map(({ id, name }) => ({ id, name })) : [],
  };
  const hasExpenses = expenses.kind === 'ok' && expenses.expenses.length > 0;

  const page = (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex max-w-2xl flex-col gap-2">
          <p className="flex items-center gap-2 text-label-sm font-semibold tracking-widest text-secondary uppercase">
            <span className="size-1.5 rounded-full bg-secondary" aria-hidden="true" />
            Wedding finances
          </p>
          <h1 className="font-serif text-headline-lg-mobile tracking-tight text-on-surface sm:text-headline-lg">
            Expenses
          </h1>
          <p className="text-body-lg text-on-surface-variant">
            Track wedding costs, payments, and what’s still due.
          </p>
        </div>
        {hasExpenses && <AddExpenseButton>Add expense</AddExpenseButton>}
      </header>

      {!writable && (
        <FormAlert tone="error" title="This wedding is read-only">
          It has been archived, so its expenses and payments can be viewed but not changed.
        </FormAlert>
      )}

      {expenses.kind === 'unavailable' ? (
        <section className="rounded-2xl bg-surface-container-lowest p-8 shadow-sm">
          <h2 className="text-title-md text-on-surface">We couldn’t load your expenses</h2>
          <p className="mt-2 text-body-md text-on-surface-variant">
            Something went wrong on our side. Your records are safe; please try again in a moment.
          </p>
          <ButtonLink
            href={expensesPath(weddingId, filterParams(filters))}
            size="md"
            className="mt-5"
          >
            Retry
          </ButtonLink>
        </section>
      ) : !hasExpenses ? (
        <ExpensesEmpty writable={writable} />
      ) : (
        <>
          <ExpenseStats totals={expenses.totals} />
          <ExpenseDirectory
            weddingId={weddingId}
            expenses={expenses.expenses}
            truncated={expenses.truncated}
            choices={choices}
            initialFilters={filters}
          />
        </>
      )}

      <aside className="flex items-start gap-3 rounded-2xl bg-surface-container-low p-4 text-body-sm text-on-surface-variant">
        <Icon name="lock" className="mt-0.5 size-5 shrink-0 text-secondary" />
        <p>
          <span className="font-semibold text-on-surface">Private to your planning team.</span>{' '}
          Expenses and payments are visible only to this wedding’s owners and managers, and never
          appear on your public wedding website. Payments here are records only; no money moves
          through My Marriage.
        </p>
      </aside>
    </div>
  );

  return (
    <ExpenseDrawer
      weddingId={weddingId}
      expenses={expenses.kind === 'ok' ? expenses.expenses : []}
      choices={choices}
      writable={writable}
      canDelete={writable && wedding.wedding.role === 'owner'}
    >
      {page}
    </ExpenseDrawer>
  );
}

function Stat({
  label,
  value,
  note,
  icon,
  tone = 'text-on-surface',
  children,
}: {
  label: string;
  value: number;
  note: string;
  icon: IconName;
  tone?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-xl bg-surface-container-lowest p-4 shadow-xs">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-label-md text-on-surface-variant">{label}</h2>
        <Icon name={icon} className="size-5 shrink-0 text-secondary" />
      </div>
      <p
        className={`mt-3 font-serif text-title-md wrap-anywhere tabular-nums sm:text-headline-md ${tone}`}
      >
        {formatInr(value)}
      </p>
      <p className="mt-1 text-body-sm text-on-surface-variant">{note}</p>
      {children}
    </div>
  );
}

/**
 * The wedding's real totals: owed (after discounts and extras), paid,
 * outstanding, and what negotiation saved. Never a budget or a forecast.
 */
function ExpenseStats({ totals }: { totals: ExpenseTotals }) {
  return (
    <section aria-label="Expense totals" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <Stat
        label="Total recorded"
        value={totals.finalPaise}
        note={`Across ${totals.count} ${totals.count === 1 ? 'expense' : 'expenses'}`}
        icon="receipt-long"
      />
      <Stat
        label="Total paid"
        value={totals.paidPaise}
        note={`${share(totals.paidPaise, totals.finalPaise)}% of recorded`}
        icon="check-circle"
        tone="text-primary"
      >
        <span
          aria-hidden="true"
          className="mt-2 block h-1 overflow-hidden rounded-full bg-surface-container-high"
        >
          <span
            className="block h-full rounded-full bg-primary"
            style={{ width: `${share(totals.paidPaise, totals.finalPaise)}%` }}
          />
        </span>
      </Stat>
      <Stat
        label="Outstanding"
        value={totals.outstandingPaise}
        note={
          totals.overdue > 0
            ? `${totals.overdue} ${totals.overdue === 1 ? 'expense' : 'expenses'} overdue`
            : 'Nothing overdue'
        }
        icon="schedule"
        tone={totals.overdue > 0 ? 'text-error' : 'text-secondary'}
      />
      <Stat
        label="Saved by negotiation"
        value={totals.discountPaise}
        note={
          totals.extraPaise > 0
            ? `${formatInr(totals.extraPaise)} paid in extras`
            : 'From discounts agreed after the deal'
        }
        icon="savings"
        tone="text-primary"
      />
    </section>
  );
}

/** A new ledger: no expenses yet (Stitch "Expenses Management", empty state). */
function ExpensesEmpty({ writable }: { writable: boolean }) {
  return (
    <section className="flex flex-col items-center rounded-2xl bg-surface-container-lowest px-6 py-14 text-center shadow-xs">
      <span
        className="mb-5 flex size-16 items-center justify-center rounded-full bg-surface-container text-primary"
        aria-hidden="true"
      >
        <Icon name="receipt-long" className="size-8" />
      </span>
      <h2 className="font-serif text-headline-md text-on-surface">
        Start tracking your wedding expenses
      </h2>
      <p className="mt-2 mb-6 max-w-md text-body-md text-on-surface-variant">
        Keep all your wedding costs and payments organized in one place. Add an expense now and
        record payments as they happen.
      </p>
      {writable ? (
        <>
          <AddExpenseButton>Add your first expense</AddExpenseButton>
          <p className="mt-3 text-body-sm text-on-surface-variant">
            You can link expenses to an event or vendor later.
          </p>
        </>
      ) : (
        <p className="text-body-sm text-on-surface-variant">No expenses were recorded.</p>
      )}
    </section>
  );
}

/** While the expenses load: placeholder tiles and rows, announced once. */
export function ExpensesLoading() {
  return (
    <div className="flex flex-col gap-6">
      <p role="status" className="sr-only">
        Loading expenses…
      </p>
      <div aria-hidden="true" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl bg-surface-container-lowest shadow-xs"
          />
        ))}
      </div>
      <div
        aria-hidden="true"
        className="flex flex-col gap-px overflow-hidden rounded-2xl bg-surface-container-high shadow-xs"
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 animate-pulse bg-surface-container-lowest" />
        ))}
      </div>
    </div>
  );
}
