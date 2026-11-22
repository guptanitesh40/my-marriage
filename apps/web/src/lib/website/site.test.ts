import { describe, expect, it } from 'vitest';
import {
  celebrationCount,
  dateRangeLabel,
  eventDay,
  eventTime,
  monogram,
  monthYear,
  storyParagraphs,
  venueLabel,
  youtubeEmbedUrl,
} from './site';

describe('wedding website formatting', () => {
  it('writes the celebration dates as a range', () => {
    expect(dateRangeLabel({ start: '2027-02-12', end: '2027-02-15' })).toBe(
      '12 – 15 February 2027',
    );
    expect(dateRangeLabel({ start: '2027-02-28', end: '2027-03-02' })).toBe(
      '28 February – 2 March 2027',
    );
    expect(dateRangeLabel({ start: '2027-12-30', end: '2028-01-02' })).toBe(
      '30 December 2027 – 2 January 2028',
    );
    expect(dateRangeLabel({ start: '2027-02-14', end: '2027-02-14' })).toBe('14 February 2027');
    expect(dateRangeLabel(undefined)).toBeUndefined();
    expect(monthYear({ start: '2027-02-12', end: '2027-02-15' })).toBe('Feb 2027');
  });

  it('shows a ceremony’s day and its local time', () => {
    expect(eventDay({ startDate: '2027-02-12' })).toEqual({
      day: '12',
      month: 'Feb',
      weekday: 'Friday',
      short: 'Fri 12 Feb 2027',
    });
    expect(eventDay({})).toBeUndefined();
    expect(eventTime({ startTime: '10:30', timeZone: 'Asia/Kolkata' })).toBe('10:30 am IST');
    expect(eventTime({ startTime: '19:00', timeZone: 'Europe/London' })).toBe(
      '7:00 pm London time',
    );
    expect(eventTime({ timeZone: 'Asia/Kolkata' })).toBeUndefined();
  });

  it('builds the small details', () => {
    expect(monogram({ brideName: ' ananya', groomName: 'Arjun' })).toEqual(['A', 'A']);
    expect(venueLabel({ venueName: 'Rajvilas', venueAddress: 'Jaipur' })).toBe('Rajvilas, Jaipur');
    expect(venueLabel({})).toBeUndefined();
    expect(storyParagraphs('We met in Mumbai.\n\n  \n\nNow, Jaipur.\nTogether.')).toEqual([
      'We met in Mumbai.',
      'Now, Jaipur.\nTogether.',
    ]);
    expect(storyParagraphs(undefined)).toEqual([]);
    expect(celebrationCount([{ cancelled: false }, { cancelled: true }])).toBe(1);
    expect(youtubeEmbedUrl('dQw4w9WgXcQ')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0',
    );
  });
});
