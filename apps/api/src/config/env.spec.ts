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

  it('traces every request in development, failures in production, nothing in tests', () => {
    expect(validateEnv(valid).LOG_TRACE).toBe('full');
    expect(validateEnv({ ...valid, NODE_ENV: 'test' }).LOG_TRACE).toBe('off');
    const production = { ...valid, NODE_ENV: 'production', MAIL_TRANSPORT: 'resend' };
    const resend = { RESEND_API_KEY: 're_test', MAIL_FROM: 'a@example.com' };
    expect(validateEnv({ ...production, ...resend }).LOG_TRACE).toBe('errors');
    expect(validateEnv({ ...valid, LOG_TRACE: 'off' }).LOG_TRACE).toBe('off');
    expect(() => validateEnv({ ...valid, LOG_TRACE: 'verbose' })).toThrow(/LOG_TRACE/);
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(() => validateEnv({ ...valid, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });

  it('defaults to the local web origin and writing emails to files', () => {
    const env = validateEnv(valid);
    expect(env.WEB_ORIGIN).toBe('http://localhost:3000');
    expect(env.MAIL_TRANSPORT).toBe('file');
    expect(env.MAIL_FILE_DIR).toBe('.mail');
  });

  it('accepts only a bare origin as WEB_ORIGIN', () => {
    expect(validateEnv({ ...valid, WEB_ORIGIN: 'https://app.example.com' }).WEB_ORIGIN).toBe(
      'https://app.example.com',
    );
    expect(() => validateEnv({ ...valid, WEB_ORIGIN: 'https://app.example.com/' })).toThrow(
      /WEB_ORIGIN/,
    );
    expect(() => validateEnv({ ...valid, WEB_ORIGIN: 'app.example.com' })).toThrow(/WEB_ORIGIN/);
  });

  it('requires a key and a sender for Resend, without echoing the key', () => {
    expect(() => validateEnv({ ...valid, MAIL_TRANSPORT: 'resend' })).toThrow(/RESEND_API_KEY/);
    expect(() =>
      validateEnv({ ...valid, MAIL_TRANSPORT: 'resend', RESEND_API_KEY: 're_secret123' }),
    ).toThrow(/MAIL_FROM/);
    try {
      validateEnv({ ...valid, MAIL_TRANSPORT: 'resend', RESEND_API_KEY: 're_secret123' });
    } catch (error) {
      expect((error as Error).message).not.toContain('re_secret123');
    }
    const env = validateEnv({
      ...valid,
      MAIL_TRANSPORT: 'resend',
      RESEND_API_KEY: 're_secret123',
      MAIL_FROM: 'My Marriage <hello@example.com>',
    });
    expect(env.MAIL_FROM).toBe('My Marriage <hello@example.com>');
  });

  it('refuses to run production without real email delivery', () => {
    expect(() => validateEnv({ ...valid, NODE_ENV: 'production' })).toThrow(
      /MAIL_TRANSPORT must be resend/,
    );
  });
});
