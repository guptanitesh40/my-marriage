import type { ComposedEmail } from '../notifications/email-composer.js';
import { renderEmail } from '../notifications/email-layout.js';

/** The account emails, in the layout shared by every email. */

export function verifyEmailMessage(input: { displayName: string; link: string }): ComposedEmail {
  return {
    subject: 'Verify your email for My Marriage',
    ...renderEmail({
      title: 'Verify your email',
      greetingName: input.displayName,
      paragraphs: [
        'Welcome to My Marriage. Please confirm this is your email address so you can start planning.',
        'This link works once and expires in 24 hours.',
      ],
      action: { label: 'Verify my email', url: input.link },
      footnote: 'If you did not create an account, you can ignore this email; nothing will happen.',
    }),
  };
}

export function passwordResetMessage(input: { displayName: string; link: string }): ComposedEmail {
  return {
    subject: 'Reset your My Marriage password',
    ...renderEmail({
      title: 'Reset your password',
      greetingName: input.displayName,
      paragraphs: [
        'Someone asked to reset the password for your My Marriage account. If it was you, choose a new password below.',
        'This link works once and expires in 1 hour.',
      ],
      action: { label: 'Choose a new password', url: input.link },
      footnote: 'If you did not ask for this, ignore this email. Your password stays the same.',
    }),
  };
}

export function passwordChangedMessage(input: {
  displayName: string;
  forgotPasswordUrl: string;
}): ComposedEmail {
  return {
    subject: 'Your My Marriage password was changed',
    ...renderEmail({
      title: 'Your password was changed',
      greetingName: input.displayName,
      paragraphs: [
        'The password for your My Marriage account was just changed, and every device was signed out.',
        'If you made this change, there is nothing more to do.',
        'If you did not, reset your password now to secure your account.',
      ],
      action: { label: 'Reset my password', url: input.forgotPasswordUrl },
      footnote: 'We send this email every time the password changes, to keep your account safe.',
    }),
  };
}
