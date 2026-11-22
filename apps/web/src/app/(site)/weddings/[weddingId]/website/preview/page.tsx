import type { Metadata } from 'next';
import { Suspense } from 'react';
import { WebsitePreview, WebsitePreviewLoading } from '@/components/website/preview';

export const metadata: Metadata = {
  title: 'Website preview',
  robots: { index: false, follow: false },
};

/**
 * The website preview, full page: outside the workspace shell so it looks
 * exactly as guests will see it.
 */
export default function WebsitePreviewPage({
  params,
  searchParams,
}: PageProps<'/weddings/[weddingId]/website/preview'>) {
  return (
    <Suspense fallback={<WebsitePreviewLoading />}>
      <WebsitePreview params={params} searchParams={searchParams} />
    </Suspense>
  );
}
