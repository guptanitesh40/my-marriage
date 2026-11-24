import { describe, expect, it } from 'vitest';
import {
  countdown,
  dayChip,
  daysBetween,
  paidSplit,
  plural,
  relativeDay,
  shortDay,
  teamLine,
  weddingWeek,
} from './format';

describe('countdown', () => {
  it('counts the days to the main wedding day', () => {
    expect(countdown('2027-02-14', '2026-11-23')).toEqual({ kind: 'ahead', days: 83 });
  });

  it('is the day itself, never zero days', () => {
    expect(countdown('2027-02-14', '2027-02-14')).toEqual({ kind: 'today' });
  });

  it('counts days since a past wedding, never a negative number', () => {
    expect(countdown('2027-02-14', '2027-02-20')).toEqual({ kind: 'past', days: 6 });
  });

  it('says when the date is not set', () => {
    expect(countdown(undefined, '2026-11-23')).toEqual({ kind: 'unset' });
  });

  it('crosses months and leap days by the calendar', () => {
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2);
  });
});

describe('weddingWeek', () => {
  it('starts 7 days before the first ceremony', () => {
    expect(weddingWeek('2027-02-10', '2027-02-03')).toBe('7 days until the celebrations begin');
    expect(weddingWeek('2027-02-10', '2027-02-02')).toBeUndefined();
  });

  it('says one day, and the day itself', () => {
    expect(weddingWeek('2027-02-10', '2027-02-09')).toBe('1 day until the celebrations begin');
    expect(weddingWeek('2027-02-10', '2027-02-10')).toBe('The celebrations begin today');
  });

  it('is nothing without a ceremony to come', () => {
    expect(weddingWeek(undefined, '2027-02-10')).toBeUndefined();
  });
});

describe('day labels', () => {
  it('names nearby days', () => {
    expect(relativeDay('2027-02-10', '2027-02-10')).toBe('Today');
    expect(relativeDay('2027-02-11', '2027-02-10')).toBe('Tomorrow');
    expect(relativeDay('2027-02-15', '2027-02-10')).toBe('In 5 days');
  });

  it('shows the year only when it is not this one', () => {
    expect(shortDay('2027-02-12', '2027-01-01')).toBe('12 Feb');
    expect(shortDay('2027-02-12', '2026-11-23')).toBe('12 Feb 2027');
    expect(dayChip('2027-02-12')).toEqual({ day: '12', month: 'Feb' });
  });
});

describe('paidSplit', () => {
  it('splits ₹5,25,000 paid of ₹8,50,000 into whole shares that add up to 100', () => {
    expect(paidSplit(52_500_000, 32_500_000)).toEqual({ paid: 62, due: 38 });
  });

  it('is empty when nothing is recorded', () => {
    expect(paidSplit(0, 0)).toEqual({ paid: 0, due: 0 });
  });
});

describe('words', () => {
  it('counts in Indian digit grouping', () => {
    expect(plural(1, 'person', 'people')).toBe('1 person');
    expect(plural(125000, 'person', 'people')).toBe('1,25,000 people');
  });

  it('names only the roles held', () => {
    expect(teamLine({ owners: 2, admins: 0, managers: 1 })).toBe('2 owners · 1 manager');
  });
});
