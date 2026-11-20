import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength, ValidateBy, ValidateIf } from 'class-validator';
import { isTimeZone, isWallTime } from '../event-time.js';

/**
 * Field rules for the event request DTOs, beyond those shared with weddings
 * (weddings/dto/fields.ts). Messages are written for people.
 */

/**
 * Paragraphs keep their line breaks; other control characters are refused.
 * With `nullable` (for edits), `null` clears the text.
 */
export const OptionalTextBlockField = (options: {
  maxLength: number;
  example: string;
  nullable?: boolean;
}) =>
  applyDecorators(
    ApiProperty({
      required: false,
      maxLength: options.maxLength,
      example: options.example,
      ...(options.nullable ? { nullable: true } : {}),
    }),
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? value.normalize('NFC').replace(/\r\n?/g, '\n').trim() : value,
    ),
    IsOptional(),
    IsString({ message: 'Enter text.' }),
    MaxLength(options.maxLength, { message: `Use ${options.maxLength} characters or fewer.` }),
    Matches(/^(?:[\n\t]|[^\p{Cc}\p{Cf}])*$/u, {
      message: 'Use letters, numbers and punctuation only.',
    }),
  );

/** With `nullable` (for edits), `null` clears the time. */
export const OptionalTimeField = (options: { nullable?: boolean } = {}) =>
  applyDecorators(
    ApiProperty({
      required: false,
      pattern: '^([01]\\d|2[0-3]):[0-5]\\d$',
      example: '18:30',
      ...(options.nullable ? { nullable: true } : {}),
    }),
    IsOptional(),
    ValidateBy(
      { name: 'isWallTime', validator: { validate: isWallTime } },
      { message: 'Enter a time like 18:30.' },
    ),
  );

export const OptionalTimeZoneField = () =>
  applyDecorators(
    ApiProperty({ required: false, example: 'Asia/Kolkata', default: 'Asia/Kolkata' }),
    // May be left out, never null: every event has a time zone.
    ValidateIf((_: unknown, value: unknown) => value !== undefined),
    ValidateBy(
      { name: 'isTimeZone', validator: { validate: isTimeZone } },
      { message: 'Choose a time zone from the list.' },
    ),
  );

/**
 * An optional single line of text; with `nullable` (for edits), `null`
 * clears it. Whitespace is tidied and invisible characters refused.
 */
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
      ...(options.nullable ? { nullable: true } : {}),
    }),
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? value.normalize('NFC').replace(/\s+/g, ' ').trim() : value,
    ),
    IsOptional(),
    IsString({ message: 'Enter text.' }),
    MaxLength(options.maxLength, { message: `Use ${options.maxLength} characters or fewer.` }),
    Matches(/^[^\p{Cc}\p{Cf}]*$/u, { message: 'Use letters, numbers and punctuation only.' }),
  );

/**
 * An optional link of one kind, checked against its hosts (event-links.ts);
 * with `nullable`, `null` removes it. An empty string also removes it.
 */
export const OptionalLinkField = (options: {
  check: (value: string) => string | null;
  message: string;
  example: string;
  nullable?: boolean;
}) =>
  applyDecorators(
    ApiProperty({
      required: false,
      maxLength: 2048,
      example: options.example,
      ...(options.nullable ? { nullable: true } : {}),
    }),
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? value.trim() : value,
    ),
    IsOptional(),
    IsString({ message: options.message }),
    MaxLength(2048, { message: options.message }),
    ValidateBy(
      {
        name: 'isAllowedLink',
        validator: {
          validate: (value: unknown) =>
            typeof value === 'string' && (value === '' || options.check(value) !== null),
        },
      },
      { message: options.message },
    ),
  );
