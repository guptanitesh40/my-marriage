import type { Metadata } from 'next';
import Link from 'next/link';
import { CopyrightYear } from '@/components/home/copyright-year';
import { Icon } from '@/components/ui/icon';
import { container } from '@/components/ui/layout';
import { Wordmark } from '@/components/ui/wordmark';
import { routes } from '@/lib/routes';

// Account screens are not content: keep them out of search results.
export const metadata: Metadata = { robots: { index: false, follow: false } };

const linkClass =
  'rounded-sm text-body-sm text-on-surface-variant transition-colors hover:text-on-surface';

/** Shell for sign-in, signup and recovery (docs/design/login): logo, a card, legal links. */
export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex w-full flex-1 flex-col bg-surface-container-low">
      <header className="w-full">
        <div className={`${container} flex h-20 items-center justify-between gap-4`}>
          <Wordmark />
          <Link
            href={routes.home}
            className="inline-flex items-center gap-1.5 rounded-sm text-label-md font-semibold text-on-surface-variant transition-colors hover:text-on-surface"
          >
            <Icon name="arrow-back" className="size-4" />
            Back to home
          </Link>
        </div>
      </header>
      <main
        id="main"
        className="flex w-full flex-1 items-center justify-center px-4 py-10 sm:py-16"
      >
        {children}
      </main>
      <footer className="w-full border-t border-surface-container-highest">
        <div
          className={`${container} flex flex-col items-center justify-between gap-3 py-6 text-body-sm text-on-surface-variant sm:flex-row`}
        >
          <span>
            © <CopyrightYear /> My Marriage. All rights reserved.
          </span>
          <nav aria-label="Legal" className="flex items-center gap-5">
            <Link href={routes.privacy} className={linkClass}>
              Privacy Policy
            </Link>
            <Link href={routes.terms} className={linkClass}>
              Terms of Use
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
