import type { CookieOptions, Request, Response } from 'express';

/** Name fixed by the API documentation (§3): separate from organizer and RSVP sessions. */
export const UPLOAD_COOKIE = 'mm_upload_session';

/** HttpOnly, SameSite=Lax, Secure in production, for the API only. */
function cookieOptions(secure: boolean): CookieOptions {
  return { httpOnly: true, sameSite: 'lax', secure, path: '/api/v1' };
}

export function setUploadCookie(res: Response, value: string, expiresAt: Date, secure: boolean) {
  res.cookie(UPLOAD_COOKIE, value, { ...cookieOptions(secure), expires: expiresAt });
}

export function readUploadCookie(req: Request): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() !== UPLOAD_COOKIE) continue;
    const value = part.slice(separator + 1).trim();
    return value.length <= 200 ? value : undefined;
  }
  return undefined;
}
