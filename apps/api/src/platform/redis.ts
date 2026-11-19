import { Inject, Logger, type OnApplicationShutdown, type Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import type { Env } from '../config/env.js';

export const REDIS = Symbol('REDIS');
export const InjectRedis = () => Inject(REDIS);

/** Closes the shared connection so the process can exit cleanly. */
export class RedisLifecycle implements OnApplicationShutdown {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async onApplicationShutdown(): Promise<void> {
    await this.redis.quit().catch(() => this.redis.disconnect());
  }
}

function createRedis(url: string): Redis {
  // Fail fast. While Redis is unreachable a command is rejected after one
  // reconnect attempt instead of waiting forever, so a request gets a prompt
  // 503 rather than hanging. BullMQ workers need the opposite (wait forever);
  // they must be given their own connection, never this one.
  const redis = new Redis(url, {
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
    commandTimeout: 2000,
  });

  // ioredis emits an error on every reconnect attempt; log the outage once.
  const logger = new Logger('Redis');
  let down = false;
  redis.on('error', (error: Error) => {
    if (down) return;
    down = true;
    logger.error('Connection lost', error);
  });
  redis.on('ready', () => {
    if (!down) return;
    down = false;
    logger.log('Connection restored');
  });
  return redis;
}

/**
 * A connection for BullMQ only, never shared with request handling. A worker
 * blocks on Redis while it waits for jobs and must ride out a Redis restart
 * rather than fail, so retries are unlimited — the opposite of `REDIS`. The
 * caller closes it after closing the queues and workers that use it.
 */
export function createQueueConnection(url: string): Redis {
  return new Redis(url, { maxRetriesPerRequest: null });
}

export const redisProviders: Provider[] = [
  {
    provide: REDIS,
    inject: [ConfigService],
    useFactory: (config: ConfigService<Env, true>) =>
      createRedis(config.get('REDIS_URL', { infer: true })),
  },
  RedisLifecycle,
];
