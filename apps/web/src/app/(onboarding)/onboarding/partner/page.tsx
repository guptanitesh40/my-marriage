import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PartnerStep } from '@/components/onboarding/server';
import { StepLoading } from '@/components/onboarding/step-progress';

export const metadata: Metadata = { title: 'Invite your partner' };

/** Onboarding step 2: invite your partner (optional), for `?wedding=` or your own wedding. */
export default function InvitePartnerPage({ searchParams }: PageProps<'/onboarding/partner'>) {
  return (
    <Suspense fallback={<StepLoading />}>
      <Step searchParams={searchParams} />
    </Suspense>
  );
}

async function Step({ searchParams }: Pick<PageProps<'/onboarding/partner'>, 'searchParams'>) {
  const { wedding } = await searchParams;
  return <PartnerStep {...(typeof wedding === 'string' ? { weddingId: wedding } : {})} />;
}
