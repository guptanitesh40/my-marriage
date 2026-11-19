import type { Metadata } from 'next';
import { SignOutButton } from '@/components/auth/sign-out-button';
import { container } from '@/components/ui/layout';
import { Wordmark } from '@/components/ui/wordmark';

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Shell for signed-in pages. It does not check the session itself: each
 * page asks the API who is signed in, inside a <Suspense> boundary, and the
 * API enforces access on every request regardless.
 */
export default function AppLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex w-full flex-1 flex-col bg-surface-container-low">
      <header className="w-full border-b border-surface-container-highest bg-surface">
        <div className={`${container} flex h-20 items-center justify-between gap-4`}>
          <Wordmark />
          <SignOutButton />
        </div>
      </header>
      <main id="main" className={`${container} flex-1 py-12 sm:py-16`}>
        {children}
      </main>
    </div>
  );
}
