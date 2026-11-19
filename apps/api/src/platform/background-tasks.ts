import { Injectable, Logger, type BeforeApplicationShutdown } from '@nestjs/common';

/**
 * Work a request starts but does not wait for, so how long the response
 * takes says nothing about that work — for example whether an email address
 * has an account. Not durable: anything that must survive a crash still goes
 * through the outbox, which such a task may write to.
 *
 * A failure is logged, never thrown. Shutdown waits for tasks in flight,
 * before the database connections close.
 */
@Injectable()
export class BackgroundTasks implements BeforeApplicationShutdown {
  private readonly logger = new Logger(BackgroundTasks.name);
  private readonly running = new Set<Promise<void>>();

  run(name: string, task: () => Promise<void>): void {
    const running: Promise<void> = task()
      .catch((error: unknown) => this.logger.error(`Background task failed: ${name}`, error))
      .finally(() => this.running.delete(running));
    this.running.add(running);
  }

  /** Resolves once no task is running, including tasks started meanwhile. */
  async drain(): Promise<void> {
    while (this.running.size > 0) await Promise.all(this.running);
  }

  beforeApplicationShutdown(): Promise<void> {
    return this.drain();
  }
}
