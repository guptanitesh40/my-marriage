import { describe, expect, it } from 'vitest';
import { PASSWORD_MESSAGES, passwordProblems } from './password-policy.js';

describe('passwordProblems', () => {
  it.each([
    'correct horse battery',
    'mehendi-at-the-haveli',
    'Ananya&Arjun-Jaipur',
    'wedding planning is fun',
    'ठंडी चाय और समोसा', // Hindi passphrases are welcome
    '7Kq!m2Vx9#pL',
  ])('accepts %j', (password) => {
    expect(passwordProblems(password, 'priya@example.com')).toEqual([]);
  });

  it('requires 10 characters, counted as people see them', () => {
    expect(passwordProblems('short pw1')).toEqual([PASSWORD_MESSAGES.tooShort]);
    // Nine Devanagari code points; still too short, even though UTF-8 bytes are many.
    expect(passwordProblems('नमस्तेदोस्त'.slice(0, 9))).toEqual([PASSWORD_MESSAGES.tooShort]);
    expect(passwordProblems('a'.repeat(129))).toEqual([PASSWORD_MESSAGES.tooLong]);
  });

  it.each(['9876543210', '20271213201', '1234567890123'])(
    'rejects a number-only password such as a phone number (%s)',
    (password) => {
      expect(passwordProblems(password)).toEqual([PASSWORD_MESSAGES.onlyDigits]);
    },
  );

  it.each([
    'qwertyuiop',
    'Password123',
    'PASSWORD1234',
    'Password@123',
    'P@ssw0rd123',
    'Wedding@2027',
    'india@12345',
    'MyMarriage2027',
    'iloveyou123',
    'aaaaaaaaaaaa',
    'abababababab',
    '1q2w3e4r5t',
  ])('rejects the easily guessed %j', (password) => {
    expect(passwordProblems(password)).toEqual([PASSWORD_MESSAGES.common]);
  });

  it('does not reject a long passphrase merely for containing a common word', () => {
    expect(passwordProblems('our wedding in december')).toEqual([]);
    expect(passwordProblems('Password-manager-generated-7Kq')).toEqual([]);
  });

  it('rejects the account email or its name part', () => {
    expect(passwordProblems('priya.sharma@example.com', 'Priya.Sharma@example.com')).toEqual([
      PASSWORD_MESSAGES.isEmail,
    ]);
    expect(passwordProblems('priya.sharma', 'priya.sharma@example.com')).toEqual([
      PASSWORD_MESSAGES.isEmail,
    ]);
  });
});
