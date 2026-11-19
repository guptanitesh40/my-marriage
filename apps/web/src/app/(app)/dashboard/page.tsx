import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getCurrentUser } from '@/lib/auth/current-user';
import { loginThenReturnTo, routes } from '@/lib/routes';
import { coupleName } from '@/lib/weddings/format';
import { getMyWeddings, ownedActiveWedding } from '@/lib/weddings/my-weddings';

export const metadata: Metadata = { title: 'Dashboard' };

/**
 * The signed-in landing page. For now a welcome naming the wedding; the
 * workspace handoff and planning dashboard come with milestone M3.4.
 */
export default function DashboardPage() {
  return (
    <Suspense
      fallback={<p className="text-body-md text-on-surface-variant">Loading your account…</p>}
    >
      <Welcome />
    </Suspense>
  );
}

async function Welcome() {
  const user = await getCurrentUser();
  if (!user) redirect(loginThenReturnTo(routes.dashboard));
  if (!user.emailVerified) redirect(routes.verifyEmail);
  // The proxy usually sends someone without a wedding to onboarding first.
  const weddings = await getMyWeddings();
  if (weddings?.length === 0) redirect(routes.onboarding);
  const wedding = weddings ? (ownedActiveWedding(weddings) ?? weddings[0]) : undefined;

  return (
    <section className="max-w-2xl rounded-lg border border-surface-container-highest bg-surface-container-lowest p-8 shadow-sm sm:p-10">
      <p className="text-label-sm font-semibold tracking-widest text-secondary uppercase">
        Your account
      </p>
      <h1 className="mt-3 font-serif text-headline-lg-mobile text-on-surface sm:text-headline-lg">
        Welcome, {user.displayName}
      </h1>
      <p className="mt-4 text-body-lg text-on-surface-variant">
        You are signed in as <strong className="font-semibold text-on-surface">{user.email}</strong>
        .
      </p>
      {wedding && (
        <p className="mt-2 text-body-lg text-on-surface-variant">
          Your wedding:{' '}
          <strong className="font-semibold text-on-surface">{coupleName(wedding)}</strong>,{' '}
          {wedding.city}, {wedding.state}. Planning tools arrive next.
        </p>
      )}
    </section>
  );
}
