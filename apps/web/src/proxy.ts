import { NextResponse, type NextRequest } from 'next/server';
import { apiClientAsVisitor } from '@/lib/api/as-visitor';
import { safeNextPath } from '@/lib/auth/safe-next-path';
import { SESSION_COOKIE } from '@/lib/auth/session-cookie';
import { loginThenReturnTo, routes, workspacePath } from '@/lib/routes';
import { landingWedding } from '@/lib/weddings/choose';

// Long enough for a healthy API; short enough that a struggling one only
// delays the sign-in page instead of hanging it.
const SESSION_CHECK_TIMEOUT_MS = 3000;

type Session = { emailVerified: boolean } | 'none' | 'unknown';

/** Asks the API who the cookie belongs to; the API alone decides. */
async function sessionOf(request: NextRequest): Promise<Session> {
  try {
    const { data, response } = await apiClientAsVisitor(request.headers).GET('/api/v1/auth/me', {
      signal: AbortSignal.timeout(SESSION_CHECK_TIMEOUT_MS),
    });
    if (response.status === 401) return 'none';
    return data ? { emailVerified: data.data.emailVerified } : 'unknown';
  } catch {
    return 'unknown';
  }
}

type WeddingsAnswer = { landingId: string | undefined } | 'none' | 'unverified' | 'unknown';

/** Which wedding `/dashboard` opens for the cookie's account, if the API can say. */
async function weddingsOf(request: NextRequest): Promise<WeddingsAnswer> {
  try {
    const { data, response } = await apiClientAsVisitor(request.headers).GET('/api/v1/weddings', {
      signal: AbortSignal.timeout(SESSION_CHECK_TIMEOUT_MS),
    });
    if (response.status === 401) return 'none';
    if (response.status === 403) return 'unverified';
    return data ? { landingId: landingWedding(data.data)?.id } : 'unknown';
  } catch {
    return 'unknown';
  }
}

/** Continues to the page, dropping an expired or revoked session cookie. */
function withoutSessionCookie(response: NextResponse): NextResponse {
  // So the next visit skips the check, and signed-in pages stop treating it as present.
  response.cookies.delete(SESSION_COOKIE);
  return response;
}

/**
 * Redirects decided before a page renders, so the visitor never sees one
 * page flash before the next. These are shortcuts, not security checks: the
 * API checks the session on every request it serves.
 *
 * - /login and /signup: someone signed in goes straight on — like the login
 *   form, to a safe `?next=` path or the dashboard, or to verify their email.
 * - /dashboard: someone signed in goes to their wedding's workspace (their
 *   own active one, or else the newest), or to create one if they have none;
 *   an unverified account goes to verification.
 * - Signed-in pages: a visitor with no session cookie at all is sent to sign
 *   in.
 *
 * Only visitors with a session cookie cost an API call; if the API cannot
 * answer, the page is shown as usual and decides for itself.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasCookie = request.cookies.has(SESSION_COOKIE);

  if (pathname === routes.login || pathname === routes.signup) {
    if (!hasCookie) return NextResponse.next();
    const session = await sessionOf(request);
    if (session === 'unknown') return NextResponse.next();
    if (session === 'none') return withoutSessionCookie(NextResponse.next());
    const target = session.emailVerified
      ? (safeNextPath(request.nextUrl.searchParams.get('next')) ?? routes.dashboard)
      : routes.verifyEmail;
    return NextResponse.redirect(new URL(target, request.url));
  }

  if (pathname === routes.dashboard && hasCookie) {
    const weddings = await weddingsOf(request);
    const goTo = (path: string) => NextResponse.redirect(new URL(path, request.url));
    if (weddings === 'none') return withoutSessionCookie(goTo(loginThenReturnTo(routes.dashboard)));
    if (weddings === 'unverified') return goTo(routes.verifyEmail);
    if (weddings === 'unknown') return NextResponse.next();
    return goTo(weddings.landingId ? workspacePath(weddings.landingId) : routes.onboarding);
  }

  if (hasCookie) return NextResponse.next();
  return NextResponse.redirect(new URL(loginThenReturnTo(`${pathname}${search}`), request.url));
}

export const config = {
  matcher: ['/login', '/signup', '/dashboard/:path*', '/onboarding/:path*', '/weddings/:path*'],
};
