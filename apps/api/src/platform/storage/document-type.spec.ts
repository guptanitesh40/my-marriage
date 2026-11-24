import { describe, expect, it } from 'vitest';
import { matchesDocumentType, tidyFileName } from './document-type.js';

const bytes = (...values: number[]) =>
  Uint8Array.from([...values, ...Array.from({ length: 16 }, () => 0)]);
const text = (value: string) =>
  Uint8Array.from([...Buffer.from(value), ...Array.from({ length: 16 }, () => 0)]);

describe('matchesDocumentType', () => {
  it('accepts each kept kind by its own first bytes', () => {
    expect(matchesDocumentType(text('%PDF-1.7'), 'application/pdf')).toBe(true);
    expect(matchesDocumentType(bytes(0xff, 0xd8, 0xff), 'image/jpeg')).toBe(true);
    expect(matchesDocumentType(text('\0\0\0\x18ftypheic'), 'image/heic')).toBe(true);
    const ole = bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1);
    expect(matchesDocumentType(ole, 'application/msword')).toBe(true);
    expect(matchesDocumentType(ole, 'application/vnd.ms-excel')).toBe(true);
    const zip = bytes(0x50, 0x4b, 0x03, 0x04);
    expect(
      matchesDocumentType(zip, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
    ).toBe(true);
  });

  it('refuses a file whose bytes say it is something else', () => {
    expect(matchesDocumentType(text('<html><script>'), 'application/pdf')).toBe(false);
    expect(matchesDocumentType(text('%PDF-1.7'), 'image/png')).toBe(false);
    expect(
      matchesDocumentType(
        text('%PDF-1.7'),
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ),
    ).toBe(false);
  });
});

describe('tidyFileName', () => {
  it('keeps the name without folders or hidden characters', () => {
    expect(tidyFileName('C:\\Users\\me\\Advance   receipt.pdf', 'document.pdf')).toBe(
      'Advance receipt.pdf',
    );
    expect(tidyFileName('../../etc/passwd', 'document.pdf')).toBe('passwd');
    expect(tidyFileName('bill\u202Egnp.pdf', 'document.pdf')).toBe('billgnp.pdf');
  });

  it('is never empty and never longer than 120 characters', () => {
    expect(tidyFileName('   ', 'document.pdf')).toBe('document.pdf');
    expect([...tidyFileName('a'.repeat(300), 'x')]).toHaveLength(120);
  });
});
