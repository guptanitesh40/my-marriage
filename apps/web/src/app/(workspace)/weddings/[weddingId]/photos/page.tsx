import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PhotosLoading, PhotosSection } from '@/components/photos/server';

export const metadata: Metadata = { title: 'Photos & Albums' };

export default function PhotosPage({
  params,
  searchParams,
}: PageProps<'/weddings/[weddingId]/photos'>) {
  return (
    <Suspense fallback={<PhotosLoading />}>
      <PhotosSection params={params} searchParams={searchParams} />
    </Suspense>
  );
}
