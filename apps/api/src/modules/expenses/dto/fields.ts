import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, Matches, Max, Min, ValidateBy, ValidateIf } from 'class-validator';
import { MAX_PAISE } from '../expense-policy.js';

/**
 * Field rules for the expense request DTOs, beyond those shared with
 * events, tasks and weddings. Messages are written for people.
 */

const AMOUNT_MESSAGE = 'Enter an amount greater than ₹0.';

/**
 * Money in whole paise (₹80,000 is 8000000): a positive safe integer, never
 * a decimal. Optional means "may be left out", never null.
 */
export const MoneyPaiseField = (options: { optional?: boolean } = {}) =>
  applyDecorators(
    ApiProperty({
      type: 'integer',
      minimum: 1,
      maximum: MAX_PAISE,
      example: 8000000,
      description: 'Paise: ₹80,000 is 8000000.',
      required: !options.optional,
    }),
    ...(options.optional ? [ValidateIf((_: unknown, value: unknown) => value !== undefined)] : []),
    IsInt({ message: AMOUNT_MESSAGE }),
    Min(1, { message: AMOUNT_MESSAGE }),
    Max(MAX_PAISE, { message: 'Enter a smaller amount.' }),
  );

/** A real day, `YYYY-MM-DD`, in a sensible range. */
function isCalendarDate(value: unknown): boolean {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return false;
  const year = date.getUTCFullYear();
  return year >= 2000 && year <= 2100;
}

/** A required day (India time); whether it may be in the future is the service's rule. */
export const DayField = (example: string) =>
  applyDecorators(
    ApiProperty({ format: 'date', example }),
    ValidateBy(
      { name: 'isCalendarDate', validator: { validate: isCalendarDate } },
      { message: 'Enter a real date, like 2026-12-01.' },
    ),
  );

/** One of `values`, required. */
export const ChoiceField = (values: readonly string[], message: string) =>
  applyDecorators(ApiProperty({ enum: values }), IsIn(values, { message }));

/** A required ID of a related record. */
export const IdField = (message: string) =>
  applyDecorators(
    ApiProperty({ pattern: '^[a-f0-9]{24}$', example: '6740a1b2c3d4e5f601234567' }),
    Matches(/^[a-f0-9]{24}$/i, { message }),
  );
