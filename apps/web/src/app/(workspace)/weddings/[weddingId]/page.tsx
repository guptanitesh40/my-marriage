import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OverviewIntro } from '@/components/dashboard/server';

export const metadata: Metadata = { title: 'Overview' };

export default function OverviewPage({ params }: PageProps<'/weddings/[weddingId]'>) {
  return (
    <Suspense fallback={null}>
      <OverviewIntro params={params} />
    </Suspense>
  );
}
