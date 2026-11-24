import { Module } from '@nestjs/common';
import { AuditModule } from '../../platform/audit/audit.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { TasksModule } from '../tasks/tasks.module.js';
import { WeddingsModule } from '../weddings/weddings.module.js';
import { TeamController } from './team.controller.js';
import { TeamService } from './team.service.js';

/**
 * The team page's changes. Its own module because removing someone also
 * unassigns their tasks, and the tasks module already depends on weddings.
 * API only.
 */
@Module({
  imports: [WeddingsModule, TasksModule, AuthModule, AuditModule],
  providers: [TeamService],
  controllers: [TeamController],
})
export class TeamHttpModule {}
