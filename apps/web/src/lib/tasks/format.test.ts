import { describe, expect, it } from 'vitest';
import { dueLabel } from './format';

const today = '2027-12-08';
const open = { state: 'todo' as const, overdue: false };

describe('dueLabel', () => {
  it('says when a task is due, as the design does', () => {
    expect(dueLabel({ ...open }, today)).toEqual({ text: 'No due date', tone: 'none' });
    expect(dueLabel({ ...open, dueDate: '2027-12-06', overdue: true }, today)).toEqual({
      text: '6 Dec · Overdue',
      tone: 'overdue',
    });
    expect(dueLabel({ ...open, dueDate: '2027-12-08', dueTime: '14:00' }, today)).toEqual({
      text: 'Today, 2:00 pm',
      tone: 'soon',
    });
    expect(dueLabel({ ...open, dueDate: '2027-12-09' }, today).text).toBe('Tomorrow');
    expect(dueLabel({ ...open, dueDate: '2027-12-11' }, today).text).toBe('11 Dec · In 3 days');
    expect(dueLabel({ ...open, dueDate: '2027-12-30' }, today)).toEqual({
      text: '30 Dec',
      tone: 'later',
    });
    expect(dueLabel({ ...open, dueDate: '2028-01-10' }, today).text).toBe('10 Jan 2028');
  });

  it('shows only the day for finished tasks, even past ones', () => {
    expect(dueLabel({ state: 'completed', overdue: false, dueDate: '2027-12-04' }, today)).toEqual({
      text: '4 Dec',
      tone: 'later',
    });
    expect(
      dueLabel({ state: 'cancelled', overdue: false, dueDate: '2027-12-09' }, today).text,
    ).toBe('9 Dec');
  });
});
