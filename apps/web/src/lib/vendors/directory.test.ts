import { describe, expect, it } from 'vitest';
import {
  categoriesOf,
  directoryStats,
  filterParams,
  initials,
  isNarrowed,
  matches,
  NO_FILTERS,
  readFilters,
  type Vendor,
} from './directory';

const HALDI = '6740a1b2c3d4e5f601230001';
const SANGEET = '6740a1b2c3d4e5f601230002';

function vendor(fields: Partial<Vendor> & Pick<Vendor, 'name' | 'category'>): Vendor {
  return {
    id: `id-${fields.name}`,
    events: [],
    createdAt: '2026-11-19T10:00:00.000Z',
    updatedAt: '2026-11-19T10:00:00.000Z',
    ...fields,
  };
}

const marigold = vendor({
  name: 'The Marigold Studio',
  category: 'Photography & Videography',
  contactName: 'Rohan Shah',
  phone: '+91 98201 44521',
  email: 'rohan@marigoldstudio.in',
  events: [
    { id: HALDI, title: 'Haldi' },
    { id: SANGEET, title: 'Sangeet' },
  ],
});
const cityline = vendor({ name: 'Cityline Guest Travel', category: 'Transportation' });
const saffron = vendor({
  name: 'Saffron Table',
  category: 'catering',
  phone: '99200 81290',
  events: [{ id: SANGEET, title: 'Sangeet' }],
});

describe('vendor filters in the address', () => {
  it('reads the filters and drops a malformed event', () => {
    expect(readFilters({ q: 'marigold', category: 'Catering', eventId: HALDI })).toEqual({
      q: 'marigold',
      category: 'Catering',
      eventId: HALDI,
    });
    expect(readFilters({ eventId: 'none' }).eventId).toBe('none');
    expect(readFilters({ eventId: 'haldi', q: ['a', 'b'] })).toEqual({
      q: 'a',
      category: '',
      eventId: '',
    });
  });

  it('writes only the filters that are set', () => {
    expect(filterParams(NO_FILTERS).toString()).toBe('');
    expect(
      filterParams({ q: '  rohan ', category: 'Music & DJ', eventId: 'none' }).toString(),
    ).toBe('q=rohan&category=Music+%26+DJ&eventId=none');
    expect(isNarrowed({ ...NO_FILTERS, q: '  ' })).toBe(false);
    expect(isNarrowed({ ...NO_FILTERS, eventId: HALDI })).toBe(true);
  });
});

describe('matching vendors', () => {
  const all = [marigold, cityline, saffron];
  const names = (filters: Partial<typeof NO_FILTERS>) =>
    all.filter((v) => matches(v, { ...NO_FILTERS, ...filters })).map((v) => v.name);

  it('narrows by category, ceremony and vendors with no ceremony', () => {
    expect(names({})).toHaveLength(3);
    expect(names({ category: 'Transportation' })).toEqual(['Cityline Guest Travel']);
    expect(names({ eventId: SANGEET })).toEqual(['The Marigold Studio', 'Saffron Table']);
    expect(names({ eventId: HALDI, category: 'catering' })).toEqual([]);
    expect(names({ eventId: 'none' })).toEqual(['Cityline Guest Travel']);
  });

  it('searches the name, category, contact, email and phone, ignoring case and spacing', () => {
    expect(names({ q: 'ROHAN' })).toEqual(['The Marigold Studio']);
    expect(names({ q: 'marigoldstudio.in' })).toEqual(['The Marigold Studio']);
    expect(names({ q: 'guest travel' })).toEqual(['Cityline Guest Travel']);
    expect(names({ q: '9920081290' })).toEqual(['Saffron Table']);
    expect(names({ q: '+9198201' })).toEqual(['The Marigold Studio']);
    expect(names({ q: 'fireworks' })).toEqual([]);
  });
});

describe('the directory’s figures', () => {
  it('counts categories, multi-event, reachable and unlinked vendors', () => {
    expect(directoryStats([marigold, cityline, saffron])).toEqual({
      total: 3,
      categories: 3,
      multiEvent: 1,
      reachable: 1,
      unlinked: 1,
    });
    expect(directoryStats([])).toMatchObject({ total: 0, categories: 0 });
  });

  it('lists the categories in use once each, A to Z', () => {
    expect(categoriesOf([marigold, cityline, saffron, cityline])).toEqual([
      'catering',
      'Photography & Videography',
      'Transportation',
    ]);
  });

  it('makes initials, skipping a leading "The"', () => {
    expect(initials('The Marigold Studio')).toBe('MS');
    expect(initials('rhythm collective')).toBe('RC');
    expect(initials('Sharma')).toBe('S');
    expect(initials('The')).toBe('T');
    expect(initials('& Co. (Jaipur)')).toBe('CJ');
  });
});
