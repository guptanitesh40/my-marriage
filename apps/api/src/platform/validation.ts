import { BadRequestException, ValidationPipe, type ValidationError } from '@nestjs/common';
import type { FieldErrorDto } from './api-error.dto.js';

export function toFieldErrors(errors: ValidationError[], parent = ''): FieldErrorDto[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const own = error.constraints ? [{ field, messages: Object.values(error.constraints) }] : [];
    return [...own, ...toFieldErrors(error.children ?? [], field)];
  });
}

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    // Reject unknown writable fields instead of silently dropping them.
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    // Rejected values (a password, a token) must not travel with the error.
    validationError: { target: false, value: false },
    // Errors are keyed by field so a form can show each one beside its input.
    exceptionFactory: (errors) =>
      new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: toFieldErrors(errors),
      }),
  });
}
