import { describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS, filterParams, isNarrowed, readFilters } from './filters';

const ID = '6740a1b2c3d4e5f601234567';

describe('task filters in the address', () => {
  it('reads every filter, and ignores what it does not know', () => {
    expect(
      readFilters({
        view: 'overdue',
        q: '  Haldi   decor ',
        eventId: ID,
        assigneeId: 'none',
        state: 'in_progress',
        priority: 'high',
        sort: 'priority',
      }),
    ).toEqual({
      view: 'overdue',
      q: 'Haldi decor',
      eventId: ID,
      assigneeId: 'none',
      state: 'in_progress',
      priority: 'high',
      sort: 'priority',
    });
    expect(
      readFilters({
        view: 'urgent',
        eventId: 'haldi',
        assigneeId: ['x', 'y'],
        state: 'done',
        priority: 'medium',
        sort: 'title',
      }),
    ).toEqual(DEFAULT_FILTERS);
    expect(readFilters({ q: 'x'.repeat(150) }).q).toHaveLength(100);
  });

  it('writes only what differs from the defaults', () => {
    expect(filterParams(DEFAULT_FILTERS).toString()).toBe('');
    expect(
      filterParams({ ...DEFAULT_FILTERS, view: 'mine', q: 'tent', sort: 'due' }).toString(),
    ).toBe('view=mine&q=tent');
  });

  it('counts a search or a filter as narrowing, but not the view or the order', () => {
    expect(isNarrowed({ ...DEFAULT_FILTERS, view: 'completed', sort: 'updated' })).toBe(false);
    expect(isNarrowed({ ...DEFAULT_FILTERS, q: 'tent' })).toBe(true);
    expect(isNarrowed({ ...DEFAULT_FILTERS, assigneeId: 'none' })).toBe(true);
  });
});
