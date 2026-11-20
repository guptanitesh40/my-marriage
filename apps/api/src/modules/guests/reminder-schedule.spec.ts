import { describe, expect, it } from 'vitest';
import type { EventBrief } from '../events/events.service.js';
import { addDays, dueOffsets, isUpcoming, localNow } from './reminder-schedule.js';

const haldi: EventBrief = {
  id: 'h',
  title: 'Haldi',
  deleted: false,
  cancelled: false,
  completed: false,
  scheduleVersion: 0,
  startDate: '2027-02-12',
  startTime: '09:00',
  timeZone: 'Asia/Kolkata',
};
const at = (iso: string) => new Date(iso);

describe('reminder schedule', () => {
  it('reads the day and hour where the ceremony is held', () => {
    // 20:00 UTC is 01:30 the next day in India.
    expect(localNow(at('2027-01-12T20:00:00Z'), 'Asia/Kolkata')).toEqual({
      date: '2027-01-13',
      hour: 1,
    });
    expect(addDays('2027-03-01', -30)).toBe('2027-01-30');
  });

  it('is due on its day from 9 am local time, and only that day', () => {
    const offsets = [30, 7, 3];
    // 13 Jan 2027 is 30 days before 12 Feb.
    expect(dueOffsets(haldi, offsets, at('2027-01-13T03:00:00Z'))).toEqual([]); // 08:30 IST
    expect(dueOffsets(haldi, offsets, at('2027-01-13T03:30:00Z'))).toEqual([30]); // 09:00 IST
    expect(dueOffsets(haldi, offsets, at('2027-01-13T17:00:00Z'))).toEqual([30]); // 22:30 IST
    expect(dueOffsets(haldi, offsets, at('2027-01-14T05:00:00Z'))).toEqual([]);
    expect(dueOffsets(haldi, offsets, at('2027-02-05T05:00:00Z'))).toEqual([7]);
    expect(dueOffsets(haldi, [30, 3], at('2027-02-05T05:00:00Z'))).toEqual([]);
    expect(dueOffsets(haldi, offsets, at('2027-02-09T05:00:00Z'))).toEqual([3]);
  });

  it('never reminds about a ceremony that is cancelled, completed, past or undated', () => {
    const now = at('2027-02-05T05:00:00Z');
    expect(dueOffsets({ ...haldi, cancelled: true }, [7], now)).toEqual([]);
    expect(dueOffsets({ ...haldi, completed: true }, [7], now)).toEqual([]);
    const undated: EventBrief = { ...haldi };
    delete undated.startDate;
    expect(dueOffsets(undated, [7], now)).toEqual([]);
    expect(isUpcoming(undated, now)).toBe(true);
    expect(isUpcoming(haldi, at('2027-02-12T17:00:00Z'))).toBe(true); // 22:30 on the day
    expect(isUpcoming(haldi, at('2027-02-12T19:00:00Z'))).toBe(false); // the day after
  });
});
