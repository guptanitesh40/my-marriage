'use client';

import Image from 'next/image';
import { useCallback, useId, useRef, useState } from 'react';
import { Icon, type IconName } from '@/components/ui/icon';
import { api } from '@/lib/api/browser';
import { networkFailure, toFailure } from '@/lib/api/errors';
import {
  documentTypeOf,
  fileKind,
  fileProblem,
  fileSize,
  RECEIPT_ACCEPT,
  type DocumentType,
  type ExpenseFile,
} from '@/lib/expenses/files';

interface Item {
  key: string;
  name: string;
  status: 'uploading' | 'done' | 'failed';
  file?: ExpenseFile;
  error?: string;
}

const itemOf = (file: ExpenseFile): Item => ({
  key: file.id,
  name: file.fileName,
  status: 'done',
  file,
});

/**
 * Files being attached to an expense or a payment (decision 0023): each
 * chosen file is uploaded at once, checked by the API, and kept ready to
 * attach when the form is saved. `ids` are the ready ones, in order;
 * `busy` while any is still uploading.
 */
export function useReceipts(weddingId: string, initial: readonly ExpenseFile[] = []) {
  const [items, setItems] = useState<Item[]>(() => initial.map(itemOf));
  const counter = useRef(0);

  const update = (key: string, patch: Partial<Item>) =>
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));

  async function upload(key: string, file: File, type: DocumentType) {
    try {
      const form = await api.POST('/api/v1/weddings/{weddingId}/expense-files', {
        params: { path: { weddingId } },
        body: { contentType: type, bytes: file.size, fileName: file.name || 'document' },
      });
      if (!form.data) {
        const failure = toFailure(form.response.status, form.error);
        return update(key, { status: 'failed', error: failure.message });
      }
      const { uploadId, url, fields } = form.data.data;
      const body = new FormData();
      for (const [name, value] of Object.entries(fields)) body.append(name, value);
      body.append('file', new Blob([file], { type }), file.name || 'document');
      const sent = await fetch(url, { method: 'POST', body });
      if (!sent.ok) {
        return update(key, { status: 'failed', error: 'The file didn’t upload. Try again.' });
      }
      const done = await api.POST('/api/v1/weddings/{weddingId}/expense-files/{fileId}/complete', {
        params: { path: { weddingId, fileId: uploadId } },
      });
      if (!done.data) {
        const failure = toFailure(done.response.status, done.error);
        return update(key, { status: 'failed', error: failure.message });
      }
      update(key, { status: 'done', file: done.data.data });
    } catch {
      update(key, { status: 'failed', error: networkFailure().message });
    }
  }

  /** Starts uploading the chosen files; those over `limit`, or of a kind not kept, are refused. */
  function add(files: readonly File[], limit: number) {
    let room = limit - items.filter((item) => item.status !== 'failed').length;
    const added: Item[] = [];
    for (const file of files) {
      counter.current += 1;
      const key = `new-${counter.current}`;
      const problem =
        fileProblem(file) ?? (room <= 0 ? `Attach at most ${limit} files.` : undefined);
      const type = documentTypeOf(file);
      if (problem || !type) {
        added.push({ key, name: file.name, status: 'failed', error: problem });
        continue;
      }
      room -= 1;
      added.push({ key, name: file.name, status: 'uploading' });
      void upload(key, file, type);
    }
    setItems((current) => [...current, ...added]);
  }

  function remove(key: string) {
    setItems((current) => current.filter((item) => item.key !== key));
  }

  const reset = useCallback((next: readonly ExpenseFile[] = []) => {
    setItems(next.map(itemOf));
  }, []);

  const ready = items.flatMap((item) => (item.status === 'done' && item.file ? [item.file] : []));
  return {
    items,
    ids: ready.map((file) => file.id),
    busy: items.some((item) => item.status === 'uploading'),
    add,
    remove,
    reset,
  };
}

export type Receipts = ReturnType<typeof useReceipts>;

function kindIcon(type: DocumentType): IconName {
  if (type === 'application/pdf') return 'receipt-long';
  if (type.startsWith('image/')) return 'image';
  if (type.includes('word')) return 'edit-note';
  return 'fact-check';
}

/** A photo's thumbnail, or its kind's icon. */
function Thumb({ file }: { file?: ExpenseFile | undefined }) {
  if (file?.viewable) {
    return (
      <span className="relative size-10 shrink-0 overflow-hidden rounded-md bg-surface-container">
        <Image src={file.url} alt="" fill unoptimized sizes="40px" className="object-cover" />
      </span>
    );
  }
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-container text-secondary">
      <Icon name={file ? kindIcon(file.contentType) : 'description'} className="size-5" />
    </span>
  );
}

