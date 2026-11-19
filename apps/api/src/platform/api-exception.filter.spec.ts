import { BadRequestException, ConflictException, type ArgumentsHost } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ApiExceptionFilter } from './api-exception.filter.js';
import { RateLimitedException } from './rate-limit.js';
import { createValidationPipe } from './validation.js';

function run(exception: unknown) {
  const res = {
    getHeader: () => 'req_test',
    setHeader: vi.fn<(name: string, value: string) => void>(),
    status: vi.fn<(code: number) => unknown>().mockReturnThis(),
    json: vi.fn<(body: unknown) => void>(),
  };
  const host = { switchToHttp: () => ({ getResponse: () => res }) } as unknown as ArgumentsHost;
  const filter = new ApiExceptionFilter();
  // Silence the expected error log for unhandled exceptions.
  const logged = vi.spyOn(filter['logger'], 'error').mockImplementation(() => undefined);
  filter.catch(exception, host);
  return {
    status: res.status.mock.calls[0]?.[0],
    body: res.json.mock.calls[0]?.[0],
    logged: logged.mock.calls,
    headers: Object.fromEntries(res.setHeader.mock.calls),
  };
}

describe('ApiExceptionFilter', () => {
  it('tells a rate-limited client when to retry, in the header and the body', () => {
    const { status, body, headers } = run(new RateLimitedException(90));
    expect(status).toBe(429);
    expect(headers).toEqual({ 'Retry-After': '90' });
    expect(body).toEqual({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many attempts. Please wait and try again.',
        details: { retryAfterSeconds: 90 },
      },
      requestId: 'req_test',
    });
  });

  it('passes through the per-field details built by the validation pipe', async () => {
    class Dto {}
    const rejection: unknown = await createValidationPipe()
      .transform({ partySize: 0 }, { type: 'body', metatype: Dto })
      .catch((error: unknown) => error);

    const { status, body } = run(rejection);
    expect(status).toBe(400);
    expect(body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: [{ field: 'partySize', messages: ['property partySize should not exist'] }],
      },
      requestId: 'req_test',
    });
  });

  it('uses the default code for the status when the exception has none', () => {
    const { status, body } = run(new BadRequestException('Validation failed (numeric expected)'));
    expect(status).toBe(400);
    expect(body).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed (numeric expected)' },
      requestId: 'req_test',
    });
  });

  it('keeps a domain error code supplied by the service', () => {
    const { status, body } = run(
      new ConflictException({ code: 'OWNER_ACTIVE_LIMIT', message: 'Already owns a wedding' }),
    );
    expect(status).toBe(409);
    expect(body).toEqual({
      error: { code: 'OWNER_ACTIVE_LIMIT', message: 'Already owns a wedding' },
      requestId: 'req_test',
    });
  });

  it('hides the details of unexpected errors, and logs them with the request ID', () => {
    const cause = new Error('connection string mongodb://user:secret@host');
    const { status, body, logged } = run(cause);
    expect(status).toBe(500);
    expect(body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      requestId: 'req_test',
    });
    expect(logged).toEqual([['Unhandled exception', cause, { requestId: 'req_test' }]]);
  });
});
