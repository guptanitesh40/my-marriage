import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min, ValidateIf } from 'class-validator';
import { GUEST_LIMITS } from '../guest-policy.js';

const PARTY_MESSAGE = `Enter how many people are invited, from 1 to ${GUEST_LIMITS.partySize}.`;

/** Everyone the contact responds for, themselves included (PRD GUEST-01). */
export const PartySizeField = (options: { optional?: boolean } = {}) =>
  applyDecorators(
    ApiProperty({
      type: 'integer',
      minimum: 1,
      maximum: GUEST_LIMITS.partySize,
      example: 5,
      required: !options.optional,
    }),
    ...(options.optional ? [ValidateIf((_: unknown, value: unknown) => value !== undefined)] : []),
    IsInt({ message: PARTY_MESSAGE }),
    Min(1, { message: PARTY_MESSAGE }),
    Max(GUEST_LIMITS.partySize, { message: PARTY_MESSAGE }),
  );
