import { describe, expect, it } from 'vitest';
import { parseCsv, readGuestRows, sampleCsv, toCsv } from './csv';

describe('CSV', () => {
  it('reads quotes, doubled quotes, commas and line breaks inside quotes, and a BOM', () => {
    expect(parseCsv('﻿a,b\r\n"x, y","say ""hi"""\n"two\nlines",3\n\n')).toEqual([
      ['a', 'b'],
      ['x, y', 'say "hi"'],
      ['two\nlines', '3'],
    ]);
  });

  it('finds columns by their heading, in any order, and splits ceremonies', () => {
    const read = readGuestRows(
      'Email,Guest name,People,Ceremonies,Ignored\n' +
        'rajesh@example.com,Rajesh Sharma,5,Haldi; Wedding,x\n' +
        ',Priya Desai,2,,\n',
    );
    expect(read?.columns).toEqual(['name', 'partySize', 'email', 'events']);
    expect(read?.rows).toEqual([
      {
        name: 'Rajesh Sharma',
        partySize: '5',
        email: 'rajesh@example.com',
        events: ['Haldi', 'Wedding'],
      },
      { name: 'Priya Desai', partySize: '2' },
    ]);
  });

  it('needs a name column', () => {
    expect(readGuestRows('Email,Phone\na@b.co,1\n')).toBeNull();
    expect(readGuestRows('')).toBeNull();
  });

  it('writes cells safely for spreadsheets', () => {
    expect(
      toCsv([
        ['Name', 'Notes'],
        ['Sharma, Rajesh', 'said "yes"'],
        ['=HYPERLINK()', '+91'],
      ]),
    ).toBe('﻿Name,Notes\r\n"Sharma, Rajesh","said ""yes"""\r\n\'=HYPERLINK(),\'+91\r\n');
  });

  it('offers a sample that imports as it is, with the wedding’s own ceremonies', () => {
    const read = readGuestRows(sampleCsv(['Tilak', 'Haldi', 'Wedding', 'Vidaai']));
    expect(read?.columns).toEqual([
      'name',
      'partySize',
      'email',
      'phone',
      'organizerNotes',
      'events',
    ]);
    expect(read?.rows[0]).toEqual({
      name: 'Rajesh Sharma',
      partySize: '5',
      email: 'rajesh.sharma@example.com',
      phone: '+91 98200 11223',
      organizerNotes: 'Bua ji’s family from Patna',
      events: ['Tilak', 'Haldi', 'Wedding'],
    });
    expect(read?.rows.map((row) => row.events)).toEqual([
      ['Tilak', 'Haldi', 'Wedding'],
      ['Haldi'],
      ['Wedding'],
    ]);
    expect(readGuestRows(sampleCsv(['Wedding']))?.rows.map((row) => row.events)).toEqual([
      ['Wedding'],
      ['Wedding'],
      ['Wedding'],
    ]);
    expect(readGuestRows(sampleCsv([]))?.rows.map((row) => row.events)).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
  });
});
