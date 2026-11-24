import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, type HealthCheckResult } from '@nestjs/terminus';
import { Public } from '../modules/auth/auth.decorators.js';
import { ApiDataResponse } from '../platform/response-envelope.js';
import { HealthDto } from './health.dto.js';
import { MongoHealthIndicator } from './mongo.health.js';
import { RedisHealthIndicator } from './redis.health.js';

// Terminus would document its own response shapes, but what is actually sent
// is our envelope (and, on failure, our error envelope), so we document that.
const noTerminusDocs = { swaggerDocumentation: false };

function toDto(result: HealthCheckResult): HealthDto {
  return { status: 'ok', checks: Object.keys(result.details) };
}

// Probes come from the load balancer, which has no session.
@ApiTags('Operations')
@Public()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly mongo: MongoHealthIndicator,
    private readonly redis: RedisHealthIndicator,
  ) {}

  /** The process is up. Must not touch dependencies, or an outage would restart healthy tasks. */
  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiDataResponse(HealthDto)
  @HealthCheck(noTerminusDocs)
  async live(): Promise<HealthDto> {
    return toDto(await this.health.check([]));
  }

  /** The process can serve traffic: MongoDB and Redis are reachable. Otherwise 503. */
  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe for dependency health' })
  @ApiDataResponse(HealthDto)
  @HealthCheck(noTerminusDocs)
  async ready(): Promise<HealthDto> {
    return toDto(
      await this.health.check([
        () => this.mongo.pingCheck('mongodb', 2000),
        () => this.redis.pingCheck('redis'),
      ]),
    );
  }
}
