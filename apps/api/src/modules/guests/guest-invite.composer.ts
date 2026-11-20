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
import { guestInviteMessage } from './guest-emails.js';
import { GuestLinks } from './guest-links.js';
import { EventInvitation } from './schemas/event-invitation.schema.js';
import { GuestContact } from './schemas/guest-contact.schema.js';
import { InvitationToken } from './schemas/invitation-token.schema.js';

/**
 * Writes a guest's invitation in the worker, just before sending (PRD
 * INV-06). The link is rebuilt from the guest's active link record, so it
 * is never stored in the queue (decision 0015). Not sent if the guest was
 * removed, the address changed, the wedding was archived, no link is active
 * or no open ceremony is left.
 */
@Traced()
@Injectable()
export class GuestInviteComposer implements EmailComposer {
  readonly kinds = ['guest_invite'] as const;

  constructor(
    @InjectModel(GuestContact.name) private readonly guests: Model<GuestContact>,
    @InjectModel(EventInvitation.name) private readonly invitations: Model<EventInvitation>,
    @InjectModel(InvitationToken.name) private readonly tokens: Model<InvitationToken>,
    private readonly access: WeddingAccessService,
    private readonly events: EventsService,
    private readonly links: GuestLinks,
  ) {}

  async compose(email: EmailToCompose): Promise<ComposedEmail | null> {
    const guest = await this.guests
      .findOne({ lastInviteEmailId: new Types.ObjectId(email.notificationId), status: 'active' })
      .lean();
    if (!guest || guest.emailNormalized !== email.recipientEmailNormalized) return null;
    const couple = await this.access.coupleOf(guest.weddingId);
    if (!couple?.active) return null;
    const link = await this.tokens
      .findOne({ weddingId: guest.weddingId, guestId: guest._id, status: 'active' })
      .lean();
    if (!link) return null;
    const invited = await this.invitations
      .find({ weddingId: guest.weddingId, guestId: guest._id, isInvited: true }, { eventId: 1 })
      .lean();
    const events = (
      await this.events.briefs(
        guest.weddingId,
        invited.map((invitation) => invitation.eventId),
      )
    ).filter((event) => !event.deleted && !event.cancelled);
    if (events.length === 0) return null;
    return guestInviteMessage({
      coupleName: couple.coupleName,
      guestName: guest.name,
      partySize: guest.partySize,
      events,
      link: this.links.url(link._id),
    });
  }
}
