import 'server-only';
import { ButtonLink } from '@/components/ui/button-link';
import { websitePath } from '@/lib/routes';
import { getWebsite, getWebsitePreview } from '@/lib/website/website';
import { getWedding } from '@/lib/weddings/workspace';
import { WebsiteBuilder } from './builder';

/**
 * The Wedding Website page (Stitch "Wedding Website Builder & Management").
 * The layout has already answered "not found" for anyone who is not a
 * member; the builder changes things only while the wedding is active.
 */
export async function WebsiteSection({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params;
  const [wedding, website, preview] = await Promise.all([
    getWedding(weddingId),
    getWebsite(weddingId),
    getWebsitePreview(weddingId),
  ]);
  if (wedding.kind !== 'ok') return null;

  if (website.kind !== 'ok' || preview.kind !== 'ok') {
    return (
      <section className="rounded-2xl bg-surface-container-lowest p-8 shadow-sm">
        <h1 className="text-title-md text-on-surface">We couldn’t load your website</h1>
        <p className="mt-2 text-body-md text-on-surface-variant">
          Something went wrong on our side. Your website is safe; please try again.
        </p>
        <ButtonLink href={websitePath(weddingId)} size="md" className="mt-5">
          Retry
        </ButtonLink>
      </section>
    );
  }

  return <WebsiteBuilder weddingId={weddingId} website={website} preview={preview.site} />;
}

export function WebsiteLoading() {
  return (
    <div className="flex flex-col gap-6">
      <p role="status" className="sr-only">
        Loading your website…
      </p>
      <div aria-hidden="true" className="grid gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl bg-surface-container-lowest" />
        ))}
      </div>
      <div
        aria-hidden="true"
        className="h-72 animate-pulse rounded-2xl bg-surface-container-lowest"
      />
    </div>
  );
}
