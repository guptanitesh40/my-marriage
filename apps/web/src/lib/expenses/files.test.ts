import { describe, expect, it } from 'vitest';
import { documentTypeOf, fileKind, fileProblem, fileSize, RECEIPT_ACCEPT } from './files';

describe('documentTypeOf', () => {
  it('trusts a type the product keeps', () => {
    expect(documentTypeOf({ name: 'bill', type: 'application/pdf' })).toBe('application/pdf');
  });

  it('falls back to the extension when the browser says nothing useful', () => {
    expect(documentTypeOf({ name: 'Contract.DOCX', type: '' })).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    expect(documentTypeOf({ name: 'IMG_0042.HEIC', type: '' })).toBe('image/heic');
    expect(documentTypeOf({ name: 'scan.heif', type: 'image/heif' })).toBe('image/heic');
  });

  it('refuses web pages, vector images and programs', () => {
    expect(documentTypeOf({ name: 'page.html', type: 'text/html' })).toBeNull();
    expect(documentTypeOf({ name: 'logo.svg', type: 'image/svg+xml' })).toBeNull();
    expect(documentTypeOf({ name: 'setup.exe', type: 'application/x-msdownload' })).toBeNull();
  });
});

describe('fileProblem', () => {
  it('explains what can be uploaded and how large', () => {
    expect(fileProblem({ name: 'a.zip', type: 'application/zip', size: 10 })).toMatch(/PDF/);
    expect(fileProblem({ name: 'a.pdf', type: 'application/pdf', size: 0 })).toBe(
      'That file is empty.',
    );
    expect(fileProblem({ name: 'a.pdf', type: 'application/pdf', size: 16 * 1024 * 1024 })).toBe(
      'That file is too large. Choose one under 15 MB.',
    );
    expect(fileProblem({ name: 'a.pdf', type: 'application/pdf', size: 1000 })).toBeUndefined();
  });
});

describe('labels', () => {
  it('writes sizes and kinds simply', () => {
    expect(fileSize(500)).toBe('1 KB');
    expect(fileSize(820 * 1024)).toBe('820 KB');
    expect(fileSize(2.4 * 1024 * 1024)).toBe('2.4 MB');
    expect(fileSize(12 * 1024 * 1024)).toBe('12 MB');
    expect(fileKind('application/vnd.ms-excel')).toBe('Excel');
    expect(fileKind('image/heic')).toBe('Photo');
  });

  it('offers every kept kind in the file chooser', () => {
    expect(RECEIPT_ACCEPT).toContain('.pdf');
    expect(RECEIPT_ACCEPT).toContain('.docx');
    expect(RECEIPT_ACCEPT).toContain('image/heic');
  });
});
