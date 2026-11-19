import type { ComposedEmail } from '../notifications/email-composer.js';
import { renderEmail } from '../notifications/email-layout.js';

/** "10 December 2027". */
function longDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

/**
 * The partner invitation. The recipient may not have an account, so there
 * is no greeting name; the text says who sent it, for which wedding, and
 * that only this address can accept.
 */
export function partnerInviteMessage(input: {
  invitedByName?: string;
  coupleName: string;
  link: string;
  expiresAt: Date;
}): ComposedEmail {
  const who = input.invitedByName ?? 'Your partner';
  return {
    subject: `${who} invited you to plan ${input.coupleName}’s wedding`,
    ...renderEmail({
      title: 'Plan your wedding together',
      paragraphs: [
        `${who} has invited you to plan ${input.coupleName}’s wedding on My Marriage, as an equal owner with the same rights.`,
        'Accept the invitation by signing in, or creating an account, with this email address.',
        `This invitation works until ${longDate(input.expiresAt)}.`,
      ],
      action: { label: 'Accept invitation', url: input.link },
      footnote:
        'If you were not expecting this, you can ignore this email; nobody gets access unless you accept.',
    }),
  };
}
