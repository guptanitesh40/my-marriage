import { expect, it } from 'vitest';
import { apiOrigin } from './origin';

it('uses the local API in development and the configured one when set', () => {
  expect(apiOrigin({})).toBe('http://localhost:4000');
  expect(apiOrigin({ API_ORIGIN: 'http://localhost:4200' })).toBe('http://localhost:4200');
});

it('has no local fallback on Vercel', () => {
  expect(() => apiOrigin({ VERCEL: '1' })).toThrow(/API_ORIGIN must be set/);
  expect(() => apiOrigin({ VERCEL: '1', API_ORIGIN: '' })).toThrow(/API_ORIGIN must be set/);
  for (const local of ['http://localhost:4000', 'http://127.0.0.1:4000', 'http://api.localhost']) {
    expect(() => apiOrigin({ VERCEL: '1', API_ORIGIN: local }), local).toThrow(/local address/);
  }
  expect(apiOrigin({ VERCEL: '1', API_ORIGIN: 'https://api.example.com' })).toBe(
    'https://api.example.com',
  );
});
