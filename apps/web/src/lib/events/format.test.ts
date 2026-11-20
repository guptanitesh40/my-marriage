import { describe, expect, it } from 'vitest';
import {
  dayNumbers,
  eventSpan,
  eventWhen,
  isUpcoming,
  missingDetails,
  nextEvent,
  partOfDay,
  zonePlace,
} from './format';

describe('eventWhen', () => {
  it('shows the day and time as clocks show them where the event happens', () => {
    expect(
      eventWhen({ startDate: '2027-12-12', startTime: '10:00', timeZone: 'Asia/Kolkata' }),
    ).toBe('Sun, 12 Dec 2027 · 10:00 am');
    expect(
      eventWhen({ startDate: '2027-12-12', startTime: '18:30', timeZone: 'Asia/Kolkata' }),
    ).toBe('Sun, 12 Dec 2027 · 6:30 pm');
  });

  it('names the place when the event is not on India time', () => {
    expect(
      eventWhen({ startDate: '2027-07-10', startTime: '19:00', timeZone: 'Europe/London' }),
    ).toBe('Sat, 10 Jul 2027 · 7:00 pm · London time');
  });

  it('shows only the day without a time, and nothing without a day', () => {
    expect(eventWhen({ startDate: '2027-12-12', timeZone: 'Asia/Kolkata' })).toBe(
      'Sun, 12 Dec 2027',
    );
    expect(eventWhen({ timeZone: 'Asia/Kolkata' })).toBeUndefined();
  });
});

describe('dayNumbers', () => {
  it('counts calendar days from the earliest dated event', () => {
    const days = dayNumbers([
      { id: 'mehendi', startDate: '2027-12-12' },
      { id: 'haldi', startDate: '2027-12-12' },
      { id: 'wedding', startDate: '2027-12-14' },
      { id: 'undated' },
    ]);
    expect(Object.fromEntries(days)).toEqual({ mehendi: 1, haldi: 1, wedding: 3 });
  });

  it('numbers nothing when no event has a day', () => {
    expect(dayNumbers([{ id: 'a' }]).size).toBe(0);
  });
});

describe('missingDetails', () => {
  it('lists what is still to decide', () => {
    expect(missingDetails({})).toEqual(['Date not set', 'Venue not set']);
    expect(missingDetails({ startDate: '2027-12-12' })).toEqual(['Time not set', 'Venue not set']);
    expect(
      missingDetails({ startDate: '2027-12-12', startTime: '10:00', venue: { name: 'Rambagh' } }),
    ).toEqual([]);
  });
});

describe('zonePlace', () => {
  it('names the place of a zone', () => {
    expect(zonePlace('America/Argentina/Buenos_Aires')).toBe('Buenos Aires');
  });
});

describe('the events summary', () => {
  it('names the part of the day', () => {
    expect([undefined, '07:00', '12:30', '16:00', '20:15'].map(partOfDay)).toEqual([
      undefined,
      'Morning',
      'Afternoon',
      'Evening',
      'Night',
    ]);
  });

  it('says how many days the dated ceremonies span', () => {
    expect(eventSpan([{}, {}])).toBeUndefined();
    expect(eventSpan([{ startDate: '2027-02-14' }])).toEqual({ days: 1, label: '14 Feb' });
    expect(eventSpan([{ startDate: '2027-02-16' }, {}, { startDate: '2027-02-10' }])).toEqual({
      days: 7,
      label: '10–16 Feb',
    });
    expect(eventSpan([{ startDate: '2027-02-27' }, { startDate: '2027-03-02' }])).toEqual({
      days: 4,
      label: '27 Feb – 2 Mar',
    });
    expect(eventSpan([{ startDate: '2027-12-31' }, { startDate: '2028-01-01' }])?.label).toBe(
      '31 Dec 2027 – 1 Jan 2028',
    );
  });

  it('finds the next scheduled ceremony and what is upcoming', () => {
    const today = '2027-02-12';
    const events = [
      { title: 'Tilak', state: 'scheduled' as const, startDate: '2027-02-10' },
      { title: 'Haldi', state: 'cancelled' as const, startDate: '2027-02-12' },
      { title: 'Wedding', state: 'scheduled' as const, startDate: '2027-02-14' },
      { title: 'Sangeet', state: 'scheduled' as const, startDate: '2027-02-13' },
    ];
    expect(nextEvent(events, today)).toEqual({ event: events[3], inDays: 1 });
    expect(nextEvent([], today)).toBeUndefined();
    expect(events.map((e) => isUpcoming(e, today))).toEqual([false, false, true, true]);
    expect(isUpcoming({ state: 'scheduled' }, today)).toBe(true);
  });
});
