import { Module } from '@nestjs/common';
import { MemberInvitesController } from './member-invites.controller.js';
import { WeddingsController } from './weddings.controller.js';
import { WeddingsModule } from './weddings.module.js';

/** The weddings endpoints. API only: the worker imports WeddingsModule, never this. */
@Module({
  imports: [WeddingsModule],
  controllers: [WeddingsController, MemberInvitesController],
})
export class WeddingsHttpModule {}
