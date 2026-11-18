import { Injectable } from '@nestjs/common';
import { HealthIndicatorService, type HealthIndicatorResult } from '@nestjs/terminus';
import type { Redis } from 'ioredis';
import { InjectRedis } from '../platform/redis.js';

@Injectable()
export class RedisHealthIndicator {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly health: HealthIndicatorService,
  ) {}

  /** Bounded by the connection's command timeout, so the probe cannot hang. */
  async pingCheck(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.health.check(key);
    try {
      await this.redis.ping();
      return indicator.up();
    } catch {
      return indicator.down();
    }
  }
}