/**
 * "Receipts & documents": choose files (camera, photos or files on a
 * phone), see each upload, remove one before saving. PDFs, photos, Word
 * and Excel files, up to 15 MB each.
 */
export function ReceiptPicker({
  receipts,
  limit,
  label = 'Receipts & documents',
  hint,
  error,
}: {
  receipts: Receipts;
  limit: number;
  label?: string;
  hint?: string;
  error?: string | undefined;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const full = receipts.items.filter((item) => item.status !== 'failed').length >= limit;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <p id={`${id}-label`} className="text-label-md font-semibold text-on-surface">
          {label}
        </p>
        <span className="text-label-sm text-on-surface-variant">Optional</span>
      </div>
      {receipts.items.length > 0 && (
        <ul aria-labelledby={`${id}-label`} className="flex flex-col gap-2">
          {receipts.items.map((item) => (
            <li
              key={item.key}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                item.status === 'failed'
                  ? 'bg-error-container/40 ring-1 ring-error/30'
                  : 'bg-surface-container-low'
              }`}
            >
              <Thumb file={item.file} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body-sm font-semibold text-on-surface">
                  {item.name}
                </span>
                <span
                  className={`text-label-sm ${item.status === 'failed' ? 'text-error' : 'text-on-surface-variant'}`}
                  {...(item.status === 'failed' ? { role: 'alert' } : {})}
                >
                  {item.status === 'uploading'
                    ? 'Uploading…'
                    : item.status === 'failed'
                      ? (item.error ?? 'The file didn’t upload. Try again.')
                      : item.file
                        ? `${fileKind(item.file.contentType)} · ${fileSize(item.file.bytes)}`
                        : ''}
                </span>
              </span>
              <button
                type="button"
                onClick={() => receipts.remove(item.key)}
                disabled={item.status === 'uploading'}
                aria-label={`Remove ${item.name}`}
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-error disabled:opacity-40"
              >
                <Icon name="close" className="size-4.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <label
        className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-3 text-label-md font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary-container ${
          full
            ? 'cursor-not-allowed border-outline-variant/50 text-on-surface-variant opacity-60'
            : 'border-outline-variant text-primary hover:border-primary hover:bg-surface-container-low'
        }`}
      >
        <Icon name="upload-file" className="size-5" />
        {receipts.items.length > 0 ? 'Add another file' : 'Upload receipt or document'}
        <input
          ref={input}
          type="file"
          multiple
          accept={RECEIPT_ACCEPT}
          disabled={full}
          aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}
          className="sr-only"
          onChange={(event) => {
            const chosen = Array.from(event.target.files ?? []);
            event.target.value = '';
            if (chosen.length > 0) receipts.add(chosen, limit);
          }}
        />
      </label>
      <p id={`${id}-hint`} className="text-body-sm text-on-surface-variant">
        {hint ?? 'A photo of the bill, a PDF, or a Word or Excel file'} · up to 15 MB each, at most{' '}
        {limit}.
      </p>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-body-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}

/** Kept files to open: photos in a new tab, everything else downloads. */
export function ReceiptList({
  files,
  compact = false,
}: {
  files: readonly ExpenseFile[];
  compact?: boolean;
}) {
  if (files.length === 0) return null;
  if (compact) {
    return (
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {files.map((file) => (
          <li key={file.id} className="max-w-full">
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              {...(file.viewable ? {} : { download: file.fileName })}
              className="inline-flex max-w-full items-center gap-1 rounded-full bg-surface-container-lowest px-2.5 py-1 text-label-sm font-semibold text-primary ring-1 ring-outline-variant/50 hover:underline"
            >
              <Icon name="attach-file" className="size-3.5 shrink-0" />
              <span className="truncate">{file.fileName}</span>
            </a>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {files.map((file) => (
        <li key={file.id}>
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            {...(file.viewable ? {} : { download: file.fileName })}
            className="flex items-center gap-3 rounded-lg bg-surface-container-low px-3 py-2 transition-colors hover:bg-surface-container"
          >
            <Thumb file={file} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-body-sm font-semibold text-on-surface">
                {file.fileName}
              </span>
              <span className="text-label-sm text-on-surface-variant">
                {fileKind(file.contentType)} · {fileSize(file.bytes)}
              </span>
            </span>
            <Icon
              name={file.viewable ? 'open-in-new' : 'download'}
              className="size-4.5 shrink-0 text-on-surface-variant"
            />
            <span className="sr-only">
              {file.viewable ? '(opens in a new tab)' : '(downloads)'}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
