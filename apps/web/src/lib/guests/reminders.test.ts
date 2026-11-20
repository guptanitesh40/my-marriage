import { describe, expect, it } from 'vitest';
import { isUpcoming, offsetsText } from './reminders';

describe('reminders', () => {
  it('counts a ceremony as upcoming through its own day, where it is held', () => {
    const now = new Date('2027-02-12T17:00:00Z'); // 22:30 on 12 Feb in India
    const haldi = { state: 'scheduled', startDate: '2027-02-12', timeZone: 'Asia/Kolkata' };
    expect(isUpcoming(haldi, now)).toBe(true);
    expect(isUpcoming(haldi, new Date('2027-02-12T19:00:00Z'))).toBe(false);
    expect(isUpcoming({ ...haldi, state: 'cancelled' }, now)).toBe(false);
    expect(isUpcoming({ state: 'scheduled', timeZone: 'Asia/Kolkata' }, now)).toBe(true);
  });

  it('says when reminders go out', () => {
    expect(offsetsText([30, 7, 3])).toBe('30 days, 7 days and 3 days before');
    expect(offsetsText([7])).toBe('7 days before');
  });
});
