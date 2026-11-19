import Link from 'next/link';
import type { ReactNode } from 'react';
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

/**
 * "Log in" and "Start planning free", for visitors who are not signed in.
 * `prefetch={false}` while it is only a placeholder: the sign-in page would
 * redirect a visitor who turns out to be signed in.
 */
export function SignedOutActions({ prefetch }: { prefetch?: false }) {
  return (
    <>
      <Link
        href={routes.login}
        prefetch={prefetch}
        className="rounded-sm px-1 py-2 text-label-md font-semibold text-on-surface-variant transition-colors hover:text-on-surface"
      >
        Log in
      </Link>
      {/* Wrapped: the button's own display class would override `hidden`. */}
      <div className="hidden sm:block">
        <ButtonLink href={routes.login} size="md" prefetch={prefetch}>
          Start planning free
        </ButtonLink>
      </div>
    </>
  );
}

/**
 * `actions` is the account area at the right; the public layout passes one
 * that depends on who is visiting.
 */
export function SiteHeader({ actions = <SignedOutActions /> }: { actions?: ReactNode }) {
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
        <div className="flex items-center gap-4">{actions}</div>
      </div>
    </header>
  );
}
