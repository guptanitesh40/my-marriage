import { Module } from '@nestjs/common';
import { AuthEmailComposer } from './modules/auth/auth-email.composer.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { EmailDeliveryHandler } from './modules/notifications/email-delivery.handler.js';
import { EmailDeliveryModule } from './modules/notifications/email-delivery.module.js';
import { InviteEmailComposer } from './modules/weddings/invite-email.composer.js';
import { WeddingsModule } from './modules/weddings/weddings.module.js';
import { IndexCheckModule } from './platform/index-check.js';
import { OutboxWorkerModule } from './platform/outbox/outbox-worker.module.js';
import { PlatformModule } from './platform/platform.module.js';

/**
 * Root module of the background worker. It shares PlatformModule and the
 * domain modules with the API but exposes no HTTP controllers. It relays
 * committed outbox events to BullMQ and runs their handlers.
 */
@Module({
  imports: [
    PlatformModule,
    IndexCheckModule,
    AuthModule,
    OutboxWorkerModule.register({
      imports: [
        EmailDeliveryModule.register({
          imports: [AuthModule, WeddingsModule],
          composers: [AuthEmailComposer, InviteEmailComposer],
        }),
      ],
      handlers: [EmailDeliveryHandler],
    }),
  ],
})
export class WorkerModule {}
