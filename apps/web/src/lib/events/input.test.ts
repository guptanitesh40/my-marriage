import { describe, expect, it } from 'vitest';
import { eventInputErrors, timeZoneChoices } from './input';

const blank = {
  title: 'Haldi',
  startDate: '',
  startTime: '',
  venueName: '',
  venueAddress: '',
  description: '',
};

describe('eventInputErrors', () => {
  it('needs only a name', () => {
    expect(eventInputErrors(blank)).toEqual({});
    expect(eventInputErrors({ ...blank, title: '' })).toEqual({
      title: 'Enter the ceremony’s name.',
    });
  });

  it('needs a day before a time, and keeps to the API’s lengths', () => {
    expect(eventInputErrors({ ...blank, startTime: '18:30' })).toEqual({
      startTime: 'Choose the day first, then the time.',
    });
    expect(
      Object.keys(
        eventInputErrors({ ...blank, title: 'x'.repeat(81), venueName: 'x'.repeat(121) }),
      ),
    ).toEqual(['title', 'venue.name']);
  });
});

describe('timeZoneChoices', () => {
  it('starts with India, under its current name only', () => {
    const zones = timeZoneChoices();
    expect(zones[0]).toBe('Asia/Kolkata');
    expect(zones.filter((z) => z === 'Asia/Kolkata' || z === 'Asia/Calcutta')).toEqual([
      'Asia/Kolkata',
    ]);
  });
});
