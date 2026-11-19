import { setTimeout as sleep } from 'node:timers/promises';
import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Queue, UnrecoverableError, Worker, type Job } from 'bullmq';
import type { Redis } from 'ioredis';
import type { Model } from 'mongoose';
import type { Env } from '../../config/env.js';
import { createQueueConnection } from '../redis.js';
import { logTrace, startTrace, traceMode } from '../tracing.js';
import {
  OUTBOX_HANDLERS,
  OUTBOX_RETRY,
  type OutboxHandler,
  type OutboxRetryOptions,
} from './outbox-handler.js';
import { OutboxEvent, type OutboxEventDocument } from './outbox-event.schema.js';

export const OUTBOX_QUEUE = 'outbox';

/** How long a relay owns an event it claimed before another may take it. */
const CLAIM_MS = 30_000;
/** A relay that failed to hand an event to BullMQ this many times gives up on it. */
const MAX_CLAIMS = 20;
/**
 * Longest wait for Redis to accept one job. Shorter than a claim, so the
 * claim never runs out while the relay still waits on Redis.
 */
const QUEUE_ADD_TIMEOUT_MS = 10_000;
const IDLE_POLL_MS = 1_000;
const ERROR_POLL_MS = 5_000;
const BATCH = 100;

interface OutboxJobData {
  outboxEventId: string;
}

/** `promise`, or a rejection as soon as `signal` aborts, whichever comes first. */
function untilAborted<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const onAbort = () =>
      reject(signal.reason instanceof Error ? signal.reason : new Error('Aborted'));
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort));
  });
}

/**
 * Moves committed outbox events into BullMQ, and runs them.
 *
 * The relay polls MongoDB, claims an event atomically (so several worker
 * processes never publish one event twice), adds a job whose ID is the event
 * ID (so BullMQ ignores a repeat), then marks the event published. A crash at
 * any point leaves the event claimed; its claim expires and it is picked up
 * again. Jobs retry with backoff, and handlers must be safe to run twice.
 */
