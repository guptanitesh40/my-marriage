import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { PASSWORD_MAX_LENGTH, PASSWORD_MESSAGES, PASSWORD_MIN_LENGTH } from '../password-policy.js';

/**
 * Field rules shared by the auth request DTOs. Messages are written for
 * people: the web app shows them beside the field.
 *
 * Each also declares its OpenAPI schema: the Swagger plugin only reads
 * class-validator decorators written directly in a `*.dto.ts` file, so
 * without this the contract would lose the limits.
 */

const trim = Transform(({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value,
);

export const EmailField = () =>
  applyDecorators(
    ApiProperty({ format: 'email', maxLength: 254, example: 'priya@example.com' }),
    trim,
    IsEmail({}, { message: 'Enter a valid email address, like name@example.com.' }),
    MaxLength(254, { message: 'Enter a valid email address, like name@example.com.' }),
  );

/**
 * Length only; the rest of the password policy needs the email too and runs
 * in the service. Never trimmed: spaces are allowed and count.
 */
export const NewPasswordField = () =>
  applyDecorators(
    ApiProperty({
      format: 'password',
      minLength: PASSWORD_MIN_LENGTH,
      maxLength: PASSWORD_MAX_LENGTH,
    }),
    IsString({ message: PASSWORD_MESSAGES.tooShort }),
    MinLength(PASSWORD_MIN_LENGTH, { message: PASSWORD_MESSAGES.tooShort }),
    MaxLength(PASSWORD_MAX_LENGTH, { message: PASSWORD_MESSAGES.tooLong }),
  );

/** A password being checked, not chosen: any non-empty string up to the maximum. */
export const CurrentPasswordField = () =>
  applyDecorators(
    ApiProperty({ format: 'password', minLength: 1, maxLength: PASSWORD_MAX_LENGTH }),
    IsString({ message: 'Enter your password.' }),
    MinLength(1, { message: 'Enter your password.' }),
    MaxLength(PASSWORD_MAX_LENGTH, { message: 'Enter your password.' }),
  );

export const DisplayNameField = () =>
  applyDecorators(
    ApiProperty({ minLength: 1, maxLength: 80, example: 'Priya Sharma' }),
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
    ),
    IsString({ message: 'Enter your name.' }),
    MinLength(1, { message: 'Enter your name.' }),
    MaxLength(80, { message: 'Use 80 characters or fewer.' }),
    // Control and invisible formatting characters have no place in a name.
    Matches(/^[^\p{Cc}\p{Cf}]*$/u, { message: 'Use letters, numbers and punctuation only.' }),
  );

/** A secret from an email link: our tokens are 43 URL-safe characters. */
export const LinkTokenField = () =>
  applyDecorators(
    ApiProperty({ pattern: '^[A-Za-z0-9_-]{20,100}$' }),
    IsString({ message: 'This link is incomplete.' }),
    Matches(/^[A-Za-z0-9_-]{20,100}$/, { message: 'This link is incomplete.' }),
  );
