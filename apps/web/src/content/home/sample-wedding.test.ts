import { describe, expect, it } from 'vitest';
import {
  ceremonies,
  dashboard,
  expenses,
  linkHousehold,
  photoQueue,
  sampleHousehold,
  taskColumns,
} from './sample-wedding';

// The homepage's example data is a promise about the product. These checks
// keep it inside the rules in docs/reference/PRD_v1.0.md.
describe('sample wedding data', () => {
  it('adds up: ceremony tasks equal the dashboard and the task board totals', () => {
    const done = ceremonies.reduce((sum, c) => sum + c.tasksDone, 0);
    const total = ceremonies.reduce((sum, c) => sum + c.tasksTotal, 0);
    expect(done).toBe(dashboard.tasksDone);
    expect(total).toBe(dashboard.tasksTotal);
    expect(taskColumns.reduce((sum, c) => sum + c.count, 0)).toBe(dashboard.tasksTotal);
    expect(taskColumns.find((c) => c.state === 'completed')?.count).toBe(dashboard.tasksDone);
  });

  it('never confirms more people than were invited', () => {
    for (const c of ceremonies) {
      expect(c.confirmedPeople, c.name).toBeLessThanOrEqual(c.invitedPeople);
      expect(c.tasksDone, c.name).toBeLessThanOrEqual(c.tasksTotal);
    }
  });

  it('keeps every RSVP within the household party size (GUEST-03)', () => {
    for (const household of [sampleHousehold, linkHousehold]) {
      const replies = 'invitations' in household ? household.invitations : household.replies;
      expect(household.partySize).toBeGreaterThanOrEqual(1);
      for (const reply of replies) {
        expect(reply.attending).toBeGreaterThanOrEqual(1);
        expect(reply.attending).toBeLessThanOrEqual(household.partySize);
      }
      // A ceremony is either invited or not, never both.
      const invited = new Set(replies.map((r) => r.ceremony));
      for (const ceremony of household.notInvited) expect(invited.has(ceremony)).toBe(false);
    }
  });

  it('never records a payment above the expense total (EXP-03)', () => {
    for (const expense of expenses) {
      expect(expense.paidRupees).toBeGreaterThanOrEqual(0);
      expect(expense.paidRupees, expense.title).toBeLessThanOrEqual(expense.totalRupees);
    }
  });

  it('features a ceremony that exists, and a sensible photo queue', () => {
    expect(ceremonies.map((c) => c.name)).toContain(dashboard.featuredCeremony);
    expect(photoQueue.toReview).toBeLessThanOrEqual(photoQueue.uploads);
  });
});
