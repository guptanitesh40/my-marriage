import { describe, expect, it } from 'vitest';
import { normalizeEmail } from './email.js';

describe('normalizeEmail', () => {
  it('trims and lower-cases, so one address is one account', () => {
    expect(normalizeEmail('  Priya.Sharma@Example.COM ')).toBe('priya.sharma@example.com');
  });

  it('keeps dots and +tags, which are different addresses to most providers', () => {
    expect(normalizeEmail('priya.sharma+wedding@gmail.com')).toBe('priya.sharma+wedding@gmail.com');
  });

  it('gives the same result for differently encoded accented characters', () => {
    expect(normalizeEmail('Jose\u0301@example.com')).toBe(normalizeEmail('jos\u00e9@example.com'));
  });
});
