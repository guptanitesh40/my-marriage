import { ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';

/** One invalid field of a request body. */
export class FieldErrorDto {
  /** Dotted path of the invalid property, e.g. `venue.name`. */
  @ApiProperty({ example: 'email' })
  field: string;

  @ApiProperty({ type: [String], example: ['email must be an email'] })
  messages: string[];
}

export class ApiErrorDetailDto {
  /** Stable machine-readable code, e.g. VALIDATION_ERROR or OWNER_ACTIVE_LIMIT. */
  @ApiProperty({ example: 'VALIDATION_ERROR' })
  code: string;

  /** Human-readable summary. Safe to show; never contains internals. */
  @ApiProperty({ example: 'Request validation failed' })
  message: string;

  @ApiPropertyOptional({
    description:
      'Extra context that depends on the code. A VALIDATION_ERROR raised by a request body ' +
      'lists the invalid fields; other codes may send an object.',
    oneOf: [
      { type: 'array', items: { $ref: getSchemaPath(FieldErrorDto) } },
      { type: 'object', additionalProperties: true },
    ],
  })
  details?: unknown;
}

/** The body of every failed request. */
export class ApiErrorDto {
  @ApiProperty({ type: ApiErrorDetailDto })
  error: ApiErrorDetailDto;

  @ApiProperty({ example: 'req_0b1f6c1e-6f0c-4f7e-9a52-0a4d6f1f2b77' })
  requestId: string;
}
