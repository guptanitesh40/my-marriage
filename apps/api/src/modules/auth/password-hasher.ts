import { argon2, randomBytes, timingSafeEqual, type Argon2Parameters } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Traced } from '../../platform/tracing.js';

/**
 * Argon2id cost. These are OWASP's minimum recommended settings (19 MiB,
 * two passes, one lane): about 30–60 ms per hash on a server core. Raising
 * them later is safe — `verify` reports `needsRehash` for hashes made with
 * other settings, and login re-hashes them.
 */
export const ARGON2_COST = { memory: 19_456, passes: 2, parallelism: 1 } as const;

const SALT_BYTES = 16;
const HASH_BYTES = 32;
const ARGON2_VERSION = 19;

interface ParsedHash {
  memory: number;
  passes: number;
  parallelism: number;
  salt: Buffer;
  hash: Buffer;
}

/** Same characters typed on different devices must give the same password. */
function normalize(password: string): string {
  return password.normalize('NFKC');
}

function derive(
  password: string,
  salt: Buffer,
  cost: Pick<Argon2Parameters, 'memory' | 'passes' | 'parallelism'>,
  tagLength: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // Runs on the libuv thread pool, so hashing never blocks the event loop.
    argon2(
      'argon2id',
      { message: normalize(password), nonce: salt, tagLength, ...cost },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}

/** `$argon2id$v=19$m=…,t=…,p=…$<salt>$<hash>` — the PHC string format used by every Argon2 library. */
function encode(parsed: ParsedHash): string {
  const b64 = (buffer: Buffer) => buffer.toString('base64').replace(/=+$/, '');
  return (
    `$argon2id$v=${ARGON2_VERSION}$m=${parsed.memory},t=${parsed.passes},p=${parsed.parallelism}` +
    `$${b64(parsed.salt)}$${b64(parsed.hash)}`
  );
}

const PHC = /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/;

function parse(encoded: string): ParsedHash | null {
  const match = PHC.exec(encoded);
  if (!match) return null;
  const [, memory, passes, parallelism, salt, hash] = match;
  if (!memory || !passes || !parallelism || !salt || !hash) return null;
  return {
    memory: Number(memory),
    passes: Number(passes),
    parallelism: Number(parallelism),
    salt: Buffer.from(salt, 'base64'),
    hash: Buffer.from(hash, 'base64'),
  };
}

export interface VerifyResult {
  valid: boolean;
  /** The hash was made with other cost settings; store a fresh `hash()` of this password. */
  needsRehash: boolean;
}

/**
 * Argon2id password hashing with Node's built-in implementation (Node 24.7+),
 * so no native dependency is needed. Only the encoded hash is ever stored.
 */
@Traced()
@Injectable()
export class PasswordHasher {
  private dummy?: Promise<string>;

  async hash(password: string): Promise<string> {
    const salt = randomBytes(SALT_BYTES);
    const hash = await derive(password, salt, ARGON2_COST, HASH_BYTES);
    return encode({ ...ARGON2_COST, salt, hash });
  }

  async verify(password: string, encoded: string): Promise<VerifyResult> {
    const parsed = parse(encoded);
    if (!parsed || parsed.hash.length < 16) return { valid: false, needsRehash: false };
    const candidate = await derive(password, parsed.salt, parsed, parsed.hash.length);
    const valid = timingSafeEqual(candidate, parsed.hash);
    const needsRehash =
      parsed.memory !== ARGON2_COST.memory ||
      parsed.passes !== ARGON2_COST.passes ||
      parsed.parallelism !== ARGON2_COST.parallelism ||
      parsed.hash.length !== HASH_BYTES;
    return { valid, needsRehash: valid && needsRehash };
  }

  /**
   * Spends the same time as checking a real password, for sign-in attempts
   * with an unknown email. Without it, the faster response would reveal
   * which emails have accounts.
   */
  async verifyAgainstDummy(password: string): Promise<void> {
    this.dummy ??= this.hash(randomBytes(16).toString('hex'));
    await this.verify(password, await this.dummy);
  }
}
