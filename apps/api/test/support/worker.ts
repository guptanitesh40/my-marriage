import type { INestApplicationContext, ModuleMetadata, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { EmailComposer } from '../../src/modules/notifications/email-composer.js';
import { EmailDeliveryHandler } from '../../src/modules/notifications/email-delivery.handler.js';
import { EmailDeliveryModule } from '../../src/modules/notifications/email-delivery.module.js';
import { MemoryMailTransport } from '../../src/modules/notifications/mail/local.transports.js';
import { MailTransport } from '../../src/modules/notifications/mail/mail-transport.js';
import { MigrationRunner } from '../../src/platform/migrations/migration-runner.js';
import { OutboxWorkerModule } from '../../src/platform/outbox/outbox-worker.module.js';
import { PlatformModule } from '../../src/platform/platform.module.js';

export interface TestWorker {
  context: INestApplicationContext;
  /** Every email this worker sent (MAIL_TRANSPORT=memory in integration tests). */
  mail: MemoryMailTransport;
}

/**
 * A running worker — outbox relay, BullMQ and email delivery — like
 * `worker.ts` builds it, but with fast retries so failure paths finish in
 * milliseconds. Pass the composers (and the modules exporting them) under test.
 */
export async function createTestWorker(
  options: { imports?: ModuleMetadata['imports']; composers?: Type<EmailComposer>[] } = {},
): Promise<TestWorker> {
  const moduleRef = await Test.createTestingModule({
    imports: [
      PlatformModule,
      OutboxWorkerModule.register({
        imports: [
          EmailDeliveryModule.register({
            imports: options.imports,
            composers: options.composers ?? [],
          }),
        ],
        handlers: [EmailDeliveryHandler],
        retry: { attempts: 3, delayMs: 20 },
      }),
    ],
  }).compile();
  await moduleRef.get(MigrationRunner).run();
  const context = await moduleRef.init();
  const mail = context.get(MailTransport);
  if (!(mail instanceof MemoryMailTransport)) {
    throw new Error('Integration tests must run with MAIL_TRANSPORT=memory');
  }
  return { context, mail };
}

/** Polls until `check` returns a value other than undefined/false, or fails after `timeoutMs`. */
export async function waitFor<T>(
  check: () => Promise<T | undefined | false> | T | undefined | false,
  { timeoutMs = 10_000, what = 'condition' } = {},
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await check();
    if (value !== undefined && value !== false) return value;
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${what}`);
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}
