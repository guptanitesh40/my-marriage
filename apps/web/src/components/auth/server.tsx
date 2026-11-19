import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { ButtonLink } from '@/components/ui/button-link';
import { getCurrentUser, type CurrentUser } from '@/lib/auth/current-user';
import { SESSION_COOKIE } from '@/lib/auth/session-cookie';
import { getMyWeddings } from '@/lib/weddings/my-weddings';
import { routes } from '@/lib/routes';
import { ResendVerification } from './resend-verification';

/**
 * The signed-in visitor, or null — also null when the API cannot be reached,
 * so the page still offers a way forward instead of failing. Visitors with
 * no session cookie are not asked about, and the API is asked at most once
 * per request however many components want to know. Reads the request: call
 * it inside <Suspense>.
 */
export const currentUserOrNull = cache(async (): Promise<CurrentUser | null> => {
  if (!(await cookies()).has(SESSION_COOKIE)) return null;
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
});

/** Where a signed-in visitor's planning starts, and how a link there reads. */
export interface AccountHome {
  href: string;
  label: string;
}

/**
 * Where "Start planning" leads someone signed in: verification first, then
 * creating their wedding, then the dashboard. Null for visitors who are not
 * signed in, who start at sign-in. Linking straight there means no page has
 * to redirect them, which would show one page before the next.
 */
export const accountHome = cache(async (): Promise<AccountHome | null> => {
  const user = await currentUserOrNull();
  if (!user) return null;
  if (!user.emailVerified) return { href: routes.verifyEmail, label: 'Verify your email' };
  const weddings = await getMyWeddings();
  // Unknown (the API did not answer): the dashboard decides when it loads.
  if (weddings?.length === 0) return { href: routes.onboarding, label: 'Create your wedding' };
  return { href: routes.dashboard, label: 'Go to dashboard' };
});

/** The "check your inbox" part of /verify-email, for whoever is visiting. */
export async function InboxPanel() {
  const user = await currentUserOrNull();
  if (user?.emailVerified) {
    return (
      <div className="flex flex-col gap-5 text-body-md text-on-surface-variant">
        <p>Your email address is already verified.</p>
        <ButtonLink href={routes.dashboard} size="md" className="w-full">
          Continue to your dashboard
        </ButtonLink>
      </div>
    );
  }
  return <ResendVerification email={user?.email} />;
}
