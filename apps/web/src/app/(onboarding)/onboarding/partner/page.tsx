import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PartnerStep } from '@/components/onboarding/server';
import { StepLoading } from '@/components/onboarding/step-progress';

export const metadata: Metadata = { title: 'Invite your partner' };

/** Onboarding step 2: invite your partner (optional). */
export default function InvitePartnerPage() {
  return (
    <Suspense fallback={<StepLoading />}>
      <PartnerStep />
    </Suspense>
  );
}
