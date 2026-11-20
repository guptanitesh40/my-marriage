import type { Metadata } from 'next';
import { Suspense } from 'react';
import { GuestsLoading, GuestsSection } from '@/components/guests/server';

export const metadata: Metadata = { title: 'Guests & RSVP' };

export default function GuestsPage({
  params,
  searchParams,
}: PageProps<'/weddings/[weddingId]/guests'>) {
  return (
    <Suspense fallback={<GuestsLoading />}>
      <GuestsSection params={params} searchParams={searchParams} />
    </Suspense>
  );
}
