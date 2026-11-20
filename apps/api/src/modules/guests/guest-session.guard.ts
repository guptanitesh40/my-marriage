import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import type { Env } from '../../config/env.js';
import { Traced } from '../../platform/tracing.js';
import { GuestAccessService, type GuestContext } from './guest-access.service.js';
import { clearGuestCookie, readGuestCookie } from './guest-cookie.js';
import { guestSessionMissing } from './guest-errors.js';

/** Set on the request by GuestSessionGuard. */
export interface GuestRequest extends Request {
  guest?: GuestContext;
}

/**
 * For the guest's own routes, which are @Public() to the organizer guard:
 * needs a live guest cookie whose link is still active and whose guest is
 * still on the list. It grants that one invitation, nothing else.
 */
@Traced()
@Injectable()
export class GuestSessionGuard implements CanActivate {
  private readonly secureCookie: boolean;

  constructor(
    private readonly access: GuestAccessService,
    config: ConfigService<Env, true>,
  ) {
    this.secureCookie = config.get('NODE_ENV', { infer: true }) === 'production';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const req = http.getRequest<GuestRequest>();
    const token = readGuestCookie(req);
    const guest = token ? await this.access.authenticate(token) : null;
    if (!guest) {
      if (token) clearGuestCookie(http.getResponse<Response>(), this.secureCookie);
      throw guestSessionMissing();
    }
    req.guest = guest;
    return true;
  }
}
