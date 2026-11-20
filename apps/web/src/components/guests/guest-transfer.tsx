'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type ChangeEvent } from 'react';
import { FormAlert } from '@/components/forms/form-alert';
import { Icon } from '@/components/ui/icon';
import { api } from '@/lib/api/browser';
import { networkFailure, toFailure } from '@/lib/api/errors';
import { downloadCsv, readGuestRows, sampleCsv, toCsv, type ImportRow } from '@/lib/guests/csv';
import { RSVP_LABELS, type Guest } from '@/lib/guests/directory';
import type { components } from '@my-marriage/contracts';

type Preview = components['schemas']['ImportPreviewResultDto'];
type Result = components['schemas']['ImportCommitResultDto'];

/** The columns the import reads (lib/guests/csv.ts), for the format table. */
const FORMAT = [
  {
    name: 'Name',
    required: true,
    what: 'The primary contact for the family',
    example: 'Rajesh Sharma',
  },
  {
    name: 'Party size',
    required: true,
    what: 'Everyone they answer for, themselves included',
    example: '5',
  },
  {
    name: 'Email',
    required: false,
    what: 'To send the invitation by email',
    example: 'rajesh@example.com',
  },
  {
    name: 'Phone',
    required: false,
    what: 'To share the link on WhatsApp',
    example: '+91 98200 11223',
  },
  { name: 'Ceremonies', required: false, what: 'Separated by semicolons', example: '' },
  {
    name: 'Notes',
    required: false,
    what: 'Private, for your team only',
    example: 'Needs a ground-floor room',
  },
] as const;

const smallButton =
  'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-label-md font-semibold text-on-surface transition-colors hover:bg-surface-container';

/**
 * Import guests from a CSV file (PRD GUEST-05): read in the browser,
 * checked by the API row by row (problems and possible duplicates), and
 * imported only after the preview, all rows together or none.
 */
