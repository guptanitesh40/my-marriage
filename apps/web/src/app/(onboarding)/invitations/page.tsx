import type { Metadata } from 'next';
import { Suspense } from 'react';
import { InvitationsStep } from '@/components/onboarding/server';
import { StepLoading } from '@/components/onboarding/step-progress';

export const metadata: Metadata = { title: 'Your invitations' };

/** The invitations waiting for the signed-in account, to accept or decline. */
export default function InvitationsPage() {
  return (
    <Suspense fallback={<StepLoading />}>
      <InvitationsStep />
    </Suspense>
  );
}
