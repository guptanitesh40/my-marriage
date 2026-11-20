import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { ButtonLink } from '@/components/ui/button-link';
import { getCurrentUser } from '@/lib/auth/current-user';
import { loginThenReturnTo, routes, workspacePath } from '@/lib/routes';
import { landingWedding } from '@/lib/weddings/choose';
import { getMyWeddings } from '@/lib/weddings/my-weddings';

export const metadata: Metadata = { title: 'Dashboard' };

/**
 * Where "Go to your dashboard" leads: the workspace of the visitor's own
 * active wedding, or else the newest they belong to. The proxy usually
 * redirects before this renders; this is the same decision for when it
 * could not ask the API.
 */
export default function DashboardPage() {
  return (
    <Suspense
      fallback={<p className="text-body-md text-on-surface-variant">Opening your workspace…</p>}
    >
      <OpenWorkspace />
    </Suspense>
  );
}

async function OpenWorkspace() {
  const user = await getCurrentUser();
  if (!user) redirect(loginThenReturnTo(routes.dashboard));
  if (!user.emailVerified) redirect(routes.verifyEmail);
  const weddings = await getMyWeddings();
  if (weddings?.length === 0) redirect(routes.onboarding);
  const wedding = weddings ? landingWedding(weddings) : undefined;
  if (wedding) redirect(workspacePath(wedding.id));

  return (
    <section
      role="alert"
      className="max-w-2xl rounded-lg border border-surface-container-highest bg-surface-container-lowest p-8 shadow-sm sm:p-10"
    >
      <h1 className="font-serif text-headline-lg-mobile text-on-surface sm:text-headline-lg">
        We couldn’t open your workspace
      </h1>
      <p className="mt-4 text-body-lg text-on-surface-variant">
        Something went wrong on our side. Your wedding is safe; please try again in a moment.
      </p>
      <ButtonLink href={routes.dashboard} size="md" className="mt-6">
        Try again
      </ButtonLink>
    </section>
  );
}
