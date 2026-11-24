import Link from 'next/link';
import type { ReactNode } from 'react';
import { container } from '@/components/ui/layout';
import { Wordmark } from '@/components/ui/wordmark';
import { footer } from '@/content/home/copy';
import { homeSection, homeSections, routes } from '@/lib/routes';

const LINKS = [
  { label: 'Features', href: homeSection(homeSections.features) },
  { label: 'Wedding websites', href: homeSection(homeSections.weddingWebsites) },
  { label: 'How it works', href: homeSection(homeSections.howItWorks) },
  { label: 'Privacy', href: routes.privacy },
  { label: 'Terms', href: routes.terms },
];

/**
 * The site footer's content. `year` is passed in because the public pages
 * render it as a cached Server Component (`SiteFooter`), while the error
 * pages, which run in the browser, cannot.
 */
export function SiteFooterContent({ year }: { year: ReactNode }) {
  return (
    <footer className="mt-auto w-full border-t border-surface-container-highest bg-surface-container-low">
      <div className={`${container} py-9`}>
        <div className="mb-9 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="max-w-md">
            <div className="mb-1">
              <Wordmark />
            </div>
            <p className="text-body-md text-on-surface-variant">{footer.tagline}</p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-sm text-body-sm text-on-surface-variant transition-colors hover:text-on-surface"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex flex-col items-center justify-between gap-2 border-t border-surface-container-highest/60 pt-4 text-body-sm text-on-surface-variant sm:flex-row">
          <span>© {year} My Marriage. All rights reserved.</span>
          <span>{footer.signoff}</span>
        </div>
      </div>
    </footer>
  );
}