export function ImportGuests({
  weddingId,
  ceremonies,
}: {
  weddingId: string;
  /** The wedding's ceremony names, for the sample file. */
  ceremonies: readonly string[];
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);

  function reset() {
    setFileName('');
    setRows(null);
    setPreview(null);
    setResult(null);
    setAlert(null);
    setBusy(false);
  }

  async function chosen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setAlert(null);
    setPreview(null);
    setResult(null);
    if (!/\.csv$/i.test(file.name)) {
      setAlert(
        'Choose a CSV file. From Excel or Google Sheets, use “Save as” or “Download” → CSV.',
      );
      return;
    }
    const read = readGuestRows(await file.text());
    if (!read) {
      setAlert('The file needs a header row with a “Name” column (and ideally “Party size”).');
      return;
    }
    if (read.rows.length === 0 || read.rows.length > 1000) {
      setAlert(
        read.rows.length === 0
          ? 'The file has no guests in it.'
          : 'Import at most 1,000 guests at a time.',
      );
      return;
    }
    setFileName(file.name);
    setRows(read.rows);
    setBusy(true);
    try {
      const { data, error, response } = await api.POST(
        '/api/v1/weddings/{weddingId}/guests/import/preview',
        {
          params: { path: { weddingId } },
          body: { fileName: file.name, mode: 'csv', rows: read.rows },
        },
      );
      if (data) setPreview(data.data);
      else setAlert(toFailure(response.status, error).message);
    } catch {
      setAlert(networkFailure().message);
    }
    setBusy(false);
  }

  async function commit() {
    if (!rows || busy) return;
    setBusy(true);
    setAlert(null);
    try {
      const { data, error, response } = await api.POST(
        '/api/v1/weddings/{weddingId}/guests/import/commit',
        { params: { path: { weddingId } }, body: { rows, skipDuplicates, sourceFormat: 'csv' } },
      );
      // The list is fetched again once the dialog closes: on a new list the
      // page changes completely, which would take the result away unseen.
      if (data) setResult(data.data);
      else setAlert(toFailure(response.status, error).message);
    } catch {
      setAlert(networkFailure().message);
    }
    setBusy(false);
  }

  const importable = preview ? preview.ready + (skipDuplicates ? 0 : preview.duplicates) : 0;
  const exampleOf = (column: (typeof FORMAT)[number]) =>
    column.name === 'Ceremonies'
      ? ceremonies.slice(0, 2).join('; ') || 'Haldi; Wedding'
      : column.example;

  return (
    <>
      <button type="button" onClick={() => dialog.current?.showModal()} className={smallButton}>
        <Icon name="group-add" className="size-4.5 text-on-surface-variant" />
        Import guests
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="import-guests-title"
        onClose={() => {
          if (result) router.refresh();
          reset();
        }}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-2xl bg-surface-container-lowest p-0 text-on-surface shadow-xl backdrop:bg-on-surface/50"
      >
        <div className="flex flex-col gap-4 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-label-sm font-semibold tracking-widest text-secondary uppercase">
                {result ? 'Done' : preview ? `Step 2 of 2 · ${fileName}` : 'Step 1 of 2'}
              </p>
              <h2 id="import-guests-title" className="font-serif text-headline-sm text-on-surface">
                Import guests
              </h2>
            </div>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container"
            >
              <Icon name="close" className="size-5" label="Close" />
            </button>
          </div>

          {alert && (
            <FormAlert tone="error" title="Couldn’t import">
              {alert}
            </FormAlert>
          )}

          {result ? (
            <div
              role="status"
              className="rounded-xl bg-primary-fixed/40 p-4 text-body-md text-on-surface"
            >
              <p className="font-semibold">
                {result.created} {result.created === 1 ? 'guest' : 'guests'} imported.
              </p>
              <p className="mt-1 text-body-sm text-on-surface-variant">
                {result.skipped > 0 ? `${result.skipped} possible duplicates skipped. ` : ''}
                {result.rejected > 0
                  ? `${result.rejected} rows with problems were not imported.`
                  : ''}
              </p>
            </div>
          ) : !preview ? (
            <div className="flex flex-col gap-3">
              <p className="text-body-md text-on-surface-variant">
                Choose a CSV file with a header row. Columns are found by their heading, in any
                order:
              </p>
              <div className="overflow-x-auto rounded-lg border border-outline-variant">
                <table className="w-full text-left text-body-sm">
                  <caption className="sr-only">Columns the import reads</caption>
                  <thead className="bg-surface-container-low text-label-sm tracking-wider text-on-surface-variant uppercase">
                    <tr>
                      <th scope="col" className="px-3 py-2">
                        Column
                      </th>
                      <th scope="col" className="px-3 py-2">
                        What to put
                      </th>
                      <th scope="col" className="hidden px-3 py-2 sm:table-cell">
                        Example
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-high">
                    {FORMAT.map((column) => (
                      <tr key={column.name}>
                        <th
                          scope="row"
                          className="px-3 py-2 font-semibold whitespace-nowrap text-on-surface"
                        >
                          {column.name}
                          {column.required && <span className="text-primary"> *</span>}
                        </th>
                        <td className="px-3 py-2 text-on-surface-variant">
                          {column.what}
                          <span className="block text-on-surface sm:hidden">
                            e.g. {exampleOf(column)}
                          </span>
                        </td>
                        <td className="hidden px-3 py-2 whitespace-nowrap text-on-surface sm:table-cell">
                          {exampleOf(column)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="flex flex-wrap items-center justify-between gap-2 text-body-sm text-on-surface-variant">
                <span>
                  <span className="text-primary">*</span> Required. Ceremony names must match your
                  Events page.
                </span>
                <button
                  type="button"
                  onClick={() => downloadCsv('guest-list-sample.csv', sampleCsv(ceremonies))}
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-label-md font-semibold text-primary transition-colors hover:bg-primary/10"
                >
                  <Icon name="receipt-long" className="size-4.5" />
                  Download sample CSV
                </button>
              </p>
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-outline-variant px-6 py-8 text-center hover:bg-surface-container-low">
                <Icon name="group-add" className="size-7 text-secondary" />
                <span className="text-title-sm text-on-surface">
                  {busy ? 'Checking the file…' : 'Choose a CSV file'}
                </span>
                <span className="text-body-sm text-on-surface-variant">Up to 1,000 guests</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={chosen}
                  disabled={busy}
                  className="sr-only"
                />
              </label>
              <p className="text-body-sm text-on-surface-variant">
                Excel files: save them as CSV first. Nothing is imported until you confirm.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="flex flex-wrap gap-2 text-label-md font-semibold">
                <span className="rounded-full bg-primary-fixed px-3 py-1 text-on-primary-fixed">
                  {preview.ready} ready
                </span>
                <span className="rounded-full bg-error-container px-3 py-1 text-on-error-container">
                  {preview.errors} with problems
                </span>
                <span className="rounded-full bg-secondary-container px-3 py-1 text-on-secondary-container">
                  {preview.duplicates} possible duplicates
                </span>
              </p>
              <div className="max-h-80 overflow-auto rounded-lg border border-outline-variant">
                <table className="w-full text-left text-body-sm">
                  <thead className="sticky top-0 bg-surface-container-low text-label-sm tracking-wider text-on-surface-variant uppercase">
                    <tr>
                      <th className="px-3 py-2">Row</th>
                      <th className="px-3 py-2">Primary contact</th>
                      <th className="px-3 py-2">Party size</th>
                      <th className="px-3 py-2">Ceremonies</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-high">
                    {preview.rows.map((row) => {
                      const source = rows?.[row.index];
                      return (
                        <tr
                          key={row.index}
                          className={row.status === 'error' ? 'bg-error-container/30' : ''}
                        >
                          <td className="px-3 py-2 tabular-nums text-on-surface-variant">
                            {row.index + 2}
                          </td>
                          <td className="px-3 py-2 wrap-break-word">{source?.name || '—'}</td>
                          <td className="px-3 py-2 tabular-nums">{source?.partySize || '—'}</td>
                          <td className="px-3 py-2">{source?.events?.join(', ') ?? '—'}</td>
                          <td className="px-3 py-2">
                            {row.status === 'ready'
                              ? 'Ready'
                              : row.status === 'duplicate'
                                ? `Possible duplicate of ${row.duplicateOf ?? 'another guest'}`
                                : row.problems.map((problem) => problem.message).join(' ')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {preview.duplicates > 0 && (
                <label className="flex items-center gap-2 text-body-sm text-on-surface">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    className="size-4.5 accent-primary"
                  />
                  Skip possible duplicates (otherwise they are added as new guests)
                </label>
              )}
              <p className="text-body-sm text-on-surface-variant">
                Rows with problems are not imported. Fix them in the file and import it again.
              </p>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 border-t border-surface-container-highest bg-surface-container-low px-6 py-4">
          {result ? (
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="rounded-md bg-primary px-4 py-2.5 text-label-md font-semibold text-on-primary"
            >
              Done
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={preview ? reset : () => dialog.current?.close()}
                className="rounded-md bg-surface-container-lowest px-4 py-2.5 text-label-md font-semibold text-on-surface shadow-sm"
              >
                {preview ? 'Back' : 'Cancel'}
              </button>
              {preview && (
                <button
                  type="button"
                  onClick={commit}
                  disabled={busy || importable === 0}
                  className="rounded-md bg-primary px-4 py-2.5 text-label-md font-semibold text-on-primary disabled:opacity-50"
                >
                  {busy
                    ? 'Importing…'
                    : `Import ${importable} ${importable === 1 ? 'guest' : 'guests'}`}
                </button>
              )}
            </>
          )}
        </div>
      </dialog>
    </>
  );
}

/**
 * Export the guest list as CSV (PRD GUEST-05): contacts, invited ceremonies
 * and answers, built in the browser from the list already loaded. Warns
 * first, as the file holds private details.
 */
export function ExportGuests({
  guests,
  events,
  coupleName,
}: {
  guests: readonly Guest[];
  events: readonly { id: string; title: string }[];
  coupleName: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  function download() {
    const header = [
      'Name',
      'Party size',
      'Email',
      'Phone',
      'Notes',
      ...events.flatMap((event) => [`${event.title} RSVP`, `${event.title} attending`]),
    ];
    const rows = guests.map((guest) => {
      const byEvent = new Map(
        guest.invitations.map((invitation) => [invitation.eventId, invitation]),
      );
      return [
        guest.name,
        guest.partySize,
        guest.email ?? '',
        guest.phone ?? '',
        guest.organizerNotes ?? '',
        ...events.flatMap((event) => {
          const invitation = byEvent.get(event.id);
          if (!invitation) return ['Not invited', ''];
          return [
            RSVP_LABELS[invitation.rsvp.status],
            invitation.rsvp.status === 'attending' ? (invitation.rsvp.attendingCount ?? 0) : '',
          ];
        }),
      ];
    });
    downloadCsv(
      `${coupleName.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}-guests.csv`,
      toCsv([header, ...rows]),
    );
    dialog.current?.close();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        disabled={guests.length === 0}
        className={`${smallButton} disabled:opacity-50`}
      >
        <Icon name="receipt-long" className="size-4.5 text-on-surface-variant" />
        Export guests
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="export-guests-title"
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl bg-surface-container-lowest p-6 text-on-surface shadow-xl backdrop:bg-on-surface/50"
      >
        <h2 id="export-guests-title" className="font-serif text-headline-sm text-on-surface">
          Export guests
        </h2>
        <p className="mt-2 text-body-md text-on-surface-variant">
          A CSV file of all {guests.length} guests, with their ceremonies and answers. It opens in
          Excel and Google Sheets.
        </p>
        <p className="mt-3 flex gap-2 rounded-lg bg-secondary-container/40 px-3 py-2 text-body-sm text-on-secondary-container">
          <Icon name="lock" className="mt-0.5 size-4 shrink-0" />
          This file includes private contact details, notes and RSVPs. Store and share it carefully.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            autoFocus
            onClick={() => dialog.current?.close()}
            className="flex-1 rounded-md bg-surface-container px-4 py-2.5 text-label-md font-semibold text-on-surface"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={download}
            className="flex-1 rounded-md bg-primary px-4 py-2.5 text-label-md font-semibold text-on-primary"
          >
            Download CSV
          </button>
        </div>
      </dialog>
    </>
  );
}
