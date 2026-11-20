import type { CookieOptions, Request, Response } from 'express';

/** Name fixed by the API documentation (§3): separate from organizer sessions. */
export const GUEST_COOKIE = 'mm_guest_session';

/** As the organizer cookie: HttpOnly, SameSite=Lax, Secure in production, this host only. */
function cookieOptions(secure: boolean): CookieOptions {
  return { httpOnly: true, sameSite: 'lax', secure, path: '/' };
}

export function setGuestCookie(res: Response, token: string, expiresAt: Date, secure: boolean) {
  res.cookie(GUEST_COOKIE, token, { ...cookieOptions(secure), expires: expiresAt });
}

export function clearGuestCookie(res: Response, secure: boolean) {
  res.clearCookie(GUEST_COOKIE, cookieOptions(secure));
}

/** The guest session token from the Cookie header, if it looks like one of ours. */
export function readGuestCookie(req: Request): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() !== GUEST_COOKIE) continue;
    const value = part.slice(separator + 1).trim();
    return /^[A-Za-z0-9_-]{20,100}$/.test(value) ? value : undefined;
  }
  return undefined;
}
