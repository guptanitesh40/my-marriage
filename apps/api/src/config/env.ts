// class-transformer reads decorator metadata; this file can be loaded before
// Nest (which also imports it), e.g. in unit tests.
import 'reflect-metadata';
import { plainToInstance, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  Min,
  ValidateIf,
  validateSync,
} from 'class-validator';
import { TRACE_MODES, type TraceMode } from '../platform/tracing.js';

export const MAIL_TRANSPORTS = ['smtp', 'file', 'memory'] as const;
export type MailTransportName = (typeof MAIL_TRANSPORTS)[number];

/**
 * Every environment variable the API and worker read. Add new variables here
 * (and to .env.example) — never read process.env anywhere else.
 */
export class Env {
  @IsIn(['development', 'test', 'production'])
  NODE_ENV: 'development' | 'test' | 'production' = 'development';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 4000;

  @Matches(/^mongodb(\+srv)?:\/\/.+/, { message: 'MONGODB_URI must be a mongodb:// URI' })
  MONGODB_URI: string;

  @Matches(/^rediss?:\/\/.+/, { message: 'REDIS_URL must be a redis:// URL' })
  REDIS_URL: string;

  /**
   * Number of reverse proxies in front of the API whose X-Forwarded-For entry
   * is trusted: 0 when clients connect directly (local development), 1 behind
   * a single load balancer. See `configureApp`.
   */
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(5)
  TRUST_PROXY_HOPS: number = 0;

  /**
   * The public origin of the web app, e.g. https://app.example.com. Links in
   * emails point here, and it is the one origin trusted by the CSRF check.
   */
  @Matches(/^https?:\/\/[^/?#\s]+$/, {
    message: 'WEB_ORIGIN must be an origin such as https://example.com, without a path',
  })
  WEB_ORIGIN: string = 'http://localhost:3000';

  /**
   * How email leaves the worker: `smtp` (Gmail) in production and staging,
   * and locally to send real email; `file`
   * writes each email to MAIL_FILE_DIR for local development; `memory` keeps
   * them in the process for integration tests.
   */
  @IsIn(MAIL_TRANSPORTS)
  MAIL_TRANSPORT: MailTransportName = 'file';

  /** Directory for MAIL_TRANSPORT=file, relative to the working directory. */
  @IsString()
  @IsNotEmpty()
  MAIL_FILE_DIR: string = '.mail';

  /** SMTP server for MAIL_TRANSPORT=smtp. Gmail's by default. */
  @IsString()
  @IsNotEmpty()
  SMTP_HOST: string = 'smtp.gmail.com';

  /** 465 (TLS from the start, the default) or 587 (STARTTLS). */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  SMTP_PORT: number = 465;

  /** The account that sends, e.g. the Gmail address. Required for smtp. */
  @ValidateIf((env: Env) => env.MAIL_TRANSPORT === 'smtp')
  @Matches(/^[^<>\s@]+@[^<>\s@]+$/, {
    message: 'SMTP_USER is required when MAIL_TRANSPORT is smtp, as an email address',
  })
  SMTP_USER?: string;

  /**
   * Required for smtp. For Gmail, an App Password (Google Account → Security
   * → 2-Step Verification → App passwords), never the account password. A
   * secret: from AWS Secrets Manager outside local development.
   */
  @ValidateIf((env: Env) => env.MAIL_TRANSPORT === 'smtp')
  @IsString()
  @IsNotEmpty({ message: 'SMTP_PASSWORD is required when MAIL_TRANSPORT is smtp' })
  SMTP_PASSWORD?: string;

  /**
   * Sender, e.g. `My Marriage <hello@gmail.com>`. With smtp it defaults to
   * `My Marriage <SMTP_USER>`; Gmail sends only from the account's own
   * address or an alias added to it ("Send mail as").
   */
  @ValidateIf((env: Env) => env.MAIL_FROM !== undefined)
  @Matches(/^([^<>]+<[^<>\s@]+@[^<>\s@]+>|[^<>\s@]+@[^<>\s@]+)$/, {
    message: 'MAIL_FROM must be an address or "Name <address>"',
  })
  MAIL_FROM?: string;

  /**
   * Request tracing (src/platform/tracing.ts): `full` logs every request's
   * path through the code with its values — development only, as it logs
   * names and email addresses; `errors` logs the path of failed requests,
   * without values; `off`. Defaults to `full` in development, `errors` in
   * production and `off` in tests.
   */
  @IsIn(TRACE_MODES)
  LOG_TRACE: TraceMode;
}

const DEFAULT_TRACE_MODE: Record<string, TraceMode> = {
  development: 'full',
  production: 'errors',
  test: 'off',
};

const ENV_KEYS = [
  'NODE_ENV',
  'PORT',
  'MONGODB_URI',
  'REDIS_URL',
  'TRUST_PROXY_HOPS',
  'WEB_ORIGIN',
  'MAIL_TRANSPORT',
  'MAIL_FILE_DIR',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASSWORD',
  'MAIL_FROM',
  'LOG_TRACE',
] as const satisfies (keyof Env)[];

/** Rules that span several variables, which class-validator cannot express. */
function crossFieldProblems(env: Env): string[] {
  const problems: string[] = [];
  // Production and staging both run as NODE_ENV=production; neither may
  // silently drop or locally store the emails people are waiting for.
  if (env.NODE_ENV === 'production' && env.MAIL_TRANSPORT !== 'smtp') {
    problems.push('MAIL_TRANSPORT must be smtp when NODE_ENV is production');
  }
  return problems;
}

/**
 * Fails fast at startup. The error names the offending variables but never
 * echoes their values, since they can be secrets.
 */
export function validateEnv(raw: Record<string, unknown>): Env {
  // Only declared variables are read; unset or empty ones fall back to defaults.
  const known = Object.fromEntries(
    ENV_KEYS.filter((key) => raw[key] !== undefined && raw[key] !== '').map((key) => [
      key,
      raw[key],
    ]),
  );
  const nodeEnv = typeof known.NODE_ENV === 'string' ? known.NODE_ENV : 'development';
  known.LOG_TRACE ??= DEFAULT_TRACE_MODE[nodeEnv] ?? 'off';
  const env = plainToInstance(Env, known);
  const errors = validateSync(env, { forbidUnknownValues: true });
  const problems = [
    ...errors
      .map((error) => Object.values(error.constraints ?? { [error.property]: error.property }))
      .flat(),
    ...(errors.length === 0 ? crossFieldProblems(env) : []),
  ];
  if (problems.length > 0) {
    throw new Error(`Invalid environment configuration: ${problems.join('; ')}`);
  }
  if (env.MAIL_TRANSPORT === 'smtp' && env.MAIL_FROM === undefined) {
    env.MAIL_FROM = `My Marriage <${env.SMTP_USER}>`;
  }
  return env;
}
