import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateBy,
  ValidateIf,
} from 'class-validator';
import { VENDOR_LIMITS } from '../vendor-policy.js';

/**
 * Field rules for the vendor request DTOs, beyond those shared with
 * weddings and events. Messages are written for people. An empty string
 * counts as "not given" when adding a vendor and as "remove it" when
 * changing one, as `null` does.
 */

const ID = /^[a-f0-9]{24}$/i;

/** Trims and joins runs of spaces, so equal text is stored equally. */
const normalizeLine = Transform(({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.normalize('NFC').trim().replace(/\s+/g, ' ') : value,
);

const nullable = (yes?: boolean) => (yes ? { nullable: true } : {});

/** An optional line of text, such as a contact's name. */
export const OptionalLineField = (options: {
  maxLength: number;
  example: string;
  nullable?: boolean;
}) =>
  applyDecorators(
    ApiProperty({
      required: false,
      maxLength: options.maxLength,
      example: options.example,
      ...nullable(options.nullable),
    }),
    normalizeLine,
    IsOptional(),
    IsString({ message: 'Enter text.' }),
    MaxLength(options.maxLength, { message: `Use ${options.maxLength} characters or fewer.` }),
    Matches(/^[^\p{Cc}\p{Cf}]*$/u, { message: 'Use letters, numbers and punctuation only.' }),
  );

const PHONE_MESSAGE = 'Enter a phone number, like +91 98200 00000.';

/** Digits with the usual separators, and an optional leading +. */
function isPhone(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  if (value === '') return true;
  if (!/^\+?[\d\s().-]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, '').length;
  return digits >= VENDOR_LIMITS.phoneDigits.min && digits <= VENDOR_LIMITS.phoneDigits.max;
}

/** An optional phone number, kept as typed (spaces tidied) so it reads as the vendor gave it. */
export const OptionalPhoneField = (options: { nullable?: boolean } = {}) =>
  applyDecorators(
    ApiProperty({
      required: false,
      maxLength: VENDOR_LIMITS.phone,
      example: '+91 98200 00000',
      ...nullable(options.nullable),
    }),
    normalizeLine,
    IsOptional(),
    MaxLength(VENDOR_LIMITS.phone, { message: PHONE_MESSAGE }),
    ValidateBy({ name: 'isPhone', validator: { validate: isPhone } }, { message: PHONE_MESSAGE }),
  );

const EMAIL_MESSAGE = 'Enter a valid email address, like name@example.com.';

/** An optional email address; checked only when one is given. */
export const OptionalEmailField = (options: { nullable?: boolean } = {}) =>
  applyDecorators(
    ApiProperty({
      required: false,
      format: 'email',
      maxLength: VENDOR_LIMITS.email,
      example: 'contact@vendor.in',
      ...nullable(options.nullable),
    }),
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? value.normalize('NFC').trim() : value,
    ),
    IsOptional(),
    IsString({ message: EMAIL_MESSAGE }),
    ValidateIf((_: unknown, value: unknown) => value !== ''),
    IsEmail({}, { message: EMAIL_MESSAGE }),
    MaxLength(VENDOR_LIMITS.email, { message: EMAIL_MESSAGE }),
  );

const EVENTS_MESSAGE = 'Choose from this wedding’s events.';

/**
 * The events a vendor works at: IDs of this wedding's events, repeats
 * ignored. An empty list links none. Never null.
 */
export const EventIdsField = () =>
  applyDecorators(
    ApiProperty({
      required: false,
      type: [String],
      maxItems: VENDOR_LIMITS.events,
      items: { type: 'string', pattern: ID.source },
      example: ['6740a1b2c3d4e5f601234567'],
    }),
    ValidateIf((_: unknown, value: unknown) => value !== undefined),
    IsArray({ message: EVENTS_MESSAGE }),
    ArrayMaxSize(VENDOR_LIMITS.events, {
      message: `Link at most ${VENDOR_LIMITS.events} events.`,
    }),
    Matches(ID, { each: true, message: EVENTS_MESSAGE }),
  );
