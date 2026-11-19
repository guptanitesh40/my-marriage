import type { Metadata } from 'next';
import { Suspense } from 'react';
import { WeddingStep } from '@/components/onboarding/server';
import { StepLoading } from '@/components/onboarding/step-progress';

export const metadata: Metadata = { title: 'Create your wedding' };

/**
 * Onboarding step 1: create the wedding, or first join one you were invited
 * to. `?start=own` skips the invitations ("Start my own wedding instead").
 */
export default function CreateWeddingPage({ searchParams }: PageProps<'/onboarding'>) {
  return (
    <Suspense fallback={<StepLoading />}>
      <Step searchParams={searchParams} />
    </Suspense>
  );
}

async function Step({ searchParams }: Pick<PageProps<'/onboarding'>, 'searchParams'>) {
  const { start } = await searchParams;
  return <WeddingStep startOwn={start === 'own'} />;
}
