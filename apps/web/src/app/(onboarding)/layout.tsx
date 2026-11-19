import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { SignOutButton } from '@/components/auth/sign-out-button';
import { AccountChip } from '@/components/onboarding/server';
import { container } from '@/components/ui/layout';
import { LogoMark } from '@/components/ui/logo-mark';
import { routes } from '@/lib/routes';

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Shell for wedding onboarding (the Stitch "Onboarding Flow" design): the
 * brand with "Workspace setup", who is signed in, and one narrow column.
 * Like the other signed-in pages, each page asks the API who is visiting.
 */
export default function OnboardingLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex w-full flex-1 flex-col bg-surface">
      <header className="w-full bg-surface-container-low">
        <div className={`${container} flex h-20 items-center justify-between gap-4`}>
          <Link href={routes.home} className="flex items-center gap-3 rounded-base">
            <LogoMark className="size-10" />
            <span className="flex flex-col">
              <span className="font-serif text-headline-sm leading-none tracking-tight text-on-surface">
                My Marriage
              </span>
              <span className="mt-1 text-label-sm tracking-widest text-secondary uppercase">
                Workspace setup
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Suspense fallback={null}>
              <AccountChip />
            </Suspense>
            <SignOutButton variant="link" />
          </div>
        </div>
      </header>
      <main id="main" className="flex w-full flex-1 justify-center px-4 py-8 sm:px-6 md:py-14">
        <div className="w-full max-w-160">{children}</div>
      </main>
    </div>
  );
}
