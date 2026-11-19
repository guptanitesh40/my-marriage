import type { Metadata } from 'next';
import { AcceptInvitation } from '@/components/onboarding/accept-invitation';

export const metadata: Metadata = { title: 'Accept your invitation' };

/** Where the partner invitation email leads (`#token=…`). */
export default function AcceptInvitationPage() {
  return <AcceptInvitation />;
}
