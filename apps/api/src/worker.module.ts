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
import { MediaModule } from './modules/media/media.module.js';
import { MediaExportsService } from './modules/media/media-exports.service.js';
import { MediaSweeper } from './modules/media/media-sweeper.js';
import { PhotoInviteComposer } from './modules/media/photo-invite.composer.js';
import { PhotoProcessor } from './modules/media/photo-processor.js';
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
          imports: [AuthModule, WeddingsModule, GuestsModule, MediaModule],
          composers: [
            AuthEmailComposer,
            InviteEmailComposer,
            GuestInviteComposer,
            GuestReminderComposer,
            PhotoInviteComposer,
          ],
        }),
        MediaModule,
      ],
      handlers: [EmailDeliveryHandler, PhotoProcessor, MediaExportsService],
    }),
    GuestsModule,
    MediaModule,
  ],
  // The automatic-reminder check and the upload sweep run in the worker only.
  providers: [ReminderScheduler, MediaSweeper],
})
export class WorkerModule {}
