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
    const production = {
      ...valid,
      NODE_ENV: 'production',
      MAIL_TRANSPORT: 'smtp',
      GUEST_LINK_SECRET: 'a'.repeat(48),
      S3_BUCKET: 'my-marriage-app',
      WEB_ORIGIN: 'https://app.example.com',
    };
    const smtp = { SMTP_USER: 'hello@gmail.com', SMTP_PASSWORD: 'x' };
    expect(validateEnv({ ...production, ...smtp }).LOG_TRACE).toBe('errors');
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

  it('requires an account and an App Password for SMTP, without echoing the password', () => {
    expect(() => validateEnv({ ...valid, MAIL_TRANSPORT: 'smtp' })).toThrow(/SMTP_USER/);
    expect(() =>
      validateEnv({ ...valid, MAIL_TRANSPORT: 'smtp', SMTP_USER: 'hello@gmail.com' }),
    ).toThrow(/SMTP_PASSWORD/);
    expect(() =>
      validateEnv({ ...valid, MAIL_TRANSPORT: 'smtp', SMTP_USER: 'abcd efgh', SMTP_PASSWORD: 'x' }),
    ).toThrow(/SMTP_USER/);
    try {
      validateEnv({ ...valid, MAIL_TRANSPORT: 'smtp', SMTP_PASSWORD: 'app-secret-123' });
    } catch (error) {
      expect((error as Error).message).not.toContain('app-secret-123');
    }
  });

  it('sends through Gmail by default, as the account itself unless MAIL_FROM says otherwise', () => {
    const smtp = {
      ...valid,
      MAIL_TRANSPORT: 'smtp',
      SMTP_USER: 'hello@gmail.com',
      SMTP_PASSWORD: 'x',
    };
    const env = validateEnv(smtp);
    expect(env).toMatchObject({
      SMTP_HOST: 'smtp.gmail.com',
      SMTP_PORT: 465,
      MAIL_FROM: 'My Marriage <hello@gmail.com>',
    });
    expect(validateEnv({ ...smtp, SMTP_PORT: '587' }).SMTP_PORT).toBe(587);
    expect(validateEnv({ ...smtp, MAIL_FROM: 'Wedding <alias@example.com>' }).MAIL_FROM).toBe(
      'Wedding <alias@example.com>',
    );
    expect(() => validateEnv({ ...smtp, MAIL_FROM: 'not an address' })).toThrow(/MAIL_FROM/);
  });

  it('refuses to run production without real email delivery', () => {
    expect(() => validateEnv({ ...valid, NODE_ENV: 'production' })).toThrow(
      /MAIL_TRANSPORT must be smtp/,
    );
  });

  it('needs a long guest link secret in production, and only there', () => {
    const smtp = { MAIL_TRANSPORT: 'smtp', SMTP_USER: 'hello@gmail.com', SMTP_PASSWORD: 'x' };
    expect(() => validateEnv({ ...valid, ...smtp, NODE_ENV: 'production' })).toThrow(
      /GUEST_LINK_SECRET is required/,
    );
    expect(() => validateEnv({ ...valid, GUEST_LINK_SECRET: 'too short' })).toThrow(
      /at least 32 characters/,
    );
    expect(validateEnv(valid).GUEST_LINK_SECRET).toBeUndefined();
  });

  it('keeps files in S3 in production, and allows a local folder elsewhere', () => {
    const production = {
      ...valid,
      NODE_ENV: 'production',
      MAIL_TRANSPORT: 'smtp',
      SMTP_USER: 'hello@gmail.com',
      SMTP_PASSWORD: 'x',
      GUEST_LINK_SECRET: 'a'.repeat(48),
      WEB_ORIGIN: 'https://app.example.com',
    };
    expect(() => validateEnv(production)).toThrow(/S3_BUCKET is required/);
    expect(validateEnv({ ...production, S3_BUCKET: 'my-marriage-app' }).AWS_REGION).toBe(
      'ap-south-1',
    );
    expect(() => validateEnv({ ...valid, S3_BUCKET: 'My Bucket!' })).toThrow(/S3_BUCKET/);
    expect(validateEnv(valid).S3_BUCKET).toBeUndefined();
  });

  it('never sends production links to a local address', () => {
    const production = {
      ...valid,
      NODE_ENV: 'production',
      MAIL_TRANSPORT: 'smtp',
      SMTP_USER: 'hello@gmail.com',
      SMTP_PASSWORD: 'x',
      GUEST_LINK_SECRET: 'a'.repeat(48),
      S3_BUCKET: 'my-marriage-app',
    };
    // No fallback: production must say where the web app is.
    expect(() => validateEnv(production)).toThrow(/WEB_ORIGIN is required/);
    expect(() => validateEnv({ ...production, WEB_ORIGIN: '' })).toThrow(/WEB_ORIGIN is required/);
    for (const local of [
      'http://localhost:3000',
      'https://localhost:3000',
      'https://app.localhost',
      'https://127.0.0.1:3000',
      'https://0.0.0.0',
      'https://[::1]:3000',
      'https://192.168.1.20:3000',
      'https://10.0.0.5',
      'https://172.20.0.2',
      'http://app.example.com',
    ]) {
      expect(() => validateEnv({ ...production, WEB_ORIGIN: local }), local).toThrow(
        /WEB_ORIGIN must be the public https address/,
      );
    }
    expect(validateEnv({ ...production, WEB_ORIGIN: 'https://app.example.com' }).WEB_ORIGIN).toBe(
      'https://app.example.com',
    );
    expect(validateEnv({ ...valid, NODE_ENV: 'test' }).WEB_ORIGIN).toBe('http://localhost:3000');
  });
});
