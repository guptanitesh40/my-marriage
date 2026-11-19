import {
  Catch,
  HttpException,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import type { ApiErrorDto } from './api-error.dto.js';
import { getRequestId } from './request-context.js';
import { recordResponse } from './tracing.js';

/** Default code per status; see Appendix A of the architecture document. */
const CODE_BY_STATUS: Record<number, string> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  410: 'GONE',
  413: 'PAYLOAD_TOO_LARGE',
  429: 'RATE_LIMITED',
  503: 'DEPENDENCY_UNAVAILABLE',
};

/**
 * Converts every failure into the documented envelope:
 * `{ error: { code, message, details? }, requestId }`.
 * Unexpected errors are logged in full and returned as an opaque 500, so
 * internals never reach a client.
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const requestId = getRequestId(res);

    if (!(exception instanceof HttpException)) {
      this.logger.error('Unhandled exception', exception, { requestId });
      this.send(res, 500, {
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
        requestId,
      });
      return;
    }

    const status = exception.getStatus();
    const payload = exception.getResponse();
    const fields: Record<string, unknown> =
      typeof payload === 'object' ? (payload as Record<string, unknown>) : {};

    // A domain error may carry its own code, e.g. OWNER_ACTIVE_LIMIT.
    const code =
      typeof fields.code === 'string'
        ? fields.code
        : (CODE_BY_STATUS[status] ?? (status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR'));
    const message = typeof fields.message === 'string' ? fields.message : exception.message;

    // A rate limit (RateLimitedException) says when the client may retry.
    if (typeof fields.retryAfterSeconds === 'number') {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil(fields.retryAfterSeconds))));
    }

    this.send(res, status, {
      error: {
        code,
        message,
        ...(fields.details === undefined ? {} : { details: fields.details }),
      },
      requestId,
    });
  }

  private send(res: Response, status: number, body: ApiErrorDto): void {
    recordResponse(body);
    res.status(status).json(body);
  }
}
