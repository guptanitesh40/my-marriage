'use client';

import { useEffect, useRef, useState } from 'react';
import { rsvpFonts } from '@/components/rsvp/rsvp-fonts';
import { Icon } from '@/components/ui/icon';
import { publicSitePath } from '@/lib/routes';
import type { Site } from '@/lib/website/site';
import { WeddingSite } from './site/wedding-site';

// Desktop is drawn at 1024px, where every design shows its desktop layout, so the
// shrunk preview stays readable beside the editor.
const WIDTHS = { desktop: 1024, mobile: 390 } as const;
type Device = keyof typeof WIDTHS;

/**
 * The builder's live preview (Stitch "Wedding Website Builder"): the real
 * website in the chosen design, with the edits not yet saved, drawn at a
 * desktop's or a phone's width and scaled to fit. Nothing in it can be
 * used or focused; "Preview website" opens the full page.
 */
export function LivePreview({ site }: { site: Site }) {
  const [device, setDevice] = useState<Device>('desktop');
  const frame = useRef<HTMLDivElement>(null);
  // Unknown until measured: nothing is drawn wider than the space it has.
  const [room, setRoom] = useState(0);

  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setRoom(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const width = WIDTHS[device];
  const scale = Math.min(1, room / width);
  return (
    <section aria-label="Live preview" className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-2xl bg-surface-container-lowest px-4 py-3 shadow-sm">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-label-sm text-on-surface-variant">
          <span aria-hidden="true" className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-error" />
            <span className="size-2.5 rounded-full bg-secondary" />
            <span className="size-2.5 rounded-full bg-primary" />
          </span>
          <span className="ml-1">Live preview ·</span>
          <span className="rounded bg-surface-container px-1.5 py-0.5 font-semibold text-primary">
            {publicSitePath(site.slug)}
          </span>
          <span>(Private organizer preview)</span>
        </p>
        <div
          role="radiogroup"
          aria-label="Preview size"
          className="flex w-fit gap-1 rounded-md bg-surface-container p-1"
        >
          {(['desktop', 'mobile'] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={device === option}
              onClick={() => setDevice(option)}
              className={`flex items-center gap-1.5 rounded px-3 py-1 text-label-md font-semibold transition-colors ${
                device === option
                  ? 'bg-surface-container-lowest text-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Icon
                name={option === 'desktop' ? 'desktop-windows' : 'smartphone'}
                className="size-4"
              />
              {option === 'desktop' ? 'Desktop' : 'Mobile 390px'}
            </button>
          ))}
        </div>
      </div>

      <div ref={frame} className="w-full">
        <div
          hidden={room === 0}
          tabIndex={0}
          role="group"
          aria-label="Website preview (scrolls)"
          className="mx-auto h-[46rem] overflow-x-hidden overflow-y-auto rounded-2xl bg-surface shadow-lg ring-1 ring-outline-variant/40"
          style={{ width: width * scale }}
        >
          <div
            inert
            style={{ width, zoom: scale }}
            className={`${rsvpFonts} flex min-h-full flex-col`}
          >
            <WeddingSite site={site} />
            <p className="flex items-center justify-center gap-2 bg-surface-container-low px-4 py-3 text-label-sm text-on-surface-variant">
              <Icon name="lock" className="size-4" />
              Private preview mode — not seen by guests or search engines.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
