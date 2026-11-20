import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  NotFoundException,
} from '@nestjs/common';

/** The errors of the weddings module. Messages are written for people. */

/** PRD WED-03, with the way out. */
export function ownerActiveLimit(): ConflictException {
  return new ConflictException({
    code: 'OWNER_ACTIVE_LIMIT',
    message:
      'You already have an active wedding. Open it to keep planning; you can start another after archiving it.',
  });
}

/** Also for a wedding that exists but is not yours: isolation never says which. */
export function weddingNotFound(): NotFoundException {
  return new NotFoundException({ code: 'WEDDING_NOT_FOUND', message: 'Wedding not found.' });
}

export function weddingArchived(): ConflictException {
  return new ConflictException({
    code: 'WEDDING_ARCHIVED',
    message: 'This wedding is archived, so it can no longer be changed.',
  });
}

/** Managers cannot change who owns a wedding (PRD TEAM-03). */
export function ownersOnly(): ForbiddenException {
  return new ForbiddenException({
    code: 'OWNER_REQUIRED',
    message: 'Only the couple can do this.',
  });
}

export function ownerLimit(): ConflictException {
  return new ConflictException({
    code: 'OWNER_LIMIT',
    message: 'This wedding already has two owners.',
  });
}

export function inviteInvalid(): GoneException {
  return new GoneException({
    code: 'INVITE_INVALID',
    message:
      'This invitation has expired, was replaced by a newer one, or was withdrawn. Ask for a new invitation.',
  });
}

export function inviteEmailMismatch(): ForbiddenException {
  return new ForbiddenException({
    code: 'INVITE_EMAIL_MISMATCH',
    message:
      'This invitation was sent to a different email address. Sign in with that address to accept it.',
  });
}

/** One invalid field, in the same shape as the validation pipe's errors. */
export function fieldError(field: string, message: string): BadRequestException {
  return new BadRequestException({
    code: 'VALIDATION_ERROR',
    message,
    details: [{ field, messages: [message] }],
  });
}

export const PAST_DATE_MESSAGE = 'Choose today or a later date.';

export function slugTaken() {
  return fieldError('slug', 'That address is already taken. Try another one.');
}
