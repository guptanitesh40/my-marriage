import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module.js';
import { AuthHttpModule } from './modules/auth/auth-http.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { WeddingsHttpModule } from './modules/weddings/weddings-http.module.js';
import { IndexCheckModule } from './platform/index-check.js';
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
  ],
})
export class AppModule {}
