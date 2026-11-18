import { describe, expect, it } from 'vitest';
import { validateEnv } from './env.js';

const valid = {
  MONGODB_URI: 'mongodb://localhost:27017/test?replicaSet=rs0',
  REDIS_URL: 'redis://localhost:6379',
};

describe('validateEnv', () => {
  it('applies defaults and converts PORT to a number', () => {
    const env = validateEnv({ ...valid, PORT: '4100' });
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(4100);
  });

  it('rejects a missing required variable', () => {
    expect(() => validateEnv({ REDIS_URL: valid.REDIS_URL })).toThrow(/MONGODB_URI/);
  });

  it('rejects malformed values without echoing them', () => {
    const secret = 'postgres://user:hunter2@db/prod';
    expect(() => validateEnv({ ...valid, MONGODB_URI: secret })).toThrow(/MONGODB_URI/);
    try {
      validateEnv({ ...valid, MONGODB_URI: secret });
    } catch (error) {
      expect((error as Error).message).not.toContain('hunter2');
    }
  });

  it('trusts no proxy by default and accepts only a small whole number of hops', () => {
    expect(validateEnv(valid).TRUST_PROXY_HOPS).toBe(0);
    expect(validateEnv({ ...valid, TRUST_PROXY_HOPS: '1' }).TRUST_PROXY_HOPS).toBe(1);
    expect(() => validateEnv({ ...valid, TRUST_PROXY_HOPS: 'true' })).toThrow(/TRUST_PROXY_HOPS/);
    expect(() => validateEnv({ ...valid, TRUST_PROXY_HOPS: '-1' })).toThrow(/TRUST_PROXY_HOPS/);
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(() => validateEnv({ ...valid, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });
});
