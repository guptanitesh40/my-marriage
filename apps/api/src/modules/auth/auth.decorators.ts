import {
  createParamDecorator,
  SetMetadata,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Authentication, AuthenticatedUser } from './sessions.service.js';

export const PUBLIC_KEY = 'auth:public';
export const ALLOW_UNVERIFIED_KEY = 'auth:allow-unverified';

/**
 * Anyone may call this route, signed in or not. Every route without it needs
 * a session (SessionAuthGuard), so forgetting a decorator fails closed.
 */
export const Public = () => SetMetadata(PUBLIC_KEY, true);

/**
 * Signed-in users whose email is not verified yet may call this route too.
 * Everything else waits for verification (PRD AUTH-02).
 */
export const AllowUnverified = () => SetMetadata(ALLOW_UNVERIFIED_KEY, true);

/** Set on the request by SessionAuthGuard. */
export interface AuthenticatedRequest extends Request {
  auth?: Authentication;
}

/** The signed-in user. Only on routes the guard protects. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const auth = context.switchToHttp().getRequest<AuthenticatedRequest>().auth;
    // Only reachable if a @Public() route asks for the user by mistake.
    if (!auth) throw new UnauthorizedException();
    return auth.user;
  },
);
