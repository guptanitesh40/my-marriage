import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditModule } from '../../platform/audit/audit.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { InviteEmailComposer } from './invite-email.composer.js';
import { MemberInvitesService } from './member-invites.service.js';
import { DeletionJob, DeletionJobSchema } from './schemas/deletion-job.schema.js';
import { MembershipInvite, MembershipInviteSchema } from './schemas/membership-invite.schema.js';
import { WeddingMembership, WeddingMembershipSchema } from './schemas/wedding-membership.schema.js';
import { WeddingSlug, WeddingSlugSchema } from './schemas/wedding-slug.schema.js';
import { Wedding, WeddingSchema } from './schemas/wedding.schema.js';
import { WeddingAccessService } from './wedding-access.service.js';
import { WeddingLifecycleService } from './wedding-lifecycle.service.js';
import { WeddingsService } from './weddings.service.js';

/**
 * Weddings, memberships and invitations. Imported by the API and the worker
 * (which writes the invitation email), so it holds no controllers; see
 * WeddingsHttpModule.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Wedding.name, schema: WeddingSchema },
      { name: WeddingMembership.name, schema: WeddingMembershipSchema },
      { name: MembershipInvite.name, schema: MembershipInviteSchema },
      { name: WeddingSlug.name, schema: WeddingSlugSchema },
      { name: DeletionJob.name, schema: DeletionJobSchema },
    ]),
    AuthModule,
    NotificationsModule,
    AuditModule,
  ],
  providers: [
    WeddingsService,
    WeddingLifecycleService,
    WeddingAccessService,
    MemberInvitesService,
    InviteEmailComposer,
  ],
  exports: [
    WeddingsService,
    WeddingLifecycleService,
    WeddingAccessService,
    MemberInvitesService,
    InviteEmailComposer,
  ],
})
export class WeddingsModule {}
