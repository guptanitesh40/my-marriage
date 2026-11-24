'use client';

import type { components } from '@my-marriage/contracts';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { routes, workspacePath } from '@/lib/routes';
import { coupleName, placeAndYear, roleLabel, statusLabel } from '@/lib/weddings/format';

type Wedding = components['schemas']['WeddingDto'];

/**
 * The wedding card at the top of the workspace (Stitch "Team &
 * Collaboration", sidebar): the current wedding and your role, and — as
 * anyone may own or help plan several weddings (decision 0020) — the
 * others to switch to, and a new one to start.
 */
export function WeddingSwitcher({
  wedding,
  weddings,
  compact = false,
}: {
  wedding: Wedding;
  weddings: readonly Wedding[];
  /** The top bar's small version, for phones. */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const others = weddings.filter((other) => other.id !== wedding.id);

  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setOpen(false);
      button.current?.focus();
    }
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className={
          compact
            ? 'flex max-w-full min-w-0 items-center gap-2 rounded-lg border border-surface-container-highest bg-surface-container-lowest px-3 py-1.5 text-left shadow-sm'
            : 'flex w-full items-center justify-between gap-2 rounded-lg border border-surface-container-highest/60 bg-surface-container p-2 text-left transition-colors hover:bg-surface-container-high'
        }
      >
        <span className="min-w-0">
          <span className="block truncate text-title-sm text-on-surface">
            <span className="sr-only">Wedding: </span>
            {coupleName(wedding)}
          </span>
          {!compact && (
            <span className="mt-0.5 flex items-center gap-1.5 text-label-sm tracking-wider text-on-surface-variant uppercase">
              <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
              <span>
                <span className="sr-only">Your role: </span>
                {roleLabel(wedding.role)}
              </span>
            </span>
          )}
        </span>
        <Icon
          name="unfold-more"
          className="size-4.5 shrink-0 text-on-surface-variant"
          label="Switch wedding"
        />
      </button>

      {open && (
        <div
          id={panelId}
          className={`absolute z-50 mt-1.5 flex flex-col gap-1 rounded-xl bg-surface-container-lowest p-2 shadow-xl ring-1 ring-outline-variant/50 ${compact ? 'left-0 w-[min(20rem,calc(100vw-2.5rem))]' : 'inset-x-0'}`}
        >
          <p className="px-2 pt-1 text-label-sm tracking-wider text-on-surface-variant uppercase">
            Your weddings
          </p>
          <ul className="flex flex-col gap-0.5">
            {[wedding, ...others].map((item) => {
              const status = statusLabel(item.status);
              const current = item.id === wedding.id;
              return (
                <li key={item.id}>
                  <Link
                    href={workspacePath(item.id)}
                    aria-current={current ? 'page' : undefined}
                    onClick={() => setOpen(false)}
                    className={`flex items-center justify-between gap-2 rounded-lg px-2 py-2 transition-colors ${
                      current ? 'bg-primary-fixed/50' : 'hover:bg-surface-container'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-title-sm text-on-surface">
                        {coupleName(item)}
                      </span>
                      <span className="block truncate text-body-sm text-on-surface-variant">
                        {placeAndYear(item)}
                        {status ? ` · ${status}` : ''}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-surface-container-high px-2 py-0.5 text-label-sm text-on-surface-variant">
                      {roleLabel(item.role)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link
            href={routes.onboardingNewWedding}
            className="mt-1 flex items-center gap-2 rounded-lg border-t border-surface-container-high px-2 pt-2.5 pb-2 text-label-md font-semibold text-primary hover:bg-surface-container"
          >
            <Icon name="add" className="size-4.5" />
            Start another wedding
          </Link>
        </div>
      )}
    </div>
  );
}
