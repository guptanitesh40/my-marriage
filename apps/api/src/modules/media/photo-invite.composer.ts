import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, type Model } from 'mongoose';
import { Traced } from '../../platform/tracing.js';
import { photoInviteMessage } from '../guests/guest-emails.js';
import type {
  ComposedEmail,
  EmailComposer,
  EmailToCompose,
} from '../notifications/email-composer.js';
import { WeddingAccessService } from '../weddings/wedding-access.service.js';
import { UploadCapability } from './schemas/upload-capability.schema.js';
import { UploadLinkEmail } from './schemas/upload-link-email.schema.js';
import { UploadLinks } from './upload-links.js';

/**
 * Writes the "share your photos" email in the worker, just before sending
 * (decision 0019). The link is rebuilt from its record, so it is never in
 * the queue. Not sent if the link was revoked meanwhile, the address
 * changed, or the wedding was archived.
 */
@Traced()
@Injectable()
export class PhotoInviteComposer implements EmailComposer {
  readonly kinds = ['photo_upload_invite'] as const;

  constructor(
    @InjectModel(UploadLinkEmail.name) private readonly emails: Model<UploadLinkEmail>,
    @InjectModel(UploadCapability.name) private readonly capabilities: Model<UploadCapability>,
    private readonly access: WeddingAccessService,
    private readonly links: UploadLinks,
  ) {}

  async compose(email: EmailToCompose): Promise<ComposedEmail | null> {
    const request = await this.emails
      .findOne({ notificationId: new Types.ObjectId(email.notificationId) })
      .lean();
    if (!request || request.emailNormalized !== email.recipientEmailNormalized) return null;
    const link = await this.capabilities
      .findOne({ _id: request.capabilityId, weddingId: request.weddingId, status: 'active' })
      .lean();
    if (!link) return null;
    const couple = await this.access.coupleOf(request.weddingId);
    if (!couple?.active) return null;
    return photoInviteMessage({
      coupleName: couple.coupleName,
      guestName: request.guestName,
      link: this.links.url(link._id),
    });
  }
}
