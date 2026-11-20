import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, type Model } from 'mongoose';
import { Traced } from '../../platform/tracing.js';
import { EventsService } from '../events/events.service.js';
import type {
  ComposedEmail,
  EmailComposer,
  EmailToCompose,
} from '../notifications/email-composer.js';
import { WeddingAccessService } from '../weddings/wedding-access.service.js';
import { guestReminderMessage, type ReminderEvent } from './guest-emails.js';
import { GuestLinks } from './guest-links.js';
import { isUpcoming } from './reminder-schedule.js';
import { EventInvitation } from './schemas/event-invitation.schema.js';
import { GuestContact } from './schemas/guest-contact.schema.js';
import { GuestReminder } from './schemas/guest-reminder.schema.js';
import { InvitationToken } from './schemas/invitation-token.schema.js';

/**
 * Writes a reminder in the worker, just before sending (decision 0016),
 * from its record: each ceremony's latest details and the guest's current
 * answer, and the link rebuilt from the guest's active link, so no secret is
 * queued. Rechecked here, and not sent if any changed since it was queued:
 * the guest was removed, changed address or turned reminders off; the
 * wedding was archived; the link was turned off; or no ceremony on it is
 * still upcoming, still invited and, for an automatic reminder, still on
 * the date it was planned for.
 */
@Traced()
@Injectable()
export class GuestReminderComposer implements EmailComposer {
  readonly kinds = ['guest_reminder'] as const;

  constructor(
    @InjectModel(GuestReminder.name) private readonly reminders: Model<GuestReminder>,
    @InjectModel(GuestContact.name) private readonly guests: Model<GuestContact>,
    @InjectModel(EventInvitation.name) private readonly invitations: Model<EventInvitation>,
    @InjectModel(InvitationToken.name) private readonly tokens: Model<InvitationToken>,
    private readonly access: WeddingAccessService,
    private readonly events: EventsService,
    private readonly links: GuestLinks,
  ) {}

  async compose(email: EmailToCompose): Promise<ComposedEmail | null> {
    const reminder = await this.reminders
      .findOne({ notificationId: new Types.ObjectId(email.notificationId) })
      .lean();
    if (!reminder) return null;
    const guest = await this.guests
      .findOne({ _id: reminder.guestId, weddingId: reminder.weddingId, status: 'active' })
      .lean();
    if (!guest || guest.emailNormalized !== email.recipientEmailNormalized) return null;
    if (guest.reminderOptOutAt) return null;
    const couple = await this.access.coupleOf(reminder.weddingId);
    if (!couple?.active) return null;
    const link = await this.tokens
      .findOne({ weddingId: reminder.weddingId, guestId: guest._id, status: 'active' })
      .lean();
    if (!link) return null;

    const planned = new Map(
      reminder.items.map((item) => [item.eventId.toHexString(), item.scheduleVersion]),
    );
    const [briefs, invitations] = await Promise.all([
      this.events.briefs(
        reminder.weddingId,
        reminder.items.map((item) => item.eventId),
      ),
      this.invitations
        .find({
          weddingId: reminder.weddingId,
          guestId: guest._id,
          isInvited: true,
          eventId: { $in: reminder.items.map((item) => item.eventId) },
        })
        .lean(),
    ]);
    const answers = new Map(
      invitations.map((invitation) => [invitation.eventId.toHexString(), invitation.rsvp]),
    );
    const now = new Date();
    const items: ReminderEvent[] = briefs.flatMap((event) => {
      const rsvp = answers.get(event.id);
      if (!rsvp || !isUpcoming(event, now)) return [];
      // A date moved since an automatic reminder was planned: the new date gets its own.
      if (reminder.source === 'automatic' && planned.get(event.id) !== event.scheduleVersion) {
        return [];
      }
      return [
        {
          event,
          status: rsvp.status,
          ...(rsvp.attendingCount !== undefined ? { attendingCount: rsvp.attendingCount } : {}),
        },
      ];
    });
    if (items.length === 0) return null;

    return guestReminderMessage({
      coupleName: couple.coupleName,
      guestName: guest.name,
      partySize: guest.partySize,
      items,
      link: this.links.url(link._id),
      ...(reminder.offsetDays !== undefined ? { daysBefore: reminder.offsetDays } : {}),
      ...(reminder.note ? { note: reminder.note } : {}),
    });
  }
}
