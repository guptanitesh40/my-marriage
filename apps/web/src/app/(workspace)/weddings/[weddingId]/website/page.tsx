import type { Metadata } from 'next';
import { Suspense } from 'react';
import { WebsiteLoading, WebsiteSection } from '@/components/website/server';

export const metadata: Metadata = { title: 'Wedding Website' };

export default function WebsitePage({ params }: PageProps<'/weddings/[weddingId]/website'>) {
  return (
    <Suspense fallback={<WebsiteLoading />}>
      <WebsiteSection params={params} />
    </Suspense>
  );
}
