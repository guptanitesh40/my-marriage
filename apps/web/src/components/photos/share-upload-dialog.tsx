'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { FormAlert } from '@/components/forms/form-alert';
import { Icon } from '@/components/ui/icon';
import { api } from '@/lib/api/browser';
import { networkFailure, toFailure } from '@/lib/api/errors';
import type { UploadLink } from '@/lib/photos/albums';

type Target = { kind: 'album'; albumId: string; albumTitle: string } | { kind: 'general' };

const BUTTON = {
  primary:
    'inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-label-md font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container',
  secondary:
    'inline-flex items-center justify-center gap-2 rounded-md bg-surface-container-lowest px-4 py-2.5 text-label-md font-semibold text-on-surface shadow-xs ring-1 ring-outline-variant/60 transition-colors hover:bg-surface-container-low',
  quiet:
    'inline-flex min-h-8 items-center gap-1.5 rounded-md bg-surface-container-lowest px-3 text-label-md text-on-surface ring-1 ring-outline-variant/50 transition-colors hover:bg-surface-container-low',
} as const;

/**
 * "QR & Link" and "Invite Photo Uploads" (Stitch "Photos & Albums
 * Workspace", share dialog): the link guests open to upload, as a QR code
 * to print or download and as text to copy or share; a new link or none
 * when it has been passed around too far (PRD PHOTO-08). The general link
 * can also be emailed to guests. The link is a bearer credential: it is
 * only ever shown here.
 */
export function ShareUploadsButton({
  weddingId,
  target,
  link,
  writable,
  variant = 'secondary',
  children,
}: {
  weddingId: string;
  target: Target;
  link?: UploadLink;
  writable: boolean;
  variant?: keyof typeof BUTTON;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          dialog.current?.showModal();
        }}
        className={BUTTON[variant]}
      >
        <Icon name="qr-code" className="size-4.5" />
        {children}
      </button>
      <ShareDialog
        dialog={dialog}
        open={open}
        onClosed={() => setOpen(false)}
        weddingId={weddingId}
        target={target}
        initial={link}
        writable={writable}
      />
    </>
  );
}

