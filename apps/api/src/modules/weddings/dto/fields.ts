import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateBy,
  ValidateIf,
  type ValidationOptions,
} from 'class-validator';

/**
 * Field rules for the wedding request DTOs. Messages are written for people:
 * the web app shows them beside the field. Each also declares its OpenAPI
 * schema, which the Swagger plugin cannot read from a composite decorator.
 */

/** Trims, joins runs of spaces and composes accented letters, so equal text is stored equally. */
const normalizeText = Transform(({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.normalize('NFC').trim().replace(/\s+/g, ' ') : value,
);

/** A line of text, such as a name or a city: required unless `optional` (for edits). */
export const TextLineField = (options: {
  maxLength: number;
  empty: string;
  example: string;
  optional?: boolean;
}) =>
  applyDecorators(
    ApiProperty({
      minLength: 1,
      maxLength: options.maxLength,
      example: options.example,
      required: !options.optional,
    }),
    // Optional means "may be left out", never "may be null": a name cannot be cleared.
    ...(options.optional ? [ValidateIf((_: unknown, value: unknown) => value !== undefined)] : []),
    normalizeText,
    IsString({ message: options.empty }),
    MinLength(1, { message: options.empty }),
    MaxLength(options.maxLength, { message: `Use ${options.maxLength} characters or fewer.` }),
    // Control and invisible formatting characters have no place in a name.
    Matches(/^[^\p{Cc}\p{Cf}]*$/u, { message: 'Use letters, numbers and punctuation only.' }),
  );

const DATE_MESSAGE = 'Enter a real date, like 2027-12-10.';

/** A real calendar day, `YYYY-MM-DD`, in a sensible range. */
function isCalendarDate(value: unknown): boolean {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  // Rejects 2027-02-30, which Date would roll over into March.
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return false;
  const year = date.getUTCFullYear();
  return year >= 2000 && year <= 2100;
}

const IsCalendarDate = (options?: ValidationOptions) =>
  ValidateBy({ name: 'isCalendarDate', validator: { validate: isCalendarDate } }, options);

/**
 * An optional calendar day: a wedding has a date, not an instant. With
 * `nullable` (for edits), `null` clears the date. Whether it is in the past
 * is checked by the service, which knows the stored date.
 */
export const OptionalDateField = (options: { nullable?: boolean } = {}) =>
  applyDecorators(
    ApiProperty({
      required: false,
      format: 'date',
      example: '2027-12-10',
      ...(options.nullable ? { nullable: true } : {}),
    }),
    IsOptional(),
    IsCalendarDate({ message: DATE_MESSAGE }),
  );
