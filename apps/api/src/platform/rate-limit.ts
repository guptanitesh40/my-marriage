import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Redis } from 'ioredis';
import { sha256 } from './crypto.js';
import { InjectRedis } from './redis.js';
import { Traced } from './tracing.js';

/** A named limit: at most `limit` hits per `windowSeconds` for one subject. */
export interface RateLimitRule {
  /** Part of the Redis key, e.g. `login-failures-account`. Never reuse for another rule. */
  name: string;
  limit: number;
  windowSeconds: number;
}

/** One hit against `rule` for `subject`. */
export interface RateLimitHit {
  rule: RateLimitRule;
  subject: string;
}

export interface RateLimitState {
  allowed: boolean;
  /** Seconds until the current window ends; 0 when nothing is counted. */
  retryAfterSeconds: number;
}

/** 429 in the standard envelope, with Retry-After and the wait in `details`. */
export class RateLimitedException extends HttpException {
  constructor(retryAfterSeconds: number) {
    super(
      {
        code: 'RATE_LIMITED',
        message: 'Too many attempts. Please wait and try again.',
        details: { retryAfterSeconds },
        retryAfterSeconds,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

// Counts a hit and starts the window on the first one, atomically, so
// concurrent requests can never both see a count below the limit.
const HIT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('TTL', KEYS[1])
return { count, ttl }
`;

// Decrements only a live, positive counter: a window that has ended stays
// ended rather than coming back as a key with no expiry.
const REFUND_SCRIPT = `
local count = tonumber(redis.call('GET', KEYS[1]) or '0')
if count > 0 then redis.call('DECR', KEYS[1]) end
return 0
`;

/**
 * Fixed-window counters in Redis, shared by every API instance. Subjects are
 * hashed into the key, so Redis never holds an email address or IP address.
 *
 * If Redis is unreachable this throws 503 rather than letting requests
 * through: an outage must not switch off the protection against password
 * guessing (decision 0003).
 */
@Traced()
@Injectable()
export class RateLimiter {
  private readonly logger = new Logger(RateLimiter.name);

  constructor(@InjectRedis() private readonly redis: Redis) {}

  /** Counts one hit for `subject`; `allowed` is false once the limit is passed. */
  async hit(rule: RateLimitRule, subject: string): Promise<RateLimitState> {
    const result = await this.run(() =>
      this.redis.eval(HIT_SCRIPT, 1, this.key(rule, subject), rule.windowSeconds),
    );
    const [count, ttl] = Array.isArray(result) ? result.map(Number) : [];
    if (count === undefined || ttl === undefined || Number.isNaN(count)) {
      throw new Error('Unexpected reply from the rate limit script');
    }
    return {
      allowed: count <= rule.limit,
      retryAfterSeconds: ttl > 0 ? ttl : rule.windowSeconds,
    };
  }

  /** Counts one hit and throws 429 once `subject` is over the limit. */
  async consume(rule: RateLimitRule, subject: string): Promise<void> {
    const state = await this.hit(rule, subject);
    if (!state.allowed) throw new RateLimitedException(state.retryAfterSeconds);
  }

  /**
   * Counts one hit against each limit, runs `work`, and gives the hits back
   * if any limit is passed or `work` fails, so only work that happened is
   * counted. For budgets of things done (emails sent), not attempts made:
   * never use it for limits that slow guessing, where failures must count.
   * Hits are counted before `work` runs, so simultaneous requests can never
   * all pass a limit they would pass together.
   */
  async spend<T>(hits: readonly RateLimitHit[], work: () => Promise<T>): Promise<T> {
    const counted: RateLimitHit[] = [];
    try {
      for (const hit of hits) {
        const state = await this.hit(hit.rule, hit.subject);
        counted.push(hit);
        if (!state.allowed) throw new RateLimitedException(state.retryAfterSeconds);
      }
      return await work();
    } catch (error) {
      // Best effort: a failed refund must not hide why the request failed.
      await Promise.allSettled(counted.map((hit) => this.refund(hit.rule, hit.subject)));
      throw error;
    }
  }

  /** Forgets every hit for `subject`, e.g. failed sign-ins after a successful one. */
  async reset(rule: RateLimitRule, subject: string): Promise<void> {
    await this.run(() => this.redis.del(this.key(rule, subject)));
  }

  /** Takes back one hit, without touching the window's expiry. */
  private async refund(rule: RateLimitRule, subject: string): Promise<void> {
    await this.run(() => this.redis.eval(REFUND_SCRIPT, 1, this.key(rule, subject)));
  }

  private key(rule: RateLimitRule, subject: string): string {
    return `rl:${rule.name}:${sha256(subject).slice(0, 32)}`;
  }

  private async run<T>(command: () => Promise<T>): Promise<T> {
    try {
      return await command();
    } catch (error) {
      this.logger.error('Rate limit check failed; refusing the request', error);
      throw new ServiceUnavailableException({
        code: 'DEPENDENCY_UNAVAILABLE',
        message: 'This service is temporarily unavailable. Please try again shortly.',
      });
    }
  }
}
