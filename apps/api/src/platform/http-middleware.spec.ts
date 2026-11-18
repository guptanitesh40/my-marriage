import { EventEmitter } from 'node:events';
import { Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { accessLog } from './http-middleware.js';

function finish(originalUrl: string, statusCode: number) {
  const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  const res = Object.assign(new EventEmitter(), { statusCode, getHeader: () => 'req_test' });
  accessLog({ method: 'GET', originalUrl } as Request, res as unknown as Response, () => undefined);
  res.emit('finish');
  return log.mock.calls;
}

describe('accessLog', () => {
  afterEach(() => vi.restoreAllMocks());

  it('logs one line per request without the query string', () => {
    const calls = finish('/api/v1/auth/verify-email?token=s3cret', 200);
    expect(calls).toEqual([
      [
        'request',
        {
          requestId: 'req_test',
          method: 'GET',
          path: '/api/v1/auth/verify-email',
          status: 200,
          durationMs: expect.any(Number) as number,
        },
      ],
    ]);
  });

  it('skips successful health probes but logs failing ones', () => {
    expect(finish('/api/v1/health/ready', 200)).toEqual([]);
    expect(finish('/api/v1/health/ready', 503)).toHaveLength(1);
  });
});
