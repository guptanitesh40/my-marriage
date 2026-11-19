import type { CookieOptions, Request, Response } from 'express';

/** Name fixed by the API documentation (§3). */
export const SESSION_COOKIE = 'mm_session';

/**
 * - HttpOnly: page scripts — including an injected one — cannot read it.
 * - SameSite=Lax: not sent on cross-site requests other than top-level
 *   navigation, which with the CSRF check closes cross-site forgery.
 * - Secure in production; browsers also accept it over http://localhost.
 * - No Domain: the cookie belongs to the exact host that set it.
 */
function cookieOptions(secure: boolean): CookieOptions {
  return { httpOnly: true, sameSite: 'lax', secure, path: '/' };
}

export function setSessionCookie(
  res: Response,
  token: string,
  expiresAt: Date,
  secure: boolean,
): void {
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions(secure), expires: expiresAt });
}

export function clearSessionCookie(res: Response, secure: boolean): void {
  res.clearCookie(SESSION_COOKIE, cookieOptions(secure));
}

/**
 * The session token from the Cookie header, or undefined. Express does not
 * parse cookies, and only this one is ever needed, so no parser is added.
 */
export function readSessionCookie(req: Request): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() !== SESSION_COOKIE) continue;
    const value = part.slice(separator + 1).trim();
    // Our tokens are URL-safe base64; anything else was not issued by us.
    return /^[A-Za-z0-9_-]{20,100}$/.test(value) ? value : undefined;
  }
  return undefined;
}
