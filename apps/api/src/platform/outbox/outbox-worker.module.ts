import { Module, type DynamicModule, type ModuleMetadata, type Type } from '@nestjs/common';
import {
  DEFAULT_OUTBOX_RETRY,
  OUTBOX_HANDLERS,
  OUTBOX_RETRY,
  type OutboxHandler,
  type OutboxRetryOptions,
} from './outbox-handler.js';
import { OutboxRelay } from './outbox-relay.js';
import { OutboxModule } from './outbox.module.js';

/**
 * The relay and job runner. Worker process only: the API writes outbox events
 * but never runs them. `imports` must export each class listed in `handlers`.
 */
@Module({})
export class OutboxWorkerModule {
  static register(options: {
    imports: ModuleMetadata['imports'];
    handlers: Type<OutboxHandler>[];
    retry?: OutboxRetryOptions;
  }): DynamicModule {
    return {
      module: OutboxWorkerModule,
      imports: [OutboxModule, ...(options.imports ?? [])],
      providers: [
        OutboxRelay,
        { provide: OUTBOX_RETRY, useValue: options.retry ?? DEFAULT_OUTBOX_RETRY },
        {
          provide: OUTBOX_HANDLERS,
          inject: options.handlers,
          useFactory: (...handlers: OutboxHandler[]) => handlers,
        },
      ],
      exports: [OutboxRelay],
    };
  }
}
