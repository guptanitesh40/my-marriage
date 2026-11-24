import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TeamLoading, TeamSection } from '@/components/team/server';

export const metadata: Metadata = { title: 'Team & Family' };

export default function TeamPage({ params }: PageProps<'/weddings/[weddingId]/team'>) {
  return (
    <Suspense fallback={<TeamLoading />}>
      <TeamSection params={params} />
    </Suspense>
  );
}
