import { afterEach, expect, it, vi } from 'vitest';
import { serverApi } from './server';

const incoming = new Headers({
  cookie: 'mm_session=abc',
  'x-forwarded-for': '203.0.113.9',
  authorization: 'Bearer should-not-be-forwarded',
  host: 'mymarriage.example',
});
vi.mock('next/headers', () => ({ headers: () => Promise.resolve(incoming) }));

afterEach(() => vi.unstubAllGlobals());

it("calls the API directly with the visitor's cookie and address, and nothing else", async () => {
  const sent: Request[] = [];
  vi.stubGlobal('fetch', (request: Request) => {
    sent.push(request);
    return Promise.resolve(Response.json({ data: { status: 'ok', checks: [] }, requestId: 'r' }));
  });

  const api = await serverApi();
  const { data } = await api.GET('/api/v1/health/live');

  expect(data?.data.status).toBe('ok');
  const request = sent[0];
  expect(request?.url).toBe('http://localhost:4000/api/v1/health/live');
  expect(request?.headers.get('cookie')).toBe('mm_session=abc');
  expect(request?.headers.get('x-forwarded-for')).toBe('203.0.113.9');
  expect(request?.headers.get('authorization')).toBeNull();
});
