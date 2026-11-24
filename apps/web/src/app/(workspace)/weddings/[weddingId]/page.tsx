import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OverviewLoading, OverviewSection } from '@/components/dashboard/server';

export const metadata: Metadata = { title: 'Overview' };

export default function OverviewPage({ params }: PageProps<'/weddings/[weddingId]'>) {
  return (
    <Suspense fallback={<OverviewLoading />}>
      <OverviewSection params={params} />
    </Suspense>
  );
}
