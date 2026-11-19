import 'reflect-metadata';
import { ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { afterEach, describe, expect, it } from 'vitest';
import { configureTracing, renderTrace, startTrace, Traced, type Trace } from './tracing.js';

@Traced()
class Hasher {
  hash(password: string): Promise<string> {
    return Promise.resolve(`$argon2id$${password}`);
  }
}

@Traced()
class Accounts {
  constructor(private readonly hasher: Hasher) {}

  async signup(dto: { email: string; password: string }): Promise<{ id: string; token: string }> {
    await this.hasher.hash(dto.password);
    return { id: new Types.ObjectId('6740a1b2c3d4e5f601234567').toHexString(), token: 'raw-token' };
  }

  async both(): Promise<void> {
    await Promise.all([this.lookup('6740a1b2c3d4e5f601234567'), this.lookup('a@b.c')]);
  }

  lookup(id: string): Promise<number> {
    return Promise.resolve(id.length);
  }

  invite(): never {
    throw new ConflictException({
      code: 'OWNER_LIMIT',
      message: 'This wedding already has two owners.',
    });
  }

  get name(): string {
    return 'accounts';
  }
}

/** Runs `fn` in a trace (a throw or rejection is the step's error) and returns its lines. */
async function traced(fn: () => unknown): Promise<string[]> {
  let captured: Trace | undefined;
  await startTrace('GET /test', async (trace) => {
    captured = trace;
    await Promise.resolve()
      .then(fn)
      .catch(() => undefined);
  });
  return captured ? renderTrace(captured) : [];
}

const accounts = new Accounts(new Hasher());

describe('tracing', () => {
  afterEach(() => configureTracing('off'));

  it('records nested calls in order, with masked values and timings', async () => {
    configureTracing('full');
    const lines = await traced(() => accounts.signup({ email: 'a@b.c', password: 'hunter22' }));
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(
      /^└─ Accounts\.signup\(\{ email: 'a@b\.c', password: '\[REDACTED\]' \}\) {2}[\d.]+ms → \{ id: '6740a1b2c3d4e5f601234567', token: '\[REDACTED\]' \}$/,
    );
    // A string passed on its own may be a secret: only its length is shown,
    // in the arguments and in the result.
    expect(lines[1]).toMatch(/^ {3}└─ Hasher\.hash\(\[string ×8\]\) {2}[\d.]+ms → \[string ×18\]$/);
    expect(lines.join('\n')).not.toContain('hunter22');
  });

  it('shows parallel calls as siblings and IDs as they are', async () => {
    configureTracing('full');
    const lines = await traced(() => accounts.both());
    expect(lines[1]).toMatch(/├─ Accounts\.lookup\('6740a1b2c3d4e5f601234567'\)/);
    expect(lines[2]).toMatch(/└─ Accounts\.lookup\(\[string ×5\]\)/);
  });

  it('records where an error was thrown, with its status and code', async () => {
    configureTracing('full');
    const lines = await traced(() => accounts.invite());
    expect(lines[0]).toMatch(
      /✗ ConflictException 409 OWNER_LIMIT: This wedding already has two owners\.$/,
    );
  });

  it('keeps names, timings and error codes but no values in errors mode', async () => {
    configureTracing('errors');
    const signup = await traced(() => accounts.signup({ email: 'a@b.c', password: 'hunter22' }));
    expect(signup[0]).toMatch(/^└─ Accounts\.signup\(\) {2}[\d.]+ms$/);
    const invite = await traced(() => accounts.invite());
    expect(invite[0]).toMatch(/✗ ConflictException 409 OWNER_LIMIT$/);
  });

  it('records nothing when off, and nothing outside a trace', async () => {
    configureTracing('off');
    expect(await traced(() => accounts.signup({ email: 'a@b.c', password: 'x' }))).toEqual([]);
    configureTracing('full');
    await expect(accounts.lookup('abc')).resolves.toBe(3);
  });

  it('keeps getters and the metadata method decorators put on functions', () => {
    const key = 'test:route';
    class Decorated {
      run(): string {
        return 'ran';
      }
    }
    const method = (): unknown =>
      Object.getOwnPropertyDescriptor(Decorated.prototype, 'run')?.value;
    Reflect.defineMetadata(key, '/path', method() as object);
    Traced()(Decorated);
    expect(method()).not.toBeUndefined();
    expect(Reflect.getMetadata(key, method() as object)).toBe('/path');
    expect(new Decorated().run()).toBe('ran');
    expect(accounts.name).toBe('accounts');
  });
});
