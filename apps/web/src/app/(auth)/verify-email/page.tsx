import type { Metadata } from 'next';
import { Suspense } from 'react';
import { InboxPanel } from '@/components/auth/server';
import { VerifyEmailFlow } from '@/components/auth/verify-email-flow';

export const metadata: Metadata = { title: 'Verify your email' };

export default function VerifyEmailPage() {
  return (
    <VerifyEmailFlow
      inbox={
        <Suspense
          fallback={<p className="text-body-md text-on-surface-variant">Loading your account…</p>}
        >
          <InboxPanel />
        </Suspense>
      }
    />
  );
}
