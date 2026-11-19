import { Suspense } from 'react';
import { HeaderAccount, HeaderAccountPlaceholder } from '@/components/home/header-account';
import { SiteFooter } from '@/components/home/site-footer';
import { SiteHeader } from '@/components/home/site-header';

/** Shell for the public pages: homepage, privacy and terms. */
export default function PublicLayout({ children }: LayoutProps<'/'>) {
  return (
    <>
      <a
        href="#main"
        className="sr-only z-[60] rounded-md bg-primary px-4 py-2 text-label-md font-semibold text-on-primary focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <SiteHeader
        actions={
          <Suspense fallback={<HeaderAccountPlaceholder />}>
            <HeaderAccount />
          </Suspense>
        }
      />
      {/* Clip (not hide) sideways overflow from decorative shapes: no horizontal
          scroll at 360px, and sticky positioning keeps working. */}
      <main id="main" className="w-full flex-1 overflow-x-clip">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
