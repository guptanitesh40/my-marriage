import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module.js';
import { AuthHttpModule } from './modules/auth/auth-http.module.js';
import { DashboardHttpModule } from './modules/dashboard/dashboard-http.module.js';
import { EventsHttpModule } from './modules/events/events-http.module.js';
import { TasksHttpModule } from './modules/tasks/tasks-http.module.js';
import { TeamHttpModule } from './modules/team/team-http.module.js';
import { VendorsHttpModule } from './modules/vendors/vendors-http.module.js';
import { ExpensesHttpModule } from './modules/expenses/expenses-http.module.js';
import { GuestsHttpModule } from './modules/guests/guests-http.module.js';
import { WebsiteHttpModule } from './modules/website/website-http.module.js';
import { MediaHttpModule } from './modules/media/media-http.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { WeddingsHttpModule } from './modules/weddings/weddings-http.module.js';
import { IndexCheckModule } from './platform/index-check.js';
import { StorageHttpModule } from './platform/storage/storage-http.module.js';
import { PlatformModule } from './platform/platform.module.js';

/** Root module of the HTTP API. Domain modules are added here as they are built. */
@Module({
  imports: [
    PlatformModule,
    IndexCheckModule,
    HealthModule,
    AuthHttpModule,
    NotificationsModule,
    WeddingsHttpModule,
    EventsHttpModule,
    TasksHttpModule,
    TeamHttpModule,
    VendorsHttpModule,
    ExpensesHttpModule,
    GuestsHttpModule,
    WebsiteHttpModule,
    MediaHttpModule,
    DashboardHttpModule,
    StorageHttpModule,
  ],
})
export class AppModule {}
