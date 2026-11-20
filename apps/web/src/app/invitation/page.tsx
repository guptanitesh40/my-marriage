import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RsvpPage, RsvpOpening } from '@/components/rsvp/rsvp-page';
import { getInvitation } from '@/lib/guests/guests';

/**
 * A guest's private invitation (PRD INV-02, INV-09, INV-10). Nothing about
 * the guest goes into the title or metadata, search engines are kept out,
 * and no Referer is sent from it.
 */
export const metadata: Metadata = {
  title: 'Your invitation',
  description: 'A private wedding invitation.',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function InvitationPage() {
  return (
    <Suspense fallback={<RsvpOpening />}>
      <Invitation />
    </Suspense>
  );
}

async function Invitation() {
  const result = await getInvitation();
  return (
    <RsvpPage
      view={result.kind === 'ok' ? result.view : null}
      unreachable={result.kind === 'unavailable'}
    />
  );
}
