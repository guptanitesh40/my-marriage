import { describe, expect, it } from 'vitest';
import { randomToken, sha256 } from './crypto.js';

describe('randomToken', () => {
  it('is 256 bits of URL-safe text, different every time', () => {
    const tokens = new Set(Array.from({ length: 100 }, () => randomToken()));
    expect(tokens.size).toBe(100);
    for (const token of tokens) {
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(Buffer.from(token, 'base64url')).toHaveLength(32);
    }
  });
});

describe('sha256', () => {
  it('matches the standard test vector', () => {
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});
