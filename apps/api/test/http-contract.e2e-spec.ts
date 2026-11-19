import { Body, Controller, Get, HttpCode, Ip, Logger, Post } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Type } from 'class-transformer';
import { IsEmail, IsString, MinLength, ValidateNested } from 'class-validator';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Public } from '../src/modules/auth/auth.decorators.js';
import { currentRequestId } from '../src/platform/request-context.js';
import { createTestApp } from './support/app.js';

// No real endpoint takes a body yet, so these rules — which every Phase 1
// endpoint inherits — are pinned down with a probe controller.

class VenueDto {
  @IsString()
  @MinLength(1)
  name: string;
}

class ProbeDto {
  @IsEmail()
  email: string;

  @ValidateNested()
  @Type(() => VenueDto)
  venue: VenueDto;
}

@Public()
@Controller('probe')
class ProbeController {
  @Post()
  create(@Body() body: ProbeDto) {
    return { email: body.email, requestIdSeenByHandler: currentRequestId() };
  }

  @Post('nothing')
  @HttpCode(204)
  nothing(): void {}

  @Get('ip')
  ip(@Ip() ip: string) {
    return { ip };
  }

  @Get('crash')
  crash(): never {
    throw new Error('connection string mongodb://user:secret@host');
  }
}

describe('HTTP contract (integration)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp({ controllers: [ProbeController] });
  });

  afterAll(async () => {
    await app.close();
  });

  it('wraps a successful result as { data, requestId }', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/probe')
      .send({ email: 'priya@example.com', venue: { name: 'Farmhouse' } })
      .expect(201);
    expect(res.body).toEqual({
      data: {
        email: 'priya@example.com',
        // The request context must survive body parsing to reach services.
        requestIdSeenByHandler: res.headers['x-request-id'],
      },
      requestId: res.headers['x-request-id'],
    });
  });

  it('sends no body when a handler returns nothing', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/probe/nothing').expect(204);
    expect(res.text).toBe('');
  });

  it('reports validation failures per field, including nested and unknown fields', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/probe')
      .send({ email: 'not-an-email', venue: { name: '' }, role: 'owner' })
      .expect(400);
    expect(res.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: expect.arrayContaining([
          { field: 'email', messages: ['email must be an email'] },
          { field: 'venue.name', messages: [expect.stringContaining('name')] },
          { field: 'role', messages: ['property role should not exist'] },
        ]) as unknown,
      },
      requestId: res.headers['x-request-id'],
    });
    expect(JSON.stringify(res.body)).not.toContain('not-an-email');
  });

  it('rejects malformed JSON with the error envelope', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/probe')
      .set('Content-Type', 'application/json')
      .send('{bad')
      .expect(400);
    expect(res.body).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
  });

  it('ignores a client-supplied X-Forwarded-For unless TRUST_PROXY_HOPS allows it', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/probe/ip')
      .set('X-Forwarded-For', '203.0.113.9')
      .expect(200);
    expect((res.body as { data: { ip: string } }).data.ip).not.toBe('203.0.113.9');
  });

  describe('cross-site request forgery', () => {
    const body = { email: 'priya@example.com', venue: { name: 'Farmhouse' } };

    it('refuses a state-changing request that the browser marks as cross-site', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/probe')
        .set('Sec-Fetch-Site', 'cross-site')
        .send(body)
        .expect(403);
      expect(res.body).toMatchObject({
        error: { code: 'FORBIDDEN' },
        requestId: res.headers['x-request-id'],
      });
    });

    it('refuses a request from another origin when the browser sends no Fetch Metadata', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/probe')
        .set('Origin', 'https://evil.example')
        .send(body)
        .expect(403);
    });

    it('accepts same-origin requests, the web origin, and clients that are not browsers', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/probe')
        .set('Sec-Fetch-Site', 'same-origin')
        .send(body)
        .expect(201);
      // WEB_ORIGIN, for a proxy that rewrites Host and a browser without Fetch Metadata.
      await request(app.getHttpServer())
        .post('/api/v1/probe')
        .set('Origin', 'http://localhost:3000')
        .send(body)
        .expect(201);
      await request(app.getHttpServer()).post('/api/v1/probe').send(body).expect(201);
    });

    it('never checks reads, which must therefore never change anything', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/probe/ip')
        .set('Sec-Fetch-Site', 'cross-site')
        .expect(200);
    });
  });

  it('hides the cause of an unexpected error', async () => {
    // Silence the expected error log.
    const logged = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const res = await request(app.getHttpServer()).get('/api/v1/probe/crash').expect(500);
    expect(res.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      requestId: res.headers['x-request-id'],
    });
    expect(logged).toHaveBeenCalled();
    logged.mockRestore();
  });
});
