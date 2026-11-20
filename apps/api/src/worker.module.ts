import { Module } from '@nestjs/common';
import { AuthEmailComposer } from './modules/auth/auth-email.composer.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { EmailDeliveryHandler } from './modules/notifications/email-delivery.handler.js';
import { EmailDeliveryModule } from './modules/notifications/email-delivery.module.js';
import { GuestInviteComposer } from './modules/guests/guest-invite.composer.js';
import { GuestReminderComposer } from './modules/guests/guest-reminder.composer.js';
import { GuestsModule } from './modules/guests/guests.module.js';
import { ReminderScheduler } from './modules/guests/reminder-scheduler.js';
import { InviteEmailComposer } from './modules/weddings/invite-email.composer.js';
import { WeddingsModule } from './modules/weddings/weddings.module.js';
import { IndexCheckModule } from './platform/index-check.js';
import { OutboxWorkerModule } from './platform/outbox/outbox-worker.module.js';
import { PlatformModule } from './platform/platform.module.js';

/**
 * Root module of the background worker. It shares PlatformModule and the
 * domain modules with the API but exposes no HTTP controllers. It relays
 * committed outbox events to BullMQ and runs their handlers, and checks for
 * automatic guest reminders that are due.
 */
@Module({
  imports: [
    PlatformModule,
    IndexCheckModule,
    AuthModule,
    OutboxWorkerModule.register({
      imports: [
        EmailDeliveryModule.register({
          imports: [AuthModule, WeddingsModule, GuestsModule],
          composers: [
            AuthEmailComposer,
            InviteEmailComposer,
            GuestInviteComposer,
            GuestReminderComposer,
          ],
        }),
      ],
      handlers: [EmailDeliveryHandler],
    }),
    GuestsModule,
  ],
  // The automatic-reminder check runs in the worker only.
  providers: [ReminderScheduler],
})
export class WorkerModule {}
