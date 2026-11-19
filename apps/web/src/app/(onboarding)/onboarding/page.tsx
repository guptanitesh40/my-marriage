import type { Metadata } from 'next';
import { Suspense } from 'react';
import { WeddingStep } from '@/components/onboarding/server';
import { StepLoading } from '@/components/onboarding/step-progress';

export const metadata: Metadata = { title: 'Create your wedding' };

/** Onboarding step 1: create the wedding. */
export default function CreateWeddingPage() {
  return (
    <Suspense fallback={<StepLoading />}>
      <WeddingStep />
    </Suspense>
  );
}
