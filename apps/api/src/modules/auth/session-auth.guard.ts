import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import type { Env } from '../../config/env.js';
import { ALLOW_UNVERIFIED_KEY, PUBLIC_KEY, type AuthenticatedRequest } from './auth.decorators.js';
import { clearSessionCookie, readSessionCookie } from './session-cookie.js';
import { SessionsService } from './sessions.service.js';
import { Traced } from '../../platform/tracing.js';

/**
 * Applied to every API route (APP_GUARD). A route needs a valid session and a
 * verified email unless it says otherwise with @Public() or @AllowUnverified().
 * This is authentication only; wedding membership checks come later.
 */
@Traced()
@Injectable()
export class SessionAuthGuard implements CanActivate {
  private readonly secureCookie: boolean;

  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionsService,
    config: ConfigService<Env, true>,
  ) {
    this.secureCookie = config.get('NODE_ENV', { infer: true }) === 'production';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, targets)) return true;

    const http = context.switchToHttp();
    const req = http.getRequest<AuthenticatedRequest>();
    const token = readSessionCookie(req);
    const auth = token ? await this.sessions.authenticate(token) : null;
    if (!auth) {
      // A dead cookie is removed, so the browser stops sending it.
      if (token) clearSessionCookie(http.getResponse<Response>(), this.secureCookie);
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Please sign in to continue.',
      });
    }
    req.auth = auth;

    const allowUnverified = this.reflector.getAllAndOverride<boolean>(
      ALLOW_UNVERIFIED_KEY,
      targets,
    );
    if (!auth.user.emailVerified && !allowUnverified) {
      throw new ForbiddenException({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email address to continue.',
      });
    }
    return true;
  }
}
