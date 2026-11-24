import { describe, expect, it } from 'vitest';
import {
  detailsBody,
  detailsErrors,
  displayTitle,
  stampTime,
  tidyParagraphs,
  type DetailsInput,
} from './details';

const valid: DetailsInput = {
  brideName: 'Ananya',
  groomName: 'Arjun',
  city: 'Jaipur',
  state: 'Rajasthan',
  weddingDate: '',
  venueName: '',
  venueAddress: '',
  mapsUrl: '',
  description: '',
};

describe('displayTitle', () => {
  it('names the wedding after the couple', () => {
    expect(displayTitle({ brideName: ' Ananya ', groomName: 'Arjun' })).toBe(
      'Ananya & Arjun’s Wedding',
    );
    expect(displayTitle({ brideName: '', groomName: 'Arjun' })).toBe('… & Arjun’s Wedding');
    expect(displayTitle({ brideName: '', groomName: '' })).toBe('Your wedding');
  });
});

describe('detailsErrors', () => {
  it('accepts the required details with every optional one empty', () => {
    expect(detailsErrors(valid)).toEqual({});
  });

  it('keeps the onboarding rules for names, place and date', () => {
    expect(detailsErrors({ ...valid, city: '' })).toEqual({ city: 'Enter the city.' });
  });

  it('limits the venue and description as the API does, counting characters', () => {
    expect(
      detailsErrors({
        ...valid,
        venueName: 'a'.repeat(121),
        venueAddress: 'a'.repeat(301),
        description: 'a'.repeat(501),
      }),
    ).toEqual({
      'mainVenue.name': 'Use 120 characters or fewer.',
      'mainVenue.address': 'Use 300 characters or fewer.',
      description: 'Use 500 characters or fewer.',
    });
    // An emoji is one character, as the API counts it.
    expect(detailsErrors({ ...valid, description: '🌸'.repeat(500) })).toEqual({});
  });

  it('asks for a web link for the map', () => {
    expect(detailsErrors({ ...valid, mapsUrl: 'Rambagh Palace' })).toEqual({
      'mainVenue.mapsUrl': 'Paste a Google Maps link, like https://maps.app.goo.gl/…',
    });
    expect(detailsErrors({ ...valid, mapsUrl: 'https://maps.app.goo.gl/x' })).toEqual({});
  });

  it('allows a stored date that has passed, never a new past one', () => {
    expect(detailsErrors({ ...valid, weddingDate: '2001-01-01' }, '2001-01-01')).toEqual({});
    expect(detailsErrors({ ...valid, weddingDate: '2001-01-01' })).toEqual({
      weddingDate: 'Choose today or a later date.',
    });
  });
});

describe('detailsBody', () => {
  it('removes what was emptied', () => {
    expect(detailsBody(valid)).toEqual({
      brideName: 'Ananya',
      groomName: 'Arjun',
      city: 'Jaipur',
      state: 'Rajasthan',
      weddingDate: null,
      mainVenue: null,
      description: null,
    });
  });

  it('sends only the venue parts that are known', () => {
    expect(
      detailsBody({ ...valid, venueName: 'Rambagh Palace', description: 'Two families.' }),
    ).toMatchObject({ mainVenue: { name: 'Rambagh Palace' }, description: 'Two families.' });
  });
});

describe('tidyParagraphs', () => {
  it('keeps line breaks and trims the ends', () => {
    expect(tidyParagraphs('  One.\r\nTwo.  ')).toBe('One.\nTwo.');
  });
});

describe('stampTime', () => {
  it('shows the day and time in India', () => {
    expect(stampTime('2027-02-10T10:45:00Z')).toMatch(/^10 Feb 2027, 4:15\s?pm$/i);
  });
});
