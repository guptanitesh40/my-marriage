import type { Request } from 'express';
import { describe, expect, it } from 'vitest';
import { readSessionCookie } from './session-cookie.js';

const token = 'Xk29abcdefghijklmnopqrstuvwxyz0123456789_-A';

function withCookie(cookie?: string): Request {
  return { headers: cookie === undefined ? {} : { cookie } } as Request;
}

describe('readSessionCookie', () => {
  it('finds the session among other cookies', () => {
    expect(readSessionCookie(withCookie(`theme=dark; mm_session=${token}; other=1`))).toBe(token);
  });

  it('returns nothing without the cookie', () => {
    expect(readSessionCookie(withCookie())).toBeUndefined();
    expect(readSessionCookie(withCookie('theme=dark'))).toBeUndefined();
    expect(readSessionCookie(withCookie('mm_session_old=abc'))).toBeUndefined();
  });

  it('ignores values we could never have issued', () => {
    expect(readSessionCookie(withCookie('mm_session='))).toBeUndefined();
    expect(readSessionCookie(withCookie('mm_session=%7B%22%24ne%22%3A1%7D'))).toBeUndefined();
    expect(readSessionCookie(withCookie(`mm_session=${'a'.repeat(500)}`))).toBeUndefined();
  });
});
