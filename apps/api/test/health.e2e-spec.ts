import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from './support/app.js';

describe('API foundation (integration)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health/live reports the process is up', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health/live').expect(200);
    expect(res.body).toEqual({
      data: { status: 'ok', checks: [] },
      requestId: res.headers['x-request-id'],
    });
  });

  it('GET /api/v1/health/ready reports MongoDB and Redis as reachable', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health/ready').expect(200);
    expect(res.body).toMatchObject({ data: { status: 'ok', checks: ['mongodb', 'redis'] } });
  });

  it('returns the error envelope and a request ID for unknown routes', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/does-not-exist').expect(404);
    expect(res.headers['x-request-id']).toMatch(/^req_/);
    expect(res.body).toEqual({
      error: { code: 'NOT_FOUND', message: expect.any(String) as string },
      requestId: res.headers['x-request-id'],
    });
  });

  it('does not serve routes outside the /api/v1 prefix', async () => {
    await request(app.getHttpServer()).get('/health/live').expect(404);
  });

  it('sends safe default headers and does not advertise the framework', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/does-not-exist');
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
