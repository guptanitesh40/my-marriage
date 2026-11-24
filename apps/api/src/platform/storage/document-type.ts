import { imageTypeOf } from './image-type.js';

/**
 * The files an expense can keep (decision 0023): photos and scans of
 * receipts, PDFs, and Word and Excel documents. Nothing that a browser
 * would run (HTML, SVG, scripts) and nothing executable.
 */
export const DOCUMENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_EXTENSIONS: Record<DocumentType, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
};

/** Images a browser shows by itself; every other kind is downloaded. */
export const VIEWABLE_TYPES: readonly DocumentType[] = ['image/jpeg', 'image/png', 'image/webp'];

/** How many first bytes the check below needs. */
export const DOCUMENT_SNIFF_BYTES = 16;

/**
 * Whether a file's own first bytes agree with the type it was uploaded as;
 * never judged from its name. Word and Excel files share a container
 * (the old ones an OLE compound file, the new ones a ZIP), so only the
 * container is checked for those.
 */
export function matchesDocumentType(start: Uint8Array, type: DocumentType): boolean {
  const at = (offset: number, bytes: number[]) =>
    bytes.every((byte, index) => start[offset + index] === byte);
  const ascii = (offset: number, text: string) =>
    at(
      offset,
      [...text].map((char) => char.charCodeAt(0)),
    );
  switch (type) {
    case 'application/pdf':
      return ascii(0, '%PDF-');
    case 'image/jpeg':
    case 'image/png':
    case 'image/webp':
      return imageTypeOf(start) === type;
    case 'image/heic':
      return (
        ascii(4, 'ftyp') &&
        ['heic', 'heix', 'hevc', 'heim', 'heis', 'mif1', 'msf1'].some((brand) => ascii(8, brand))
      );
    case 'application/msword':
    case 'application/vnd.ms-excel':
      return at(0, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return at(0, [0x50, 0x4b, 0x03, 0x04]);
  }
}

/**
 * A file name safe to keep and show: no folders, no control or
 * formatting characters, at most 120 characters, never empty.
 */
export function tidyFileName(name: string, fallback: string): string {
  const base = name.split(/[\\/]/).pop() ?? '';
  const clean = base
    .normalize('NFC')
    .replace(/[\p{Cc}\p{Cf}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  return [...clean].slice(0, 120).join('') || fallback;
}
