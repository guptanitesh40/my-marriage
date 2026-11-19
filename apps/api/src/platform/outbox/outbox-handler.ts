/** An outbox event as a handler sees it. */
export interface OutboxEventView {
  id: string;
  eventType: string;
  aggregateId: string;
  payloadRef: Record<string, string>;
}

/** Which try this is, so a handler can record a final failure. */
export interface DeliveryAttempt {
  /** 1 on the first try. */
  attempt: number;
  maxAttempts: number;
}

/**
 * Carries out the side effect for one or more event types, in the worker.
 *
 * Delivery is at least once: a handler can run again for the same event after
 * a crash or a stalled job, so it must be safe to run twice. Throwing retries
 * the event with backoff; throwing BullMQ's `UnrecoverableError` stops.
 */
export interface OutboxHandler {
  readonly eventTypes: readonly string[];
  handle(event: OutboxEventView, attempt: DeliveryAttempt): Promise<void>;
}

/** Injection token for the handlers registered with `OutboxWorkerModule`. */
export const OUTBOX_HANDLERS = Symbol('OUTBOX_HANDLERS');

/** How a job is retried. Defaults suit production; tests shorten the delay. */
export interface OutboxRetryOptions {
  /** Tries per job, the first included. */
  attempts: number;
  /** Delay before the first retry; doubles each time. */
  delayMs: number;
}

/** Exponential backoff from 10 s over 8 tries: about 21 minutes in total. */
export const DEFAULT_OUTBOX_RETRY: OutboxRetryOptions = { attempts: 8, delayMs: 10_000 };

/** Injection token for the retry options of `OutboxWorkerModule`. */
export const OUTBOX_RETRY = Symbol('OUTBOX_RETRY');
