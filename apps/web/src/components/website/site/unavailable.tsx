import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { LogoMark } from '@/components/ui/logo-mark';
import { routes } from '@/lib/routes';

/**
 * A wedding website that can't be shown (Stitch "Public Wedding Site — Not
 * Available"): a wrong address, a site never published, or one taken down.
 * It says the same thing in every case, so nothing about a wedding leaks.
 */
export function SiteUnavailable() {
  return (
    <div className="flex flex-1 flex-col justify-between bg-surface text-on-surface">
      <header className="flex items-center justify-center px-6 pt-8 pb-4">
        <Link
          href={routes.home}
          className="inline-flex items-center gap-2 rounded-full px-2 py-1 transition-opacity hover:opacity-85"
        >
          <LogoMark className="size-7" />
          <span className="font-serif text-[19px] font-medium tracking-tight text-primary">
            My Marriage
          </span>
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-[390px] flex-1 flex-col items-center justify-center px-6 py-8 text-center">
        <div className="flex w-full flex-col items-center rounded-3xl border border-outline-variant/50 bg-surface-container-lowest p-7 shadow-[0_4px_24px_rgba(24,69,57,0.03)] sm:p-8">
          <span
            aria-hidden="true"
            className="mb-6 flex size-16 items-center justify-center rounded-full border border-outline-variant/40 bg-surface-container-low text-secondary"
          >
            <Icon name="link-off" className="size-7" />
          </span>
          <h1 className="mb-3 font-serif text-[26px] leading-[1.25] font-normal tracking-tight text-on-surface">
            This wedding website isn’t available
          </h1>
          <p className="mb-5 max-w-[290px] text-[15px] leading-relaxed text-on-surface-variant">
            The address may be mistyped, or the couple hasn’t published their website yet.
          </p>
          <p aria-hidden="true" className="mb-5 flex items-center gap-1.5 opacity-40">
            <span className="size-1 rounded-full bg-secondary" />
            <span className="size-1.5 rotate-45 border border-secondary" />
            <span className="size-1 rounded-full bg-secondary" />
          </p>
          <p className="mb-6 flex w-full items-start gap-3 rounded-2xl border border-outline-variant/40 bg-surface-container-low/90 p-4 text-left text-[13px] leading-normal text-on-surface-variant">
            <Icon name="lock" className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              <span className="font-semibold text-on-surface">Invited to this wedding?</span> Use
              the private invitation link the couple sent you to RSVP or view your schedule.
            </span>
          </p>
          <Link
            href={routes.home}
            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[14px] font-semibold text-primary transition-colors hover:bg-surface-container-low"
          >
            Go to My Marriage
            <Icon name="arrow-forward" className="size-4" />
          </Link>
        </div>
        <p className="mt-6 flex items-center gap-1.5 text-[12px] text-on-surface-variant">
          <Icon name="shield" className="size-3.5" />
          Private &amp; secure wedding directory
        </p>
      </main>

      <footer className="flex flex-col items-center gap-1 px-6 pt-4 pb-8 text-center">
        <p className="text-[12px] text-on-surface-variant">
          Modern wedding planning for India &amp; beyond
        </p>
        <p className="text-[11px] font-medium tracking-wider text-on-surface-variant uppercase">
          Made with My Marriage
        </p>
      </footer>
    </div>
  );
}
