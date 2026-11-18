import Link from 'next/link';
import { ButtonLink } from '@/components/ui/button-link';
import { container } from '@/components/ui/layout';
import { Wordmark } from '@/components/ui/wordmark';
import { homeSection, homeSections, routes } from '@/lib/routes';

const NAV = [
  { label: 'Features', href: homeSection(homeSections.features) },
  { label: 'How it works', href: homeSection(homeSections.howItWorks) },
  { label: 'Wedding websites', href: homeSection(homeSections.weddingWebsites) },
  { label: 'FAQ', href: homeSection(homeSections.faq) },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-surface-container-highest bg-surface/90 backdrop-blur-xl">
      <div className={`${container} flex h-20 items-center justify-between gap-6`}>
        <Wordmark />
        {/* Section links are hidden on phones, as in the design: no menu
            button, so the header needs no client-side JavaScript. */}
        <nav aria-label="Main" className="hidden items-center gap-9 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-sm text-body-md text-on-surface-variant transition-colors hover:text-on-surface"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <Link
            href={routes.login}
            className="rounded-sm px-1 py-2 text-label-md font-semibold text-on-surface-variant transition-colors hover:text-on-surface"
          >
            Log in
          </Link>
          {/* Wrapped: the button's own display class would override `hidden`. */}
          <div className="hidden sm:block">
            <ButtonLink href={routes.login} size="md">
              Start planning free
            </ButtonLink>
          </div>
        </div>
      </div>
    </header>
  );
}
