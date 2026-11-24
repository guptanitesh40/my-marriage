import { describe, expect, it } from 'vitest';
import {
  categoriesOf,
  filterParams,
  isNarrowed,
  matches,
  NO_FILTERS,
  readFilters,
  shownStatus,
  sortExpenses,
  type Expense,
} from './directory';

const HALDI = '6740a1b2c3d4e5f601230001';
const BLOOM = '6740a1b2c3d4e5f601239001';

function expense(fields: Partial<Expense> & Pick<Expense, 'id' | 'title'>): Expense {
  return {
    category: 'Decoration',
    events: [],
    amountPaise: 100000,
    discountPaise: 0,
    extraPaise: 0,
    finalPaise: 100000,
    paidPaise: 0,
    outstandingPaise: 100000,
    status: 'unpaid',
    overdue: false,
    receiptCount: 0,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    ...fields,
  };
}

const haldi = expense({
  id: 'a',
  title: 'Haldi decoration',
  events: [
    { id: HALDI, title: 'Haldi', available: true },
    { id: '6740a1b2c3d4e5f601230002', title: 'Mehendi', available: true },
  ],
  vendor: { id: BLOOM, name: 'Royal Bloom', available: true },
  finalPaise: 4500000,
  paidPaise: 4500000,
  outstandingPaise: 0,
  status: 'paid',
  updatedAt: '2026-11-03T00:00:00.000Z',
});
const catering = expense({
  id: 'b',
  title: 'Wedding catering',
  category: 'Catering',
  finalPaise: 15000000,
  paidPaise: 5000000,
  outstandingPaise: 10000000,
  status: 'partially_paid',
  overdue: true,
  notes: 'Litti chokha counter',
});
const mehendi = expense({ id: 'c', title: 'Mehendi artist', finalPaise: 2000000 });

describe('expense filters', () => {
  it('reads and writes the address, ignoring what it does not know', () => {
    const filters = readFilters({
      q: 'litti',
      category: 'Catering',
      eventId: 'none',
      vendorId: BLOOM,
      status: 'overdue',
      sort: 'amount',
    });
    expect(filters).toEqual({
      q: 'litti',
      category: 'Catering',
      eventId: 'none',
      vendorId: BLOOM,
      status: 'overdue',
      sort: 'amount',
    });
    expect(filterParams(filters).toString()).toBe(
      `q=litti&category=Catering&eventId=none&vendorId=${BLOOM}&status=overdue&sort=amount`,
    );
    expect(readFilters({ status: 'late', sort: 'x', eventId: 'haldi' })).toEqual(NO_FILTERS);
    expect(isNarrowed({ ...NO_FILTERS, sort: 'amount' })).toBe(false);
  });

  it('narrows by status, event, vendor, category and words', () => {
    const all = [haldi, catering, mehendi];
    const ids = (f: Partial<typeof NO_FILTERS>) =>
      all.filter((e) => matches(e, { ...NO_FILTERS, ...f })).map((e) => e.id);
    expect(ids({ status: 'overdue' })).toEqual(['b']);
    expect(ids({ status: 'paid' })).toEqual(['a']);
    expect(ids({ status: 'unpaid' })).toEqual(['c']);
    expect(ids({ eventId: HALDI })).toEqual(['a']);
    expect(ids({ eventId: 'none' })).toEqual(['b', 'c']);
    expect(ids({ vendorId: 'none' })).toEqual(['b', 'c']);
    expect(ids({ category: 'Catering' })).toEqual(['b']);
    expect(ids({ q: 'royal bloom' })).toEqual(['a']);
    expect(ids({ q: 'LITTI' })).toEqual(['b']);
  });

  it('sorts by amount, outstanding or last change', () => {
    const all = [haldi, catering, mehendi];
    expect(sortExpenses(all, 'amount').map((e) => e.id)).toEqual(['b', 'a', 'c']);
    expect(sortExpenses(all, 'outstanding').map((e) => e.id)).toEqual(['b', 'c', 'a']);
    expect(sortExpenses(all, 'updated')[0]?.id).toBe('a');
    expect(sortExpenses(all, 'due').map((e) => e.id)).toEqual(['a', 'b', 'c']);
  });

  it('shows overdue before any other status, and lists categories once', () => {
    expect(shownStatus(catering)).toBe('overdue');
    expect(shownStatus(haldi)).toBe('paid');
    expect(categoriesOf([haldi, catering, mehendi])).toEqual(['Catering', 'Decoration']);
  });
});
