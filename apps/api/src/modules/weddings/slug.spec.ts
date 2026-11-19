import { describe, expect, it } from 'vitest';
import { isFallbackBase, SLUG_PATTERN, slugBase, withSuffix } from './slug.js';

describe('slugBase', () => {
  it('joins the two names in lowercase words', () => {
    expect(slugBase('Ananya', 'Arjun')).toBe('ananya-arjun');
    expect(slugBase('Priya Rani', "D'Souza")).toBe('priya-rani-d-souza');
  });

  it('drops accents and anything that is not a letter or digit', () => {
    // "Mehtā" with a combining macron, written as an escape so it survives editors.
    expect(slugBase(`Mehta${String.fromCharCode(0x0304)}`, 'Zoë!!')).toBe('mehta-zoe');
  });

  it('keeps the names it can and falls back when it can keep none', () => {
    const devanagari = String.fromCharCode(0x0905, 0x0928, 0x0928, 0x094d, 0x092f, 0x093e);
    expect(slugBase(devanagari, 'Arjun')).toBe('arjun');
    expect(slugBase(devanagari, devanagari)).toBe('wedding');
    expect(isFallbackBase(slugBase(devanagari, '!!'))).toBe(true);
  });

  it('stays short enough for a suffix, without a trailing hyphen', () => {
    const base = slugBase('A'.repeat(40), 'B'.repeat(40));
    expect(base.length).toBeLessThanOrEqual(48);
    expect(base).toMatch(SLUG_PATTERN);
    expect(slugBase(`${'a'.repeat(47)} b`, 'c')).toBe('a'.repeat(47));
  });
});

describe('withSuffix', () => {
  it('adds four random lowercase letters or digits', () => {
    const slug = withSuffix('ananya-arjun');
    expect(slug).toMatch(/^ananya-arjun-[a-z0-9]{4}$/);
    expect(slug).toMatch(SLUG_PATTERN);
    expect(withSuffix('ananya-arjun', () => 0)).toBe('ananya-arjun-aaaa');
  });
});