@Injectable()
export class OutboxRelay implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(OutboxRelay.name);
  private readonly stop = new AbortController();
  private connection?: Redis;
  private queue?: Queue<OutboxJobData>;
  private worker?: Worker<OutboxJobData>;
  private polling?: Promise<void>;

  constructor(
    @InjectModel(OutboxEvent.name) private readonly events: Model<OutboxEvent>,
    @Inject(OUTBOX_HANDLERS) private readonly handlers: OutboxHandler[],
    @Inject(OUTBOX_RETRY) private readonly retry: OutboxRetryOptions,
    private readonly config: ConfigService<Env, true>,
  ) {}

  onApplicationBootstrap(): void {
    const connection = createQueueConnection(this.config.get('REDIS_URL', { infer: true }));
    this.connection = connection;
    this.queue = new Queue<OutboxJobData>(OUTBOX_QUEUE, { connection });
    this.worker = new Worker<OutboxJobData>(OUTBOX_QUEUE, (job) => this.run(job), {
      connection,
      concurrency: 5,
    });
    this.worker.on('failed', (job, error) => {
      this.logger.warn('Outbox job failed', {
        outboxEventId: job?.id,
        eventType: job?.name,
        attempt: job?.attemptsMade,
        error: error.name,
      });
    });
    this.worker.on('error', (error) => this.logger.error('Outbox worker error', error));
    this.polling = this.poll();
  }

  async onApplicationShutdown(): Promise<void> {
    this.stop.abort();
    await this.polling;
    await this.worker?.close();
    await this.queue?.close();
    await this.connection?.quit().catch(() => this.connection?.disconnect());
  }

  /** Publishes every event that is due; returns how many. Exposed for tests. */
  async relayDue(): Promise<number> {
    let published = 0;
    while (published < BATCH && !this.stop.signal.aborted) {
      const event = await this.claim();
      if (!event) break;
      await this.publish(event);
      published += 1;
    }
    return published;
  }

  private async poll(): Promise<void> {
    while (!this.stop.signal.aborted) {
      let wait = IDLE_POLL_MS;
      try {
        if ((await this.relayDue()) === BATCH) wait = 0;
      } catch (error) {
        if (this.stop.signal.aborted) break;
        this.logger.error('Outbox relay failed; retrying', error);
        wait = ERROR_POLL_MS;
      }
      await sleep(wait, undefined, { signal: this.stop.signal }).catch(() => undefined);
    }
  }

  private claim(): Promise<OutboxEventDocument | null> {
    const now = new Date();
    return this.events.findOneAndUpdate(
      { state: { $in: ['pending', 'claimed'] }, nextAttemptAt: { $lte: now } },
      {
        $set: { state: 'claimed', nextAttemptAt: new Date(now.getTime() + CLAIM_MS) },
        $inc: { attempts: 1 },
      },
      { sort: { nextAttemptAt: 1 }, returnDocument: 'after' },
    );
  }

  private async publish(event: OutboxEventDocument): Promise<void> {
    const id = event._id.toHexString();
    const queue = this.queue;
    if (!queue) throw new Error('Outbox relay is not started');
    try {
      // The queue's connection retries forever (BullMQ requires it), so while
      // Redis is down `add` would wait forever too, and the relay would
      // neither give up on the event nor stop at shutdown. Giving up the wait
      // is safe: an add that lands later is the same job ID, which BullMQ
      // ignores when the event is published again.
      await untilAborted(
        queue.add(
          event.eventType,
          { outboxEventId: id },
          {
            jobId: id,
            attempts: this.retry.attempts,
            backoff: { type: 'exponential', delay: this.retry.delayMs },
            // Kept long enough that a relay re-publishing after a crash is
            // recognised as a duplicate instead of running the job again.
            removeOnComplete: { age: 24 * 60 * 60 },
            removeOnFail: { age: 7 * 24 * 60 * 60 },
          },
        ),
        AbortSignal.any([this.stop.signal, AbortSignal.timeout(QUEUE_ADD_TIMEOUT_MS)]),
      );
    } catch (error) {
      if (!this.stop.signal.aborted && event.attempts >= MAX_CLAIMS) {
        await this.events.updateOne({ _id: event._id }, { $set: { state: 'failed' } });
        this.logger.error('Outbox event could not be queued; giving up', {
          outboxEventId: id,
          eventType: event.eventType,
        });
        return;
      }
      throw error;
    }
    await this.events.updateOne(
      { _id: event._id, state: 'claimed' },
      { $set: { state: 'published', publishedAt: new Date() } },
    );
  }

  /** Runs a job, traced like an HTTP request (LOG_TRACE). */
  private run(job: Job<OutboxJobData>): Promise<void> {
    const label = `job ${job.name} ${job.id ?? ''}`.trim();
    return startTrace(label, async (trace) => {
      const startedAt = performance.now();
      let failed = false;
      try {
        await this.runJob(job);
      } catch (error) {
        failed = true;
        throw error;
      } finally {
        if (trace && (traceMode() === 'full' || failed)) {
          const durationMs = Math.round(performance.now() - startedAt);
          const attempt = job.attemptsMade + 1;
          logTrace(this.logger, trace, {
            message: 'job',
            summary: `${label} (attempt ${attempt}) ${failed ? 'failed' : 'done'} in ${durationMs}ms`,
            fields: { outboxEventId: job.id, eventType: job.name, attempt, durationMs, failed },
            failed,
          });
        }
      }
    });
  }

  private async runJob(job: Job<OutboxJobData>): Promise<void> {
    const event = await this.events.findById(job.data.outboxEventId).lean();
    if (!event) throw new UnrecoverableError('Outbox event not found');
    const handler = this.handlers.find((candidate) =>
      candidate.eventTypes.includes(event.eventType),
    );
    if (!handler) throw new UnrecoverableError(`No handler for ${event.eventType}`);
    await handler.handle(
      {
        id: event._id.toHexString(),
        eventType: event.eventType,
        aggregateId: event.aggregateId.toHexString(),
        payloadRef: event.payloadRef,
      },
      { attempt: job.attemptsMade + 1, maxAttempts: job.opts.attempts ?? 1 },
    );
  }
}
