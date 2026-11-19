import { describe, expect, it } from 'vitest';
import { safeNextPath } from './safe-next-path';

describe('safeNextPath', () => {
  it.each(['/dashboard', '/dashboard?tab=guests', '/weddings/abc#tasks'])(
    'keeps a path on this site: %s',
    (path) => {
      expect(safeNextPath(path)).toBe(path);
    },
  );

  it.each([
    null,
    '',
    'dashboard',
    '//evil.example/login',
    '/\\evil.example',
    'https://evil.example/dashboard',
    'javascript:alert(1)',
    `/dash${String.fromCharCode(10)}board`,
    `/${String.fromCharCode(9)}/evil.example`,
    `/${'a'.repeat(600)}`,
  ])('refuses %j', (value) => {
    expect(safeNextPath(value)).toBeNull();
  });
});
