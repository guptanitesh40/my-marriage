'use client';

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

export interface PreviewTab {
  id: string;
  label: string;
  panel: ReactNode;
}

/**
 * Accessible tabs (WAI-ARIA tabs pattern, automatic activation): arrow keys,
 * Home and End move between tabs. The only client component on the homepage;
 * panels are rendered on the server and passed in.
 */
export function PreviewTabs({ tabs, aside }: { tabs: PreviewTab[]; aside?: ReactNode }) {
  const [selected, setSelected] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const base = useId();

  function onKeyDown(event: KeyboardEvent) {
    const last = tabs.length - 1;
    const next =
      event.key === 'ArrowRight'
        ? selected === last
          ? 0
          : selected + 1
        : event.key === 'ArrowLeft'
          ? selected === 0
            ? last
            : selected - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    setSelected(next);
    buttons.current[next]?.focus();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-surface-container bg-surface-container-low px-4 pt-5 sm:px-6">
        <div
          role="tablist"
          aria-label="Planning previews"
          className="flex flex-wrap gap-1 sm:gap-3"
        >
          {tabs.map((tab, index) => {
            const active = index === selected;
            return (
              <button
                key={tab.id}
                ref={(element) => {
                  buttons.current[index] = element;
                }}
                type="button"
                role="tab"
                id={`${base}-tab-${tab.id}`}
                aria-selected={active}
                aria-controls={`${base}-panel-${tab.id}`}
                tabIndex={active ? 0 : -1}
                onClick={() => setSelected(index)}
                onKeyDown={onKeyDown}
                className={`rounded-t-base px-3 py-2.5 text-label-md transition-colors sm:px-4 ${
                  active
                    ? 'border-b-2 border-primary bg-surface-container-lowest font-semibold text-primary'
                    : 'border-b-2 border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        {aside}
      </div>
      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${base}-panel-${tab.id}`}
          aria-labelledby={`${base}-tab-${tab.id}`}
          hidden={index !== selected}
          tabIndex={0}
          className="p-6 md:p-8"
        >
          {tab.panel}
        </div>
      ))}
    </div>
  );
}
