'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Icon } from './icon';

/**
 * A modal on the native <dialog> (team and settings pages) (focus kept inside,
 * Escape closes, focus returns to what opened it). `side`: the Stitch
 * right-hand drawer, full height and full width on a phone. `center`: a
 * confirmation.
 */
export function Sheet({
  open,
  onClose,
  title,
  eyebrow,
  description,
  side = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  description?: string;
  side?: boolean;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      className={
        side
          ? 'm-0 ml-auto h-dvh max-h-none w-full max-w-none bg-surface-container-lowest p-0 text-on-surface shadow-2xl backdrop:bg-on-surface/40 sm:max-w-md'
          : 'm-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-surface-container-lowest p-0 text-on-surface shadow-xl backdrop:bg-on-surface/40'
      }
    >
      {open && (
        <div className={`flex flex-col gap-5 p-6 ${side ? 'min-h-full' : ''}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              {eyebrow && (
                <p className="text-label-sm font-semibold tracking-widest text-secondary uppercase">
                  {eyebrow}
                </p>
              )}
              <h2 id={titleId} className="mt-1 font-serif text-headline-sm">
                {title}
              </h2>
              {description && (
                <p className="mt-1 text-body-sm text-on-surface-variant">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="-m-1.5 rounded-full p-1.5 text-on-surface-variant hover:bg-surface-container"
            >
              <Icon name="close" className="size-5" label="Close" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

export const PRIMARY_BUTTON =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-label-md font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container disabled:opacity-60';
export const PLAIN_BUTTON =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-surface-container px-5 text-label-md font-semibold text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-60';
export const DANGER_BUTTON =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-error px-5 text-label-md font-semibold text-on-error transition-opacity hover:opacity-90 disabled:opacity-60';
export const OUTLINE_BUTTON =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-surface-container-lowest px-5 text-label-md font-semibold text-on-surface ring-1 ring-outline-variant transition-colors hover:bg-surface-container disabled:opacity-60';
