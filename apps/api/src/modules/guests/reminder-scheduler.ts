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
import { GuestRemindersService } from './guest-reminders.service.js';
import { REMINDER_CHECK_MINUTES } from './guest-policy.js';

export const REMINDER_QUEUE = 'reminders';
const CHECK_JOB = 'reminders.check';

/**
 * Runs the automatic-reminder check every REMINDER_CHECK_MINUTES (worker
 * only). A BullMQ job scheduler starts it, so with several workers each
 * check still runs once; and the check itself can run twice safely, as each
 * scheduled reminder is unique (decision 0016).
 */
@Traced()
@Injectable()
export class ReminderScheduler implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(ReminderScheduler.name);
  private connection?: Redis;
  private queue?: Queue;
  private worker?: Worker;

  constructor(
    private readonly reminders: GuestRemindersService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const connection = createQueueConnection(this.config.get('REDIS_URL', { infer: true }));
    this.connection = connection;
    this.queue = new Queue(REMINDER_QUEUE, { connection });
    this.worker = new Worker(REMINDER_QUEUE, () => this.check(), { connection, concurrency: 1 });
    this.worker.on('error', (error) => this.logger.error('Reminder worker error', error));
    await this.queue.upsertJobScheduler(
      CHECK_JOB,
      { every: REMINDER_CHECK_MINUTES * 60_000 },
      { name: CHECK_JOB, opts: { removeOnComplete: 50, removeOnFail: 50 } },
    );
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
    await this.connection?.quit().catch(() => this.connection?.disconnect());
  }

  /** One check, traced like a request; logged in full only when it queued something or failed. */
  private check(): Promise<void> {
    return startTrace(CHECK_JOB, async (trace) => {
      const startedAt = performance.now();
      let failed = false;
      let queued = 0;
      try {
        queued = (await this.reminders.sendDueReminders()).queued;
      } catch (error) {
        failed = true;
        throw error;
      } finally {
        if (trace && (failed || (queued > 0 && traceMode() === 'full'))) {
          const durationMs = Math.round(performance.now() - startedAt);
          logTrace(this.logger, trace, {
            message: 'job',
            summary: `job ${CHECK_JOB} ${failed ? 'failed' : `queued ${queued}`} in ${durationMs}ms`,
            fields: { job: CHECK_JOB, queued, durationMs, failed },
            failed,
          });
        }
      }
    });
  }
}
