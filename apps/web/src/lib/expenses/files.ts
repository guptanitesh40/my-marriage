import type { components } from '@my-marriage/contracts';

export type ExpenseFile = components['schemas']['ExpenseFileDto'];
export type DocumentType = ExpenseFile['contentType'];

/**
 * Receipts and documents on expenses (decision 0023). The same limits as
 * the API's (apps/api src/modules/expenses/expense-policy.ts), which checks
 * every file again, including that its own bytes match its type.
 */
export const RECEIPT_LIMITS = {
  bytes: 15 * 1024 * 1024,
  perExpense: 10,
  perEntry: 5,
} as const;

const BY_EXTENSION: Record<string, DocumentType> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heic',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

const TYPES = new Set<string>(Object.values(BY_EXTENSION));

/** For the file chooser: what it offers to pick. */
export const RECEIPT_ACCEPT = [
  ...Object.keys(BY_EXTENSION).map((extension) => `.${extension}`),
  ...TYPES,
].join(',');

/**
 * The type to upload a file as: what the browser says, or, when it says
 * nothing useful (common for Word files and iPhone photos), its extension.
 * Null for anything the product does not keep.
 */
export function documentTypeOf(file: { name: string; type: string }): DocumentType | null {
  if (TYPES.has(file.type)) return file.type as DocumentType;
  if (file.type === 'image/heif') return 'image/heic';
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  return BY_EXTENSION[extension] ?? null;
}

/** Why a chosen file can't be uploaded, or nothing when it can. */
export function fileProblem(file: {
  name: string;
  type: string;
  size: number;
}): string | undefined {
  if (!documentTypeOf(file)) {
    return 'Choose a PDF, a photo (JPEG, PNG, WebP or HEIC), or a Word or Excel file.';
  }
  if (file.size === 0) return 'That file is empty.';
  if (file.size > RECEIPT_LIMITS.bytes) return 'That file is too large. Choose one under 15 MB.';
  return undefined;
}

/** "820 KB", "2.4 MB": binary units, as phones show file sizes. */
export function fileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  const mb = bytes / (1024 * 1024);
  return `${mb < 10 ? mb.toFixed(1).replace(/\.0$/, '') : Math.round(mb)} MB`;
}

/** "PDF", "Photo", "Word", "Excel": what a file is, in a word. */
export function fileKind(type: DocumentType): string {
  if (type === 'application/pdf') return 'PDF';
  if (type.startsWith('image/')) return 'Photo';
  if (type.includes('word')) return 'Word';
  return 'Excel';
}
