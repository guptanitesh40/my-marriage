import type { components } from '@my-marriage/contracts';

export type Expense = components['schemas']['ExpenseDto'];
export type ExpenseDetail = components['schemas']['ExpenseDetailDto'];
export type ExpenseEntry = components['schemas']['ExpenseEntryDto'];
export type ExpenseTotals = components['schemas']['ExpenseTotalsDto'];
export type PaymentMethod = NonNullable<ExpenseEntry['method']>;

/**
 * The categories offered when adding an expense, as in the brief. The API
 * takes any category: "Other" lets people name their own.
 */
export const EXPENSE_CATEGORIES = [
  'Venue',
  'Catering',
  'Photography & Videography',
  'Decoration',
  'Makeup & Mehendi',
  'Music & Entertainment',
  'Clothing & Jewellery',
  'Transportation',
  'Accommodation',
  'Gifts',
] as const;

export const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank transfer',
  card: 'Card',
  cheque: 'Cheque',
  other: 'Other',
};

/** The status shown: overdue wins over partially paid or unpaid. */
export type ShownStatus = Expense['status'] | 'overdue';

export const STATUS_LABELS: Record<ShownStatus, string> = {
  unpaid: 'Unpaid',
  partially_paid: 'Partially paid',
  paid: 'Paid',
  overdue: 'Overdue',
};

export function shownStatus(expense: Pick<Expense, 'status' | 'overdue'>): ShownStatus {
  return expense.overdue ? 'overdue' : expense.status;
}

/** The value of the event and vendor filters for expenses with none. */
export const NONE = 'none';

export const SORTS = {
  due: 'Due date',
  amount: 'Amount (highest)',
  outstanding: 'Outstanding (highest)',
  updated: 'Recently updated',
} as const;
export type ExpenseSort = keyof typeof SORTS;

/** What the list shows, kept in the address so it survives a reload and can be shared. */
export interface ExpenseFilters {
  q: string;
  category: string;
  /** An event ID (expenses for it, among others), `none` for general expenses, or empty for all. */
  eventId: string;
  /** A vendor ID, `none` for expenses with no vendor, or empty for all. */
  vendorId: string;
  status: ShownStatus | '';
  sort: ExpenseSort;
}

export const NO_FILTERS: ExpenseFilters = {
  q: '',
  category: '',
  eventId: '',
  vendorId: '',
  status: '',
  sort: 'due',
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

function idOrNone(value: string): string {
  return value === NONE || /^[a-f0-9]{24}$/i.test(value) ? value : '';
}

/** The filters in an address; anything unexpected is ignored. */
export function readFilters(params: SearchParams): ExpenseFilters {
  const status = first(params.status);
  const sort = first(params.sort);
  return {
    q: first(params.q).slice(0, 100),
    category: first(params.category).slice(0, 60),
    eventId: idOrNone(first(params.eventId)),
    vendorId: idOrNone(first(params.vendorId)),
    status: status in STATUS_LABELS ? (status as ShownStatus) : '',
    sort: sort in SORTS ? (sort as ExpenseSort) : 'due',
  };
}

/** The filters as a query string, leaving out those not set. */
export function filterParams(filters: ExpenseFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set('q', filters.q.trim());
  if (filters.category) params.set('category', filters.category);
  if (filters.eventId) params.set('eventId', filters.eventId);
  if (filters.vendorId) params.set('vendorId', filters.vendorId);
  if (filters.status) params.set('status', filters.status);
  if (filters.sort !== 'due') params.set('sort', filters.sort);
  return params;
}

/** Whether anything narrows the list (sorting does not). */
export function isNarrowed(filters: ExpenseFilters): boolean {
  return Boolean(
    filters.q.trim() || filters.category || filters.eventId || filters.vendorId || filters.status,
  );
}

function linkMatches(filter: string, link: { id: string } | undefined): boolean {
  if (!filter) return true;
  if (filter === NONE) return !link;
  return link?.id === filter;
}

/** Every filter and every word (in the name, category, event, vendor or notes). */
export function matches(expense: Expense, filters: ExpenseFilters): boolean {
  if (filters.category && expense.category !== filters.category) return false;
  if (filters.eventId === NONE && expense.events.length > 0) return false;
  if (
    filters.eventId &&
    filters.eventId !== NONE &&
    !expense.events.some((event) => event.id === filters.eventId)
  ) {
    return false;
  }
  if (!linkMatches(filters.vendorId, expense.vendor)) return false;
  if (filters.status === 'overdue' && !expense.overdue) return false;
  if (filters.status && filters.status !== 'overdue' && expense.status !== filters.status) {
    return false;
  }
  const words = filters.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const text = [
    expense.title,
    expense.category,
    ...expense.events.map((event) => event.title),
    expense.vendor?.name,
    expense.notes,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return words.every((word) => text.includes(word));
}

/** The list in the chosen order; the API's order is by due date. */
export function sortExpenses(expenses: readonly Expense[], sort: ExpenseSort): Expense[] {
  const list = [...expenses];
  if (sort === 'amount') list.sort((a, b) => b.finalPaise - a.finalPaise);
  if (sort === 'outstanding') list.sort((a, b) => b.outstandingPaise - a.outstandingPaise);
  if (sort === 'updated') list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return list;
}

/** The categories in use, A to Z, for the category filter. */
export function categoriesOf(expenses: readonly Expense[]): string[] {
  return [...new Set(expenses.map((expense) => expense.category))].sort((a, b) =>
    a.localeCompare(b, 'en', { sensitivity: 'base' }),
  );
}

/** "10 Feb 2027" for a `YYYY-MM-DD` day, read as that day wherever the viewer is. */
export function dayLabel(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
