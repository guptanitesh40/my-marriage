import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventsModule } from '../events/events.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { WeddingsModule } from '../weddings/weddings.module.js';
import { GuestAccessService } from './guest-access.service.js';
import { GuestInviteComposer } from './guest-invite.composer.js';
import { GuestReminderComposer } from './guest-reminder.composer.js';
import { GuestRemindersService } from './guest-reminders.service.js';
import { GuestLinks } from './guest-links.js';
import { GuestsService } from './guests.service.js';
import { EventInvitation, EventInvitationSchema } from './schemas/event-invitation.schema.js';
import { GuestContact, GuestContactSchema } from './schemas/guest-contact.schema.js';
import { GuestReminder, GuestReminderSchema } from './schemas/guest-reminder.schema.js';
import { ReminderSettings, ReminderSettingsSchema } from './schemas/reminder-settings.schema.js';
import { GuestSession, GuestSessionSchema } from './schemas/guest-session.schema.js';
import { InvitationToken, InvitationTokenSchema } from './schemas/invitation-token.schema.js';

/**
 * Guests, their invitations and RSVPs, and their private links. No
 * controllers (see GuestsHttpModule), so the worker can import it for the
 * invitation and reminder emails and the scheduled reminder check.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GuestContact.name, schema: GuestContactSchema },
      { name: EventInvitation.name, schema: EventInvitationSchema },
      { name: InvitationToken.name, schema: InvitationTokenSchema },
      { name: GuestSession.name, schema: GuestSessionSchema },
      { name: GuestReminder.name, schema: GuestReminderSchema },
      { name: ReminderSettings.name, schema: ReminderSettingsSchema },
    ]),
    NotificationsModule,
    WeddingsModule,
    EventsModule,
  ],
  providers: [
    GuestsService,
    GuestAccessService,
    GuestRemindersService,
    GuestLinks,
    GuestInviteComposer,
    GuestReminderComposer,
  ],
  exports: [
    GuestsService,
    GuestAccessService,
    GuestRemindersService,
    GuestInviteComposer,
    GuestReminderComposer,
  ],
})
export class GuestsModule {}
