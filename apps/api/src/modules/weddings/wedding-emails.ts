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

/**
 * An owner handing over their place (decision 0025): what the recipient
 * takes on, and that the sender stays on as an admin.
 */
export function handOverInviteMessage(input: {
  invitedByName?: string;
  coupleName: string;
  link: string;
  expiresAt: Date;
}): ComposedEmail {
  const who = input.invitedByName ?? 'An owner';
  return {
    subject: `${who} invited you to own ${input.coupleName}’s wedding`,
    ...renderEmail({
      title: 'Take over as an owner',
      paragraphs: [
        `${who} has invited you to take over their place as an owner of ${input.coupleName}’s wedding on My Marriage.`,
        `When you accept, you become an owner, with full authority over the wedding, and ${who} stays on the team as an admin.`,
        'Accept by signing in, or creating an account, with this email address. Any wedding of your own stays as it is.',
        `This invitation works until ${longDate(input.expiresAt)}.`,
      ],
      action: { label: 'Review and accept', url: input.link },
      footnote:
        'If you were not expecting this, you can ignore this email; nothing changes unless you accept.',
    }),
  };
}

/**
 * An invitation to help plan as an admin or a manager (decision 0020),
 * with what the role may do.
 */
export function teamInviteMessage(input: {
  invitedByName?: string;
  coupleName: string;
  role: 'admin' | 'manager';
  link: string;
  expiresAt: Date;
}): ComposedEmail {
  const who = input.invitedByName ?? `${input.coupleName}`;
  const role = input.role === 'admin' ? 'an admin' : 'a manager';
  const can =
    input.role === 'admin'
      ? 'As an admin you can plan everything with them and look after the team: invite, remove and change other helpers.'
      : 'As a manager you can help with events, tasks, guests, vendors, expenses, the website and photos.';
  return {
    subject: `${who} invited you to help plan ${input.coupleName}’s wedding`,
    ...renderEmail({
      title: 'Help plan a wedding',
      paragraphs: [
        `${who} has invited you to help plan ${input.coupleName}’s wedding on My Marriage, as ${role}.`,
        can,
        'Accept by signing in, or creating an account, with this email address. Any wedding of your own stays as it is.',
        `This invitation works until ${longDate(input.expiresAt)}.`,
      ],
      action: { label: 'Accept invitation', url: input.link },
      footnote:
        'If you were not expecting this, you can ignore this email; nobody gets access unless you accept.',
    }),
  };
}