function ShareDialog({
  dialog,
  open,
  onClosed,
  weddingId,
  target,
  initial,
  writable,
}: {
  dialog: React.RefObject<HTMLDialogElement | null>;
  open: boolean;
  onClosed: () => void;
  weddingId: string;
  target: Target;
  initial?: UploadLink;
  writable: boolean;
}) {
  const router = useRouter();
  const [link, setLink] = useState<UploadLink | undefined>(initial);
  const [made, setMade] = useState<{ url: string; image: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState<'rotate' | 'revoke' | null>(null);
  const title = target.kind === 'general' ? 'Invite photo uploads' : 'Share QR & upload link';
  const id = target.kind === 'general' ? 'share-general' : `share-${target.albumId}`;

  // Opening the dialog makes the link when there is none yet.
  useEffect(() => {
    if (!open || link || !writable) return;
    void issue(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when opened
  }, [open]);

  useEffect(() => {
    if (!link) return;
    let current = true;
    const url = link.url;
    void QRCode.toDataURL(url, {
      width: 512,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#184539', light: '#ffffff' },
    }).then((image) => {
      if (current) setMade({ url, image });
    });
    return () => {
      current = false;
    };
  }, [link]);
  // The QR code of the link shown now; none while a new one is drawn.
  const qr = link && made?.url === link.url ? made.image : null;

  async function issue(replace: boolean) {
    setBusy(replace ? 'rotate' : 'issue');
    setProblem(null);
    try {
      const result =
        target.kind === 'general'
          ? await api.POST('/api/v1/weddings/{weddingId}/upload-links', {
              params: { path: { weddingId } },
              body: { replace },
            })
          : await api.POST('/api/v1/weddings/{weddingId}/albums/{albumId}/upload-links', {
              params: { path: { weddingId, albumId: target.albumId } },
              body: { replace },
            });
      if (result.data) {
        setLink(result.data.data);
        setConfirming(null);
        router.refresh();
      } else {
        setProblem(toFailure(result.response.status, result.error).message);
      }
    } catch {
      setProblem(networkFailure().message);
    }
    setBusy(null);
  }

  async function revoke() {
    if (!link) return;
    setBusy('revoke');
    setProblem(null);
    try {
      const { response, error } = await api.POST(
        '/api/v1/weddings/{weddingId}/upload-links/{linkId}/revoke',
        { params: { path: { weddingId, linkId: link.id } } },
      );
      if (response.ok || response.status === 404) {
        setLink(undefined);
        setConfirming(null);
        router.refresh();
      } else {
        setProblem(toFailure(response.status, error).message);
      }
    } catch {
      setProblem(networkFailure().message);
    }
    setBusy(null);
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setProblem('Copying isn’t allowed here. Select the link and copy it instead.');
    }
  }

  const message =
    target.kind === 'general'
      ? 'Share your photos from our wedding! Add them here, no app or account needed:'
      : `Share your photos from the ${target.albumTitle}! Add them here, no app or account needed:`;
  const fileName = `upload-qr-${(target.kind === 'general' ? 'wedding' : target.albumTitle)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}.png`;

  return (
    <dialog
      ref={dialog}
      aria-labelledby={`${id}-title`}
      onClose={() => {
        setConfirming(null);
        setProblem(null);
        onClosed();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl bg-surface-container-lowest p-6 text-on-surface shadow-xl backdrop:bg-on-surface/40 backdrop:backdrop-blur-xs"
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-label-sm font-semibold tracking-widest text-secondary uppercase">
              Guest contribution QR
            </p>
            <h2 id={`${id}-title`} className="mt-1 font-serif text-headline-sm text-on-surface">
              {title}
            </h2>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              {target.kind === 'general'
                ? 'One link for the whole wedding: guests choose the celebration their photos belong to.'
                : `Photos added with this link go to ${target.albumTitle}.`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="-m-1.5 rounded-full p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container"
          >
            <Icon name="close" className="size-5" label="Close" />
          </button>
        </div>

        {problem && (
          <FormAlert tone="error" title="Something went wrong">
            {problem}
          </FormAlert>
        )}

        {link ? (
          <>
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface-container-low p-5 text-center">
              <div className="relative size-48 overflow-hidden rounded-xl bg-white p-2 shadow-sm">
                {qr ? (
                  <Image
                    src={qr}
                    alt={`QR code to upload photos${target.kind === 'album' ? ` to ${target.albumTitle}` : ''}`}
                    fill
                    unoptimized
                    sizes="192px"
                    className="object-contain p-2"
                  />
                ) : (
                  <span className="block size-full animate-pulse rounded-lg bg-surface-container" />
                )}
              </div>
              <div>
                <p className="text-title-sm text-on-surface">Scan to upload photos</p>
                <p className="text-body-sm text-on-surface-variant">
                  No app or account needed for guests
                </p>
              </div>
            </div>

            <div>
              <label htmlFor={`${id}-url`} className="text-label-md font-semibold text-on-surface">
                Upload link
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  id={`${id}-url`}
                  readOnly
                  value={link.url}
                  onFocus={(event) => event.target.select()}
                  className="min-w-0 flex-1 rounded-md bg-surface-container-low px-3 py-2.5 text-body-sm text-on-surface"
                />
                <button type="button" onClick={copy} className={BUTTON.primary}>
                  <Icon name={copied ? 'check' : 'content-copy'} className="size-4" />
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p role="status" className="sr-only">
                {copied ? 'Link copied' : ''}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {qr && (
                <a href={qr} download={fileName} className={BUTTON.secondary}>
                  <Icon name="download" className="size-4.5" />
                  Download QR
                </a>
              )}
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`${message} ${link.url}`)}`}
                target="_blank"
                rel="noreferrer"
                className={BUTTON.secondary}
              >
                <Icon name="share" className="size-4.5" />
                Share on WhatsApp
              </a>
            </div>

            {target.kind === 'general' && writable && <EmailGuests weddingId={weddingId} />}

            <p className="flex items-start gap-2 rounded-xl bg-surface-container-low p-3 text-body-sm text-on-surface-variant">
              <Icon name="lock" className="mt-0.5 size-4 shrink-0 text-secondary" />
              Anyone with this link can add photos. They go to your private review first; only those
              you approve can appear on your website, and only if its photo gallery is on.
            </p>

            {writable &&
              (confirming ? (
                <div className="flex flex-col gap-3 rounded-xl bg-error-container/30 p-4">
                  <p className="text-body-sm text-on-surface">
                    {confirming === 'rotate'
                      ? 'The current link and QR code will stop working, including printed cards. Guests will need the new one.'
                      : 'This link and its QR code will stop working, and guests with it can’t add photos. Photos already added stay.'}
                  </p>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirming(null)}
                      className={BUTTON.quiet}
                    >
                      Keep it
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => (confirming === 'rotate' ? issue(true) : revoke())}
                      className="inline-flex min-h-8 items-center rounded-md bg-error px-3 text-label-md font-semibold text-on-error disabled:opacity-60"
                    >
                      {confirming === 'rotate' ? 'Make a new link' : 'Turn off link'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap justify-between gap-2 border-t border-outline-variant/40 pt-4">
                  <button
                    type="button"
                    onClick={() => setConfirming('rotate')}
                    className={BUTTON.quiet}
                  >
                    <Icon name="sync" className="size-4" />
                    New link
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming('revoke')}
                    className={BUTTON.quiet}
                  >
                    <Icon name="block" className="size-4" />
                    Turn off link
                  </button>
                </div>
              ))}
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface-container-low p-6 text-center">
            <Icon name="qr-code" className="size-10 text-secondary" />
            <p className="text-body-md text-on-surface-variant">
              {busy === 'issue'
                ? 'Making the link…'
                : writable
                  ? 'There is no upload link right now.'
                  : 'This wedding is archived, so guests can no longer upload.'}
            </p>
            {writable && busy !== 'issue' && (
              <button type="button" onClick={() => issue(false)} className={BUTTON.primary}>
                Create upload link
              </button>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <button type="button" onClick={() => dialog.current?.close()} className={BUTTON.primary}>
            Done
          </button>
        </div>
      </div>
    </dialog>
  );
}

/**
 * Emails the general link to guests: all with an email address, or only
 * those attending a ceremony. Each guest gets the same link, so turning it
 * off stops every emailed copy.
 */
function EmailGuests({ weddingId }: { weddingId: string }) {
  const [counts, setCounts] = useState<{ all: number; attending: number } | null>(null);
  const [audience, setAudience] = useState<'all' | 'attending'>('attending');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let current = true;
    void api
      .GET('/api/v1/weddings/{weddingId}/upload-links/email-audiences', {
        params: { path: { weddingId } },
      })
      .then(({ data }) => {
        if (current && data) setCounts(data.data);
      });
    return () => {
      current = false;
    };
  }, [weddingId]);

  async function send() {
    setSending(true);
    setResult(null);
    try {
      const { data, error, response } = await api.POST(
        '/api/v1/weddings/{weddingId}/upload-links/email',
        { params: { path: { weddingId } }, body: { audience } },
      );
      if (data) {
        const queued = data.data.queued;
        setResult(
          queued === 0
            ? {
                tone: 'error',
                text: 'No guests to email: add their email addresses on the Guests page.',
              }
            : {
                tone: 'success',
                text: `Sending to ${queued} ${queued === 1 ? 'guest' : 'guests'}.`,
              },
        );
      } else {
        setResult({ tone: 'error', text: toFailure(response.status, error).message });
      }
    } catch {
      setResult({ tone: 'error', text: networkFailure().message });
    }
    setSending(false);
  }

  const options = [
    { value: 'attending', label: 'Guests attending a ceremony', count: counts?.attending },
    { value: 'all', label: 'All guests with an email address', count: counts?.all },
  ] as const;

  return (
    <fieldset className="flex flex-col gap-3 rounded-xl border border-outline-variant/50 p-4">
      <legend className="px-1 text-label-md font-semibold text-on-surface">
        Email the link to guests
      </legend>
      {options.map((option) => (
        <label
          key={option.value}
          className="flex min-h-8 cursor-pointer items-center gap-3 text-body-md"
        >
          <input
            type="radio"
            name="photo-invite-audience"
            value={option.value}
            checked={audience === option.value}
            onChange={() => setAudience(option.value)}
            className="size-4 accent-primary"
          />
          <span className="flex-1">{option.label}</span>
          <span className="text-body-sm text-on-surface-variant">
            {option.count === undefined ? '…' : option.count}
          </span>
        </label>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-body-sm text-on-surface-variant">
          Each guest gets an email with this link.
        </p>
        <button
          type="button"
          onClick={send}
          disabled={sending || (counts !== null && counts[audience] === 0)}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-label-md font-semibold text-on-primary disabled:opacity-50"
        >
          <Icon name="mail" className="size-4" />
          {sending ? 'Sending…' : 'Send emails'}
        </button>
      </div>
      {result && (
        <p
          role={result.tone === 'error' ? 'alert' : 'status'}
          className={`text-body-sm ${result.tone === 'error' ? 'text-error' : 'text-primary'}`}
        >
          {result.text}
        </p>
      )}
    </fieldset>
  );
}
