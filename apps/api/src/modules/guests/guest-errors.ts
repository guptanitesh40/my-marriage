import {
  ConflictException,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { fieldError } from '../weddings/wedding-errors.js';

/** Also for a guest of another wedding, or one removed: isolation never says which. */
export function guestNotFound(): NotFoundException {
  return new NotFoundException({ code: 'GUEST_NOT_FOUND', message: 'Guest not found.' });
}

export function unknownEvents() {
  return fieldError('eventIds', 'Choose from this wedding’s events.');
}

/**
 * Lowering the party size below an answer already given (PRD GUEST-06,
 * schema document §6.4): the organizer must resolve it; nothing is clamped.
 */
export function partySizeConflict(
  conflicts: { eventId: string; title: string; attendingCount: number }[],
): ConflictException {
  return new ConflictException({
    code: 'PARTY_SIZE_CONFLICT',
    message: `Some answers are for more people than that: ${conflicts
      .map((c) => `${c.title}: ${c.attendingCount} attending`)
      .join(', ')}. Ask the guest to update their RSVP first.`,
    details: conflicts.map((c) => ({
      field: 'partySize',
      messages: [`${c.title}: ${c.attendingCount} attending`],
      eventId: c.eventId,
    })),
  });
}

export function noEmailAddress() {
  return fieldError('email', 'Add an email address to send the invitation by email.');
}

export function nothingToInviteTo(): UnprocessableEntityException {
  return new UnprocessableEntityException({
    code: 'NO_CEREMONIES_SELECTED',
    message: 'Choose at least one ceremony before sending the invitation.',
  });
}

/** The link is unknown, revoked, or its guest was removed: never says which. */
export function linkUnavailable(): NotFoundException {
  return new NotFoundException({
    code: 'INVITATION_LINK_UNAVAILABLE',
    message: 'This invitation link is no longer available. Please ask the couple for a new one.',
  });
}

export function guestSessionMissing(): UnauthorizedException {
  return new UnauthorizedException({
    code: 'GUEST_SESSION_REQUIRED',
    message: 'Open your invitation link again to see your invitation.',
  });
}

export function invitationNotFound(): NotFoundException {
  return new NotFoundException({
    code: 'EVENT_INVITATION_NOT_FOUND',
    message: 'This ceremony is not part of your invitation.',
  });
}

export function rsvpClosed(): ConflictException {
  return new ConflictException({
    code: 'RSVP_CLOSED',
    message: 'This celebration was cancelled, so its RSVP is closed.',
  });
}

/** Saved elsewhere meanwhile (schema document §6.3): never overwrite silently. */
export function rsvpChanged(): ConflictException {
  return new ConflictException({
    code: 'RSVP_VERSION_CONFLICT',
    message: 'These responses have changed since you opened this page. Refresh to see the latest.',
  });
}

export function countTooLarge(partySize: number) {
  return fieldError(
    'attendingCount',
    `Choose how many people will attend, from 1 to ${partySize}.`,
  );
}

export function nobodyToRemind(): UnprocessableEntityException {
  return new UnprocessableEntityException({
    code: 'NO_GUESTS_TO_REMIND',
    message:
      'No one can be reminded right now: guests need an email address and an invitation that has been shared.',
  });
}

export function nothingToRemindAbout(): UnprocessableEntityException {
  return new UnprocessableEntityException({
    code: 'NO_UPCOMING_CEREMONIES',
    message: 'This guest has no upcoming ceremonies to be reminded about.',
  });
}

export function reminderEventUnavailable() {
  return fieldError('eventId', 'Choose an upcoming ceremony.');
}

export function noReminderEmail() {
  return fieldError('email', 'Add an email address to send reminders by email.');
}

export function invitationNotShared(): ConflictException {
  return new ConflictException({
    code: 'INVITATION_NOT_SHARED',
    message: 'Send or share the invitation first: a reminder follows an invitation.',
  });
}

export function invitationLinkOff(): ConflictException {
  return new ConflictException({
    code: 'INVITATION_LINK_OFF',
    message: 'This guest’s invitation link is turned off. Make a new link first.',
  });
}

export function guestRemindersOff(): ConflictException {
  return new ConflictException({
    code: 'GUEST_REMINDERS_OFF',
    message: 'This guest has turned off reminder emails.',
  });
}

/** 429: sending these would pass the wedding's daily email budget. */
export function dailyEmailLimit(remaining: number): HttpException {
  return new HttpException(
    {
      code: 'EMAIL_DAILY_LIMIT',
      message:
        remaining === 0
          ? 'This wedding has sent all the emails it can today. Please try again tomorrow.'
          : `This wedding can send ${remaining} more email${remaining === 1 ? '' : 's'} today. Remind about one ceremony, or try again tomorrow.`,
      details: { remaining },
    },
    HttpStatus.TOO_MANY_REQUESTS,
  );
}
