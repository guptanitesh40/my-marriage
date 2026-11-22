import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AlbumLoading, AlbumSection } from '@/components/photos/server';

export const metadata: Metadata = { title: 'Album' };

export default function AlbumPage({
  params,
}: PageProps<'/weddings/[weddingId]/photos/albums/[albumId]'>) {
  return (
    <Suspense fallback={<AlbumLoading />}>
      <AlbumSection params={params} />
    </Suspense>
  );
}
