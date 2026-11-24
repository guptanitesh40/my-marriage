import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { MEMBER_LABEL_MAX } from '../schemas/wedding-membership.schema.js';

/**
 * A member's short label, e.g. "Bride's father". Optional; an empty one is
 * no label (and, on an edit, `null` or empty clears it).
 */
export const MemberLabelField = (options: { nullable?: boolean } = {}) =>
  applyDecorators(
    ApiProperty({
      required: false,
      maxLength: MEMBER_LABEL_MAX,
      example: 'Bride’s father',
      ...(options.nullable ? { nullable: true } : {}),
    }),
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? value.normalize('NFC').trim().replace(/\s+/g, ' ') : value,
    ),
    IsOptional(),
    IsString({ message: 'Enter a label, or leave it empty.' }),
    MaxLength(MEMBER_LABEL_MAX, { message: `Use ${MEMBER_LABEL_MAX} characters or fewer.` }),
    Matches(/^[^\p{Cc}\p{Cf}<>]*$/u, { message: 'Use letters, numbers and punctuation only.' }),
  );
