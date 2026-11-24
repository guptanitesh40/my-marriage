import type { ReactNode } from 'react';
import { SiteFooterContent } from '@/components/home/site-footer-content';
import { SiteHeader } from '@/components/home/site-header';
import { Icon, type IconName } from '@/components/ui/icon';
import { container } from '@/components/ui/layout';

/**
 * The page shown when something is missing (404) or went wrong (500), in
 * the site's look: the public header and footer around one calm message.
 * It never shows what failed: no message, stack or request detail, only an
 * opaque `reference` (Next's error digest) someone can quote when
 * reporting it, which matches the server's log entry. Renders on the server or in the browser, so the
 * error boundaries can use it.
 */
export function ErrorPage({
  status,
  icon,
  eyebrow,
  title,
  body,
  actions,
  reference,
  headerActions,
  year,
}: {
  status: '404' | '500';
  icon: IconName;
  eyebrow: string;
  title: string;
  body: string;
  actions: ReactNode;
  reference?: string | undefined;
  /** The header's account area; the plain "Log in" when left out. */
  headerActions?: ReactNode;
  /** The footer's year: cached on the server, or read in the browser. */
  year: ReactNode;
}) {
  return (
    <>
      <a
        href="#main"
        className="sr-only z-[60] rounded-md bg-primary px-4 py-2 text-label-md font-semibold text-on-primary focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      {headerActions === undefined ? <SiteHeader /> : <SiteHeader actions={headerActions} />}
      <main id="main" className="relative w-full flex-1 overflow-x-clip bg-surface">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full bg-secondary-container/25 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-24 size-96 rounded-full bg-primary-fixed/30 blur-3xl"
        />
        <section
          className={`${container} relative flex flex-col items-center py-16 text-center sm:py-24`}
        >
          {/* Drawn by CSS: purely decorative, and not page text, so it may be faint. */}
          <div
            aria-hidden="true"
            data-status={status}
            className="font-serif text-[7rem] leading-none tracking-tight text-primary/15 italic select-none before:content-[attr(data-status)] sm:text-[10rem]"
          />
          <span className="-mt-10 flex size-16 items-center justify-center rounded-full bg-surface-container-lowest text-primary shadow-md ring-1 ring-outline-variant/40 sm:-mt-14">
            <Icon name={icon} className="size-8" />
          </span>
          <p className="mt-6 inline-flex items-center gap-2 text-label-sm font-semibold tracking-[0.18em] text-secondary uppercase">
            <span className="size-1.5 rounded-full bg-primary-container" aria-hidden="true" />
            {eyebrow}
          </p>
          <h1 className="mt-3 max-w-2xl font-serif text-headline-lg-mobile text-on-surface sm:text-headline-lg">
            {title}
          </h1>
          <p className="mt-4 max-w-xl text-body-lg text-on-surface-variant">{body}</p>
          <div className="mt-8 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
            {actions}
          </div>
          {reference && (
            <p className="mt-10 text-body-sm text-on-surface-variant">
              If this keeps happening, mention this reference when you report it:{' '}
              <code className="rounded-sm bg-surface-container px-1.5 py-0.5 font-mono text-label-md text-on-surface">
                {reference}
              </code>
            </p>
          )}
        </section>
      </main>
      <SiteFooterContent year={year} />
    </>
  );
}
