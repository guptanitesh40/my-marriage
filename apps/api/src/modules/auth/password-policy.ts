/**
 * What makes a password acceptable (PRD AUTH-01: reject weak passwords).
 * Length matters most, so there are no composition rules ("one capital, one
 * symbol"): they push people towards `Password@123`, which is exactly what the
 * checks below reject. Decision record: docs/decisions/0003-authentication.md.
 */
export const PASSWORD_MIN_LENGTH = 10;
/** Caps the hashing work an attacker can make one request cost. */
export const PASSWORD_MAX_LENGTH = 128;

export const PASSWORD_MESSAGES = {
  tooShort: `Use at least ${PASSWORD_MIN_LENGTH} characters.`,
  tooLong: `Use ${PASSWORD_MAX_LENGTH} characters or fewer.`,
  onlyDigits: 'Avoid a password made only of numbers, such as a phone number or a date.',
  common: 'This password is too easy to guess. Try three or four unrelated words.',
  isEmail: 'Do not use your email address as your password.',
} as const;

/**
 * Passwords at least ten characters long that appear near the top of public
 * breach lists, including ones common in India. Compared case-insensitively.
 */
const COMMON_PASSWORDS = new Set([
  '0123456789',
  '0987654321',
  '1029384756',
  '1111111111',
  '1122334455',
  '1234512345',
  '1234567890',
  '12345678910',
  '1234567891',
  '123456789a',
  '123456789q',
  '1234abcd!@',
  '1234qwer!@',
  '1234qwerty',
  '1357924680',
  '1q2w3e4r5t',
  '1q2w3e4r5t6y',
  '1qaz2wsx3edc',
  '1qazxsw23edc',
  '2wsx3edc4rfv',
  'a123456789',
  'a1b2c3d4e5',
  'aaaaaaaaaa',
  'abc1234567',
  'abcd123456',
  'abcdefghij',
  'abcdefg123',
  'asdfghjkl1',
  'asdfghjkl;',
  'asdfasdfasdf',
  'blink182blink182',
  'changeme123',
  'charlie123',
  'chocolate1',
  'football123',
  'iloveyou12',
  'iloveyou123',
  'jaimatadi1',
  'jaishreeram',
  'jaishriram',
  'letmein123',
  'loveyou123',
  'manchester',
  'michael123',
  'monkey12345',
  'mustang123',
  'omnamahshivaya',
  'p@ssw0rd123',
  'passw0rd123',
  'password12',
  'password123',
  'password1234',
  'princess12',
  'qazwsxedc123',
  'qazwsxedcrfv',
  'qwer1234qwer',
  'qwerty1234',
  'qwerty12345',
  'qwerty123456',
  'qwertyuiop',
  'qwertyuiop123',
  'radhakrishna',
  'sunshine12',
  'superman123',
  'trustno1234',
  'welcome123',
  'zaq12wsxcde3',
  'zxcvbnm123',
  'zxcvbnmasdfghjkl',
]);

/**
 * Words that people decorate with a few digits or symbols and think strong:
 * `Password@123`, `Wedding2027!`, `India@12345`. Such a password is rejected
 * when its letters are exactly one of these words and the rest is short.
 */
const COMMON_BASE_WORDS = new Set([
  'abcd',
  'admin',
  'asdf',
  'baby',
  'bharat',
  'cricket',
  'dragon',
  'family',
  'football',
  'ganesh',
  'hello',
  'hindustan',
  'india',
  'iloveyou',
  'krishna',
  'letmein',
  'love',
  'loveyou',
  'marriage',
  'master',
  'monkey',
  'mumbai',
  'mymarriage',
  'password',
  'passw',
  'princess',
  'qwerty',
  'sachin',
  'secret',
  'shaadi',
  'shadi',
  'sunshine',
  'welcome',
  'wedding',
]);

/** Letters left over after removing digits and symbols, e.g. "P@ssw0rd!" → "psswrd". */
function lettersOf(password: string): string {
  return password.replace(/[^\p{L}]/gu, '');
}

const LEET: Record<string, string> = { '@': 'a', '0': 'o', '1': 'i', '3': 'e', $: 's' };

/**
 * Undoes the usual character swaps inside a word: "p@ssw0rd123" →
 * "password123". Only between two letters, so a trailing "123" stays digits.
 */
function unleet(password: string): string {
  return password.replace(/(?<=\p{L})[@013$](?=\p{L})/gu, (char) => LEET[char] ?? char);
}

function isCommon(password: string): boolean {
  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) return true;

  for (const candidate of [lower, unleet(lower)]) {
    const letters = lettersOf(candidate);
    const decoration = candidate.length - letters.length;
    if (COMMON_BASE_WORDS.has(letters) && decoration <= 6) return true;
  }
  return false;
}

/**
 * Problems with a proposed password, as messages that can be shown beside the
 * field; empty when it is acceptable. `email` is the account's email, when
 * known, so the password cannot simply repeat it.
 */
export function passwordProblems(password: string, email?: string): string[] {
  const normalized = password.normalize('NFKC');
  // Count characters as people see them, not UTF-16 code units.
  const length = [...normalized].length;
  if (length < PASSWORD_MIN_LENGTH) return [PASSWORD_MESSAGES.tooShort];
  if (length > PASSWORD_MAX_LENGTH) return [PASSWORD_MESSAGES.tooLong];

  if (/^\d+$/.test(normalized)) return [PASSWORD_MESSAGES.onlyDigits];

  if (email) {
    const address = email.trim().toLowerCase();
    const localPart = address.split('@', 1)[0] ?? '';
    const lower = normalized.toLowerCase();
    if (lower === address || (localPart.length >= 4 && lower === localPart)) {
      return [PASSWORD_MESSAGES.isEmail];
    }
  }

  // "aaaaaaaaaa", "ababababab", "1212121212".
  if (new Set(normalized.toLowerCase()).size < 4 || isCommon(normalized)) {
    return [PASSWORD_MESSAGES.common];
  }
  return [];
}
