import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Types, type Model } from 'mongoose';
import type { Env } from '../../config/env.js';
import { randomToken, sha256 } from '../../platform/crypto.js';
import { AccountsService } from '../auth/accounts.service.js';
import type {
  ComposedEmail,
  EmailComposer,
  EmailToCompose,
} from '../notifications/email-composer.js';
import { MembershipInvite } from './schemas/membership-invite.schema.js';
import { Wedding } from './schemas/wedding.schema.js';
import {
  handOverInviteMessage,
  partnerInviteMessage,
  teamInviteMessage,
} from './wedding-emails.js';
import { Traced } from '../../platform/tracing.js';

/**
 * Writes a team invitation (the partner's, an owner's hand-over, or an admin's or manager's) in the worker, creating the link's secret
 * as it sends (as AuthEmailComposer does): the API never sees the secret,
 * and only its hash is stored. Not sent if the invitation is no longer the
 * pending one this email is for — replaced, resent, accepted, withdrawn or
 * expired — or the wedding is no longer active.
 */
@Traced()
@Injectable()
export class InviteEmailComposer implements EmailComposer {
  readonly kinds = ['member_invite'] as const;
  private readonly webOrigin: string;

  constructor(
    @InjectModel(MembershipInvite.name) private readonly invites: Model<MembershipInvite>,
    @InjectModel(Wedding.name) private readonly weddings: Model<Wedding>,
    private readonly accounts: AccountsService,
    config: ConfigService<Env, true>,
  ) {
    this.webOrigin = config.get('WEB_ORIGIN', { infer: true });
  }

  async compose(email: EmailToCompose): Promise<ComposedEmail | null> {
    const notificationId = new Types.ObjectId(email.notificationId);
    const current = { notificationId, status: 'pending' as const, expiresAt: { $gt: new Date() } };
    const invite = await this.invites.findOne(current).lean();
    if (!invite || invite.emailNormalized !== email.recipientEmailNormalized) return null;
    const wedding = await this.weddings.findById(invite.weddingId).lean();
    if (!wedding || wedding.status !== 'active') return null;

    const token = randomToken();
    // Pushed, not replaced: if this send is a retry, the secret in an email
    // that did go out must keep working.
    const saved = await this.invites.updateOne(
      { _id: invite._id, ...current },
      { $push: { tokenHashes: sha256(token) } },
    );
    if (saved.modifiedCount === 0) return null;

    const invitedByName = await this.accounts.displayName(invite.invitedBy);
    const message = {
      ...(invitedByName ? { invitedByName } : {}),
      coupleName: `${wedding.brideName} & ${wedding.groomName}`,
      // In the fragment, never sent to a server: see AuthEmailComposer.
      link: `${this.webOrigin}/invitations/accept#token=${token}`,
      expiresAt: invite.expiresAt,
    };
    if (invite.role !== 'owner') return teamInviteMessage({ ...message, role: invite.role });
    return invite.handOver ? handOverInviteMessage(message) : partnerInviteMessage(message);
  }
}
