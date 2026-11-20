import { describe, expect, it } from 'vitest';
import { isTimeZone, isWallTime, todayIn, wallClock, zonedInstant } from './event-time.js';

describe('zonedInstant', () => {
  it('reads a time in India, five and a half hours ahead of UTC', () => {
    expect(zonedInstant('2027-12-13', '18:30', 'Asia/Kolkata').toISOString()).toBe(
      '2027-12-13T13:00:00.000Z',
    );
    expect(zonedInstant('2027-12-13', '00:15', 'Asia/Kolkata').toISOString()).toBe(
      '2027-12-12T18:45:00.000Z',
    );
  });

  it('follows daylight saving in the event’s own zone', () => {
    expect(zonedInstant('2027-07-10', '19:00', 'Europe/London').toISOString()).toBe(
      '2027-07-10T18:00:00.000Z',
    );
    expect(zonedInstant('2027-01-10', '19:00', 'Europe/London').toISOString()).toBe(
      '2027-01-10T19:00:00.000Z',
    );
  });

  it('takes the first of a time that happens twice when clocks go back', () => {
    // London, 31 October 2027: 01:30 happens in BST and again in GMT.
    expect(zonedInstant('2027-10-31', '01:30', 'Europe/London').toISOString()).toBe(
      '2027-10-31T00:30:00.000Z',
    );
  });

  it('moves a time skipped when clocks go forward past the jump', () => {
    // London, 28 March 2027: clocks jump from 01:00 to 02:00.
    const instant = zonedInstant('2027-03-28', '01:30', 'Europe/London');
    expect(instant.toISOString()).toBe('2027-03-28T01:30:00.000Z');
    expect(wallClock(instant, 'Europe/London')).toEqual({ day: '2027-03-28', time: '02:30' });
  });

  it('round-trips with wallClock', () => {
    for (const zone of ['Asia/Kolkata', 'Asia/Dubai', 'America/New_York', 'Asia/Kathmandu']) {
      const instant = zonedInstant('2028-02-29', '07:45', zone);
      expect(wallClock(instant, zone)).toEqual({ day: '2028-02-29', time: '07:45' });
    }
  });
});

describe('isTimeZone', () => {
  it('accepts IANA zone names', () => {
    for (const zone of ['Asia/Kolkata', 'Europe/London', 'America/Argentina/Buenos_Aires', 'UTC']) {
      expect(isTimeZone(zone)).toBe(true);
    }
  });

  it('refuses offsets, abbreviations and made-up zones', () => {
    for (const zone of ['+05:30', 'IST', 'Asia/Atlantis', '', 'asia kolkata', 5]) {
      expect(isTimeZone(zone)).toBe(false);
    }
  });
});

describe('isWallTime', () => {
  it('accepts 24-hour HH:mm only', () => {
    expect(['00:00', '09:05', '23:59'].every(isWallTime)).toBe(true);
    expect(['24:00', '9:05', '18:60', '6 pm', '18:30:00'].some(isWallTime)).toBe(false);
  });
});

describe('todayIn', () => {
  it('is today where the event happens', () => {
    const now = new Date('2027-12-12T20:00:00Z');
    expect(todayIn('Asia/Kolkata', now)).toBe('2027-12-13');
    expect(todayIn('Europe/London', now)).toBe('2027-12-12');
  });
});
