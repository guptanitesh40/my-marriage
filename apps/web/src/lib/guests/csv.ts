/**
 * Reading and writing guest lists as CSV (PRD GUEST-05), in the browser:
 * RFC 4180 quoting, a header row, and columns found by name so the order
 * does not matter. XLSX is not read yet (decision 0015).
 */

/** Rows of cells; handles quotes, doubled quotes, commas and line breaks inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const source = text.replace(/^﻿/, '');
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += char;
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((value) => value.trim() !== ''));
}

export interface ImportRow {
  name: string;
  partySize: string;
  email?: string;
  phone?: string;
  organizerNotes?: string;
  events?: string[];
}

const COLUMNS: Record<keyof ImportRow, readonly string[]> = {
  name: ['name', 'primary contact', 'primary contact name', 'guest', 'guest name', 'contact'],
  partySize: ['party size', 'party', 'people', 'number of people', 'size', 'headcount', 'count'],
  email: ['email', 'email address', 'e-mail'],
  phone: ['phone', 'phone number', 'mobile', 'whatsapp', 'phone / whatsapp'],
  organizerNotes: ['notes', 'note', 'private notes', 'organizer notes'],
  events: ['ceremonies', 'events', 'invited ceremonies', 'invited events', 'ceremony', 'event'],
};

/** The rows as guests, finding each column by its heading; null if there is no name column. */
export function readGuestRows(text: string): { rows: ImportRow[]; columns: string[] } | null {
  const [header, ...data] = parseCsv(text);
  if (!header) return null;
  const headings = header.map((heading) => heading.trim().toLowerCase().replace(/\s+/g, ' '));
  const index = (key: keyof ImportRow) =>
    headings.findIndex((heading) => COLUMNS[key].includes(heading));
  const at = Object.fromEntries(
    (Object.keys(COLUMNS) as (keyof ImportRow)[]).map((key) => [key, index(key)]),
  ) as Record<keyof ImportRow, number>;
  if (at.name === -1) return null;
  // Undoes toCsv's spreadsheet guard ('+91…), so an exported or sample file imports as written.
  const cell = (cells: string[], key: keyof ImportRow) =>
    at[key] === -1 ? '' : (cells[at[key]] ?? '').trim().replace(/^'(?=[=+\-@])/, '');
  return {
    columns: (Object.keys(at) as (keyof ImportRow)[]).filter((key) => at[key] !== -1),
    rows: data.map((cells) => {
      const events = cell(cells, 'events')
        .split(/[;,|]/)
        .map((title) => title.trim())
        .filter(Boolean);
      return {
        name: cell(cells, 'name'),
        partySize: cell(cells, 'partySize'),
        ...(cell(cells, 'email') ? { email: cell(cells, 'email') } : {}),
        ...(cell(cells, 'phone') ? { phone: cell(cells, 'phone') } : {}),
        ...(cell(cells, 'organizerNotes') ? { organizerNotes: cell(cells, 'organizerNotes') } : {}),
        ...(events.length > 0 ? { events } : {}),
      };
    }),
  };
}

/** One CSV cell, quoted when needed; a leading =, +, - or @ is defused for spreadsheets. */
function csvCell(value: string | number): string {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** A CSV file: a header row, then the rows, with CRLF line ends as spreadsheets expect. */
export function toCsv(rows: readonly (readonly (string | number)[])[]): string {
  return `﻿${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
}

/**
 * A sample guest list to fill in: every column the import reads, with only
 * the wedding's own ceremony names (none before any are added), so it can
 * be imported as it is.
 */
export function sampleCsv(ceremonies: readonly string[]): string {
  const at = (index: number) => ceremonies[Math.min(index, ceremonies.length - 1)] ?? '';
  return toCsv([
    ['Name', 'Party size', 'Email', 'Phone', 'Ceremonies', 'Notes'],
    [
      'Rajesh Sharma',
      5,
      'rajesh.sharma@example.com',
      '+91 98200 11223',
      ceremonies.slice(0, 3).join('; '),
      'Bua ji’s family from Patna',
    ],
    ['Sunita Verma', 3, '', '+91 98010 66734', at(1), ''],
    ['Arjun Mehta', 1, 'arjun.mehta@example.com', '', at(2), 'Office friend'],
  ]);
}

/** Saves `text` as a CSV file through the browser. */
export function downloadCsv(fileName: string, text: string): void {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}
