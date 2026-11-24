import { LogoMark } from './logo-mark';

/**
 * What a page shows while it waits for its data, instead of a blank
 * screen: the brand mark in a slowly turning ring, and what is loading.
 * Announced to screen readers; the motion stops for people who ask for
 * reduced motion. `fill` takes the whole height it is given (a workspace
 * or a page); otherwise it sits in the flow with some room.
 */
export function PageLoader({ label, fill = false }: { label: string; fill?: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex w-full flex-col items-center justify-center gap-5 bg-surface px-5 text-center ${
        fill ? 'min-h-[60vh] flex-1' : 'py-16'
      }`}
    >
      <span className="relative flex size-20 items-center justify-center">
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full border-2 border-surface-container-high border-t-primary motion-safe:animate-spin motion-safe:[animation-duration:1.1s]"
        />
        <LogoMark className="size-11 motion-safe:animate-pulse" />
      </span>
      <p className="font-serif text-title-md text-on-surface-variant italic">{label}</p>
    </div>
  );
}
