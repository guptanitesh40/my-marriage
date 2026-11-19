import { describe, expect, it } from 'vitest';
import { WEDDING_STATES, OUTSIDE_INDIA } from './states';
import { tidy, todayInIndia, weddingErrors } from './validation';

const valid = {
  brideName: 'Ananya',
  groomName: 'Arjun',
  city: 'Jaipur',
  state: 'Rajasthan',
  weddingDate: '',
};

describe('weddingErrors', () => {
  it('accepts the required details, with or without a date', () => {
    expect(weddingErrors(valid)).toEqual({});
    expect(weddingErrors({ ...valid, weddingDate: '2099-12-10' })).toEqual({});
    expect(weddingErrors({ ...valid, weddingDate: todayInIndia() })).toEqual({});
  });

  it('refuses dates that do not exist or are far out of range', () => {
    for (const weddingDate of ['2027-02-30', '1999-12-31', '2101-01-01', '10/12/2027']) {
      expect(weddingErrors({ ...valid, weddingDate }), weddingDate).toEqual({
        weddingDate: 'Enter a real date, like 2027-12-10.',
      });
    }
  });

  it('limits lengths as the API does', () => {
    expect(weddingErrors({ ...valid, brideName: 'a'.repeat(61) })).toEqual({
      brideName: 'Use 60 characters or fewer.',
    });
  });
});

describe('past dates', () => {
  it('refuses a new date before today in India, but keeps a stored one', () => {
    expect(weddingErrors({ ...valid, weddingDate: '2025-02-14' })).toEqual({
      weddingDate: 'Choose today or a later date.',
    });
    expect(weddingErrors({ ...valid, weddingDate: '2025-02-14' }, '2025-02-14')).toEqual({});
  });

  it('uses the date in India, not the browser’s time zone', () => {
    // 20:00 UTC on 18 November is already 19 November in India.
    expect(todayInIndia(new Date('2026-11-18T20:00:00Z'))).toBe('2026-11-19');
  });
});

describe('tidy', () => {
  it('trims and joins runs of spaces', () => {
    expect(tidy('  Ananya   Rao ')).toBe('Ananya Rao');
  });
});

describe('WEDDING_STATES', () => {
  it('lists the 36 states and union territories once each, then destinations abroad', () => {
    expect(new Set(WEDDING_STATES).size).toBe(WEDDING_STATES.length);
    expect(WEDDING_STATES).toHaveLength(37);
    expect(WEDDING_STATES.at(-1)).toBe(OUTSIDE_INDIA);
  });
});
