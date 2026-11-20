'use client';

import type { ReactNode, RefObject } from 'react';
import { Icon } from './icon';

/**
 * The right-hand drawer of the approved Stitch designs (Events, Tasks): a
 * native modal <dialog>, full height, full width on phones. Focus stays
 * inside while it is open, Escape closes it, and focus returns to the
 * button that opened it. Open it with `dialog.current.showModal()`.
 */
export function Drawer({
  dialog,
  titleId,
  eyebrow,
  title,
  description,
  wide = false,
  children,
}: {
  dialog: RefObject<HTMLDialogElement | null>;
  titleId: string;
  /** A small label above the title, e.g. "New ceremony". */
  eyebrow?: string;
  title: string;
  /** A sentence under the title. */
  description?: string;
  /** A little wider on larger screens, for details with a history. */
  wide?: boolean;
  /** The content, which fills the rest of the height. */
  children: ReactNode;
}) {
  const descriptionId = `${titleId}-description`;
  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={`m-0 ml-auto h-dvh max-h-none w-full max-w-none bg-surface-container-lowest p-0 text-on-surface shadow-xl backdrop:bg-on-surface/50 ${wide ? 'sm:max-w-lg' : 'sm:max-w-md'}`}
    >
      <div className="flex h-full flex-col">
        <header className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-label-sm font-semibold tracking-widest text-secondary uppercase">
                {eyebrow}
              </p>
            )}
            <h2
              id={titleId}
              className="font-serif text-headline-md wrap-break-word text-on-surface"
            >
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-body-sm text-on-surface-variant">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
          >
            <Icon name="close" className="size-5" label="Close" />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
