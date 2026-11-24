import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  NotFoundException,
} from '@nestjs/common';

/** The errors of the weddings module. Messages are written for people. */

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

/** Waiting for deletion: read-only until an owner cancels (decision 0021). */
export function deletionPending(): ConflictException {
  return new ConflictException({
    code: 'WEDDING_DELETION_PENDING',
    message: 'This wedding is waiting to be deleted. Cancel the request to change it.',
  });
}

/** Managers cannot change who owns a wedding (PRD TEAM-03). */
export function ownersOnly(): ForbiddenException {
  return new ForbiddenException({
    code: 'OWNER_REQUIRED',
    message: 'Only the couple can do this.',
  });
}

/** Managing the team, and deleting planning records (decision 0020). */
export function adminsOnly(): ForbiddenException {
  return new ForbiddenException({
    code: 'ADMIN_REQUIRED',
    message: 'Only the couple or an admin can do this.',
  });
}

/** The couple's own places are protected: nobody removes or changes an owner. */
export function ownerProtected(): ForbiddenException {
  return new ForbiddenException({
    code: 'OWNER_PROTECTED',
    message: 'The bride and groom can’t be removed or changed.',
  });
}

/** Nobody removes themselves or changes their own role (decision 0020). */
export function notYourself(): ForbiddenException {
  return new ForbiddenException({
    code: 'NOT_YOURSELF',
    message: 'You can’t remove yourself or change your own role.',
  });
}

export function alreadyMember(): ConflictException {
  return new ConflictException({
    code: 'ALREADY_MEMBER',
    message: 'This person is already on the team.',
  });
}

export function alreadyInvited(): ConflictException {
  return new ConflictException({
    code: 'ALREADY_INVITED',
    message: 'This person has already been invited. Resend the invitation instead.',
  });
}

export function memberNotFound(): NotFoundException {
  return new NotFoundException({ code: 'MEMBER_NOT_FOUND', message: 'Team member not found.' });
}

export function inviteNotPending(): ConflictException {
  return new ConflictException({
    code: 'INVITE_NOT_PENDING',
    message: 'This invitation was already accepted, declined or withdrawn.',
  });
}

/** A hand-over to someone who is already an owner (decision 0025). */
export function alreadyOwner(): ConflictException {
  return new ConflictException({
    code: 'ALREADY_OWNER',
    message: 'They’re already an owner of this wedding.',
  });
}

/** Accepting a hand-over whose sender is no longer an owner (decision 0025). */
export function handOverStale(): GoneException {
  return new GoneException({
    code: 'HAND_OVER_INVALID',
    message:
      'The person who sent this is no longer an owner of the wedding, so it can’t be accepted. Ask an owner for a new invitation.',
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
