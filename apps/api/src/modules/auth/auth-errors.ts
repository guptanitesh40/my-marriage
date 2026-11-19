import { BadRequestException, GoneException } from '@nestjs/common';

/** The request's client, for per-IP limits. */
export interface ClientContext {
  ip: string;
}

/** Throws the per-field validation error the web form expects. */
export function rejectPassword(problems: string[]): never {
  throw new BadRequestException({
    code: 'VALIDATION_ERROR',
    message: 'Request validation failed',
    details: [{ field: 'password', messages: problems }],
  });
}

/** One answer for unknown, used, expired and replaced email links alike. */
export function invalidLink(): GoneException {
  return new GoneException({
    code: 'TOKEN_INVALID',
    message: 'This link is invalid or has expired. Please request a new one.',
  });
}
