'use client';

import { useEffect } from 'react';
import { invitationPath } from '@/lib/routes';

/**
 * A private invitation link that opens a website no longer published (the
 * couple unpublished it after sending the invitation) goes on to the
 * private RSVP page, secret and all, so the guest can still answer.
 */
export function ForwardInvitationLink() {
  useEffect(() => {
    if (/(?:^#|&)t=/.test(window.location.hash)) {
      window.location.replace(`${invitationPath}${window.location.hash}`);
    }
  }, []);
  return null;
}
