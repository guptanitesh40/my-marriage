// class-transformer reads decorator metadata; this file can be loaded before
// Nest (which also imports it), e.g. in unit tests.
import 'reflect-metadata';
import { plainToInstance, Type } from 'class-transformer';
import { IsIn, IsInt, Matches, Max, Min, validateSync } from 'class-validator';

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
}

const ENV_KEYS = [
  'NODE_ENV',
  'PORT',
  'MONGODB_URI',
  'REDIS_URL',
  'TRUST_PROXY_HOPS',
] as const satisfies (keyof Env)[];

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
  const env = plainToInstance(Env, known);
  const errors = validateSync(env, { forbidUnknownValues: true });
  if (errors.length > 0) {
    const problems = errors
      .map((error) => Object.values(error.constraints ?? { [error.property]: error.property }))
      .flat();
    throw new Error(`Invalid environment configuration: ${problems.join('; ')}`);
  }
  return env;
}
