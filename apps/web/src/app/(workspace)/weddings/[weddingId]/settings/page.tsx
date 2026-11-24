import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SettingsLoading, SettingsSection } from '@/components/settings/server';

export const metadata: Metadata = { title: 'Settings' };

export default function SettingsPage({ params }: PageProps<'/weddings/[weddingId]/settings'>) {
  return (
    <Suspense fallback={<SettingsLoading />}>
      <SettingsSection params={params} />
    </Suspense>
  );
}
