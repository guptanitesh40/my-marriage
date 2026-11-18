import {
  applyDecorators,
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
  type Type,
} from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import type { Response } from 'express';
import { map, type Observable } from 'rxjs';
import { getRequestId } from './request-context.js';

/**
 * Wraps whatever a controller returns as `{ data, requestId }`, the success
 * shape in the API documentation. Controllers return the DTO itself and never
 * build the envelope. A handler that returns nothing sends no body; give it
 * `@HttpCode(204)`.
 */
@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const res = context.switchToHttp().getResponse<Response>();
    return next
      .handle()
      .pipe(
        map((data: unknown) =>
          data === undefined ? undefined : { data, requestId: getRequestId(res) },
        ),
      );
  }
}

/**
 * Documents a successful response as the envelope around `dto`, so the
 * generated contract — and the web app's types — describe what is actually
 * sent. Use this instead of `@ApiOkResponse({ type })` on every endpoint.
 */
export function ApiDataResponse(
  dto: Type<unknown>,
  options: { status?: number; description?: string } = {},
): MethodDecorator {
  return applyDecorators(
    ApiExtraModels(dto),
    ApiResponse({
      status: options.status ?? 200,
      description: options.description,
      schema: {
        type: 'object',
        required: ['data', 'requestId'],
        properties: {
          data: { $ref: getSchemaPath(dto) },
          requestId: { type: 'string' },
        },
      },
    }),
  );
}
