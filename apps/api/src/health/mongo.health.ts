import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { HealthIndicatorService, type HealthIndicatorResult } from '@nestjs/terminus';
import type { Connection } from 'mongoose';
import { Traced } from '../platform/tracing.js';

// Terminus's own MongooseHealthIndicator finds mongoose with
// import.meta.resolve at run time. Bundlers that copy only statically
// imported files (Vercel's function tracer) leave that path out, and the
// indicator then aborts the whole bootstrap. Importing the connection
// directly keeps the dependency visible to them.
@Traced()
@Injectable()
export class MongoHealthIndicator {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly health: HealthIndicatorService,
  ) {}

  async pingCheck(key: string, timeoutMS: number): Promise<HealthIndicatorResult> {
    const indicator = this.health.check(key);
    try {
      // Undefined until the first connection is made: the database is not reachable yet.
      if (this.connection.db === undefined) return indicator.down();
      await this.connection.db.command({ ping: 1 }, { timeoutMS });
      return indicator.up();
    } catch {
      return indicator.down();
    }
  }
}
