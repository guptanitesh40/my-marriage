import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import { Suspense } from 'react';
import { rsvpFonts } from '@/components/rsvp/rsvp-fonts';
import { PageLoader } from '@/components/ui/page-loader';
import { ForwardInvitationLink } from '@/components/website/site/forward-invitation';
import { SiteUnavailable } from '@/components/website/site/unavailable';
import { WeddingSite } from '@/components/website/site/wedding-site';
import { serverApi } from '@/lib/api/server';
import { publicSitePath } from '@/lib/routes';

// Not in search results by default (decision 0017, D9).
export const metadata: Metadata = {
  title: 'Wedding website',
  robots: { index: false, follow: false },
};

/**
 * A published wedding website, for anyone with its address (PRD SITE-03).
 * Asked of the API on every visit, so unpublishing takes effect at once;
 * an old address moves to the current one.
 */
export default function PublicWeddingPage({ params }: PageProps<'/w/[slug]'>) {
  return (
    <Suspense fallback={<PageLoader label="Opening the wedding website…" fill />}>
      <PublishedSite params={params} />
    </Suspense>
  );
}

async function PublishedSite({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let site;
  let gallery;
  try {
    const api = await serverApi();
    const [found, albums] = await Promise.all([
      api.GET('/api/v1/public/weddings/{slug}', { params: { path: { slug } } }),
      api.GET('/api/v1/public/weddings/{slug}/albums', { params: { path: { slug } } }),
    ]);
    site = found.data?.data;
    gallery = albums.data?.data.albums;
  } catch {
    site = undefined;
  }
  if (!site) {
    return (
      <>
        <ForwardInvitationLink />
        <SiteUnavailable />
      </>
    );
  }
  // An old address keeps a private link's secret: it is after #, which
  // browsers carry over a redirect.
  if (site.slug !== slug) permanentRedirect(publicSitePath(site.slug));
  return (
    <div className={`${rsvpFonts} flex flex-1 flex-col`}>
      <WeddingSite site={site} {...(gallery ? { gallery } : {})} />
    </div>
  );
}
