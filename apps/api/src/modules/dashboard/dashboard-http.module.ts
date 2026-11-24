import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module.js';
import { ExpensesModule } from '../expenses/expenses.module.js';
import { GuestsModule } from '../guests/guests.module.js';
import { MediaModule } from '../media/media.module.js';
import { TasksModule } from '../tasks/tasks.module.js';
import { WebsiteModule } from '../website/website.module.js';
import { WeddingsModule } from '../weddings/weddings.module.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';

/**
 * The wedding overview. API only, and it owns no data: it reads through
 * the other modules' exported services.
 */
@Module({
  imports: [
    WeddingsModule,
    EventsModule,
    TasksModule,
    ExpensesModule,
    GuestsModule,
    MediaModule,
    WebsiteModule,
  ],
  providers: [DashboardService],
  controllers: [DashboardController],
})
export class DashboardHttpModule {}
