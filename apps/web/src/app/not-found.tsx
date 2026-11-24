import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ErrorPage } from '@/components/errors/error-page';
import { CopyrightYear } from '@/components/home/copyright-year';
import { HeaderAccount, HeaderAccountPlaceholder } from '@/components/home/header-account';
import { ButtonLink } from '@/components/ui/button-link';
import { routes } from '@/lib/routes';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
};

/** Any address that isn't a page (404), and every `notFound()`. */
export default function NotFound() {
  return (
    <ErrorPage
      status="404"
      icon="search"
      eyebrow="Page not found"
      title="We couldn’t find that page"
      body="The link may be mistyped, or the page may have moved. Check the address, or start again from the home page."
      year={<CopyrightYear />}
      headerActions={
        <Suspense fallback={<HeaderAccountPlaceholder />}>
          <HeaderAccount />
        </Suspense>
      }
      actions={
        <>
          <ButtonLink href={routes.home}>Back to home</ButtonLink>
          <ButtonLink href={routes.dashboard} variant="secondary">
            Go to your dashboard
          </ButtonLink>
        </>
      }
    />
  );
}
