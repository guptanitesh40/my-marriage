import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, Matches, ValidateIf } from 'class-validator';

/**
 * Field rules for the task request DTOs, beyond those shared with events
 * and weddings. Messages are written for people.
 */

const ID = /^[a-f0-9]{24}$/i;

/** An optional ID of a related record; with `nullable` (for edits), `null` removes the link. */
export const OptionalIdField = (options: { message: string; nullable?: boolean }) =>
  applyDecorators(
    ApiProperty({
      required: false,
      pattern: ID.source,
      example: '6740a1b2c3d4e5f601234567',
      ...(options.nullable ? { nullable: true } : {}),
    }),
    IsOptional(),
    Matches(ID, { message: options.message }),
  );

/** One of `values`; may be left out, never null. */
export const OptionalChoiceField = (values: readonly string[], message: string) =>
  applyDecorators(
    ApiProperty({ required: false, enum: values }),
    ValidateIf((_: unknown, value: unknown) => value !== undefined),
    IsIn(values, { message }),
  );

/** A filter by a related record's ID, or `none` for records without one. */
export const OptionalIdOrNoneField = (message: string) =>
  applyDecorators(
    ApiProperty({ required: false, description: 'An ID, or `none`.', example: 'none' }),
    IsOptional(),
    Matches(/^(?:[a-f0-9]{24}|none)$/i, { message }),
  );
