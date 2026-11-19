import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { AuthController } from './auth.controller.js';
import { AuthModule } from './auth.module.js';
import { AuthService } from './auth.service.js';
import { EmailVerificationService } from './email-verification.service.js';
import { PasswordResetService } from './password-reset.service.js';
import { SessionAuthGuard } from './session-auth.guard.js';

/**
 * The auth endpoints and the guard that protects every route. API only: the
 * worker imports AuthModule, never this.
 */
@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    EmailVerificationService,
    PasswordResetService,
    { provide: APP_GUARD, useClass: SessionAuthGuard },
  ],
})
export class AuthHttpModule {}
