import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import type { Env } from '../../config/env.js';
import { createQueueConnection } from '../../platform/redis.js';
import { logTrace, startTrace, traceMode, Traced } from '../../platform/tracing.js';
import { SWEEP_MINUTES } from './media-policy.js';
import { MediaExportsService } from './media-exports.service.js';
import { UploadsService } from './uploads.service.js';

export const MEDIA_SWEEP_QUEUE = 'media-sweep';
const SWEEP_JOB = 'media.sweep';

/**
 * Every SWEEP_MINUTES, gives back the space of uploads that were started
 * and never completed, and removes export ZIPs past their time (worker only; schema document §6.6). A BullMQ job
 * scheduler starts it, so with several workers it still runs once, and
 * each upload's space is given back exactly once however often it runs.
 */
@Traced()
@Injectable()
export class MediaSweeper implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(MediaSweeper.name);
  private connection?: Redis;
  private queue?: Queue;
  private worker?: Worker;

  constructor(
    private readonly uploads: UploadsService,
    private readonly exportsService: MediaExportsService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const connection = createQueueConnection(this.config.get('REDIS_URL', { infer: true }));
    this.connection = connection;
    this.queue = new Queue(MEDIA_SWEEP_QUEUE, { connection });
    this.worker = new Worker(MEDIA_SWEEP_QUEUE, () => this.sweep(), { connection, concurrency: 1 });
    this.worker.on('error', (error) => this.logger.error('Media sweep worker error', error));
    await this.queue.upsertJobScheduler(
      SWEEP_JOB,
      { every: SWEEP_MINUTES * 60_000 },
      { name: SWEEP_JOB, opts: { removeOnComplete: 50, removeOnFail: 50 } },
    );
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
    await this.connection?.quit().catch(() => this.connection?.disconnect());
  }

  /** One sweep, traced like a request; logged in full only when it freed space or failed. */
  private sweep(): Promise<void> {
    return startTrace(SWEEP_JOB, async (trace) => {
      const startedAt = performance.now();
      let failed = false;
      let expired = 0;
      try {
        expired = (await this.uploads.expireAbandoned()) + (await this.exportsService.expireOld());
      } catch (error) {
        failed = true;
        throw error;
      } finally {
        if (trace && (failed || (expired > 0 && traceMode() === 'full'))) {
          const durationMs = Math.round(performance.now() - startedAt);
          logTrace(this.logger, trace, {
            message: 'job',
            summary: `job ${SWEEP_JOB} ${failed ? 'failed' : `expired ${expired}`} in ${durationMs}ms`,
            fields: { job: SWEEP_JOB, expired, durationMs, failed },
            failed,
          });
        }
      }
    });
  }
}
