import type { Metadata } from 'next';
import { Suspense } from 'react';
import { VendorsLoading, VendorsSection } from '@/components/vendors/server';

export const metadata: Metadata = { title: 'Vendors' };

export default function VendorsPage({
  params,
  searchParams,
}: PageProps<'/weddings/[weddingId]/vendors'>) {
  return (
    <Suspense fallback={<VendorsLoading />}>
      <VendorsSection params={params} searchParams={searchParams} />
    </Suspense>
  );
}
