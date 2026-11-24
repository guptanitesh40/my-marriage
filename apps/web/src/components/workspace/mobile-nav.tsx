'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';

/**
 * The workspace sections on phones and tablets, where the sidebar is
 * hidden: a Menu button in the top bar opens them in a drawer from the
 * left, on the native <dialog> (focus kept inside, Escape closes it,
 * focus returns to the button). Choosing a section closes it.
 */
export function MobileNav({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // The page it was opened on: once a section is chosen, the address
  // changes and the drawer counts as closed.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const setOpen = (value: boolean) => setOpenedOn(value ? pathname : null);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="flex size-11 shrink-0 items-center justify-center rounded-lg text-on-surface hover:bg-surface-container"
      >
        <Icon name="menu" className="size-6" label="Menu" />
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        // Clicking the backdrop (the dialog itself, outside its panel) closes it.
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
        className="m-0 mr-auto h-dvh max-h-none w-[min(20rem,calc(100%-3rem))] max-w-none bg-surface-container-low p-0 text-on-surface shadow-2xl backdrop:bg-on-surface/40"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 shrink-0 items-center justify-between gap-2 px-4">
            <h2 id={titleId} className="font-serif text-headline-sm text-primary">
              Menu
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex size-11 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container"
            >
              <Icon name="close" className="size-5" label="Close menu" />
            </button>
          </div>
          {open && (
            <div
              className="flex min-h-0 flex-1 flex-col overflow-y-auto"
              // Also for the page already open, where the address stays the same.
              onClick={(event) => {
                if ((event.target as Element).closest('a')) setOpen(false);
              }}
            >
              {children}
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}
