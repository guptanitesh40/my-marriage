import { Module } from '@nestjs/common';
import { GuestAccessController } from './guest-access.controller.js';
import { GuestSessionGuard } from './guest-session.guard.js';
import { GuestsController } from './guests.controller.js';
import { GuestsModule } from './guests.module.js';
import { ReminderSettingsController } from './reminder-settings.controller.js';

/** The guest endpoints, for organizers and for invited guests. API only. */
@Module({
  imports: [GuestsModule],
  controllers: [GuestsController, GuestAccessController, ReminderSettingsController],
  providers: [GuestSessionGuard],
})
export class GuestsHttpModule {}
