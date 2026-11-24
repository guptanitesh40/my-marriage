import { describe, expect, it } from 'vitest';
import { expiresIn, openTasks, shortDate } from './format';

describe('team formatting', () => {
  it('writes dates the Indian way', () => {
    expect(shortDate('2027-01-14T10:00:00Z')).toBe('14 Jan 2027');
  });

  it('says when an invitation link stops working', () => {
    const now = Date.parse('2027-01-10T10:00:00Z');
    expect(expiresIn('2027-01-16T10:00:00Z', now)).toBe('in 6 days');
    expect(expiresIn('2027-01-11T09:00:00Z', now)).toBe('tomorrow');
    expect(expiresIn('2027-01-09T09:00:00Z', now)).toBe('today');
  });

  it('counts open tasks', () => {
    expect(openTasks(1)).toBe('1 open task');
    expect(openTasks(8)).toBe('8 open tasks');
  });
});
