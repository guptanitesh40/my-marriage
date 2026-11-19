import { describe, expect, it } from 'vitest';
import { toFailure, waitMessage } from './errors';

describe('toFailure', () => {
  it('keeps the first message per field, for showing beside each input', () => {
    const failure = toFailure(400, {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: [
          { field: 'email', messages: ['Enter a valid email address.', 'Too long.'] },
          { field: 'password', messages: ['Use at least 10 characters.'] },
        ],
      },
      requestId: 'req_1',
    });
    expect(failure).toEqual({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      fields: { email: 'Enter a valid email address.', password: 'Use at least 10 characters.' },
    });
  });

  it('reads how long to wait from a rate limit', () => {
    const failure = toFailure(429, {
      error: { code: 'RATE_LIMITED', message: 'Too many', details: { retryAfterSeconds: 150 } },
      requestId: 'req_2',
    });
    expect(failure.retryAfterSeconds).toBe(150);
    expect(waitMessage(failure)).toBe('Too many attempts. Please wait 3 minutes and try again.');
    expect(waitMessage({ ...failure, retryAfterSeconds: 20 })).toContain('wait a minute');
  });

  it('never shows server internals for a 5xx, nor fails on an empty body', () => {
    expect(toFailure(503, undefined)).toMatchObject({
      code: 'UNKNOWN',
      message: expect.stringContaining('Something went wrong') as unknown,
    });
  });
});
