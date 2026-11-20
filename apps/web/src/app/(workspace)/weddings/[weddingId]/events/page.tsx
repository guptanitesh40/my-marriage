import type { Metadata } from 'next';
import { Suspense } from 'react';
import { EventsLoading, EventsSection } from '@/components/events/server';

export const metadata: Metadata = { title: 'Events' };

export default function EventsPage({ params }: PageProps<'/weddings/[weddingId]/events'>) {
  return (
    <Suspense fallback={<EventsLoading />}>
      <EventsSection params={params} />
    </Suspense>
  );
}
