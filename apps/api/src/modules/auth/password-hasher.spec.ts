import { argon2Sync, randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { PasswordHasher } from './password-hasher.js';

const hasher = new PasswordHasher();

describe('PasswordHasher', () => {
  it('stores an Argon2id PHC string with a random salt', async () => {
    const first = await hasher.hash('correct horse battery');
    const second = await hasher.hash('correct horse battery');
    expect(first).toMatch(
      /^\$argon2id\$v=19\$m=19456,t=2,p=1\$[A-Za-z0-9+/]{22}\$[A-Za-z0-9+/]{43}$/,
    );
    expect(first).not.toBe(second);
    expect(first).not.toContain('correct horse battery');
  });

  it('accepts the right password and rejects any other', async () => {
    const encoded = await hasher.hash('correct horse battery');
    expect(await hasher.verify('correct horse battery', encoded)).toEqual({
      valid: true,
      needsRehash: false,
    });
    expect((await hasher.verify('correct horse batterY', encoded)).valid).toBe(false);
    expect((await hasher.verify('', encoded)).valid).toBe(false);
  });

  it('treats the same characters typed differently as one password', async () => {
    // "\u00e9" as one code point (NFC) and as "e" + combining accent (NFD).
    const encoded = await hasher.hash('caf\u00e9 au lait 2027');
    expect((await hasher.verify('cafe\u0301 au lait 2027', encoded)).valid).toBe(true);
  });

  it('asks for a re-hash when the stored hash used other cost settings', async () => {
    const salt = randomBytes(16);
    const hash = argon2Sync('argon2id', {
      message: 'correct horse battery',
      nonce: salt,
      memory: 8192,
      passes: 1,
      parallelism: 1,
      tagLength: 32,
    });
    const b64 = (buffer: Buffer) => buffer.toString('base64').replace(/=+$/, '');
    const weaker = `$argon2id$v=19$m=8192,t=1,p=1$${b64(salt)}$${b64(hash)}`;

    expect(await hasher.verify('correct horse battery', weaker)).toEqual({
      valid: true,
      needsRehash: true,
    });
    // A wrong password never asks for a re-hash.
    expect(await hasher.verify('wrong password here', weaker)).toEqual({
      valid: false,
      needsRehash: false,
    });
  });

  it('rejects malformed or foreign hashes instead of throwing', async () => {
    for (const encoded of ['', 'plaintext', '$argon2i$v=19$m=19456,t=2,p=1$abc$def', '$2b$10$x']) {
      expect(await hasher.verify('anything at all', encoded)).toEqual({
        valid: false,
        needsRehash: false,
      });
    }
  });

  it('can spend the time of a real check without a stored hash', async () => {
    await expect(hasher.verifyAgainstDummy('anything at all')).resolves.toBeUndefined();
  });
});
