import 'server-only';
import { ButtonLink } from '@/components/ui/button-link';
import { getDashboard } from '@/lib/dashboard/dashboard';
import { firstName } from '@/lib/format';
import { workspacePath } from '@/lib/routes';
import { getWorkspaceUser } from '@/lib/weddings/workspace';
import {
  AboutWedding,
  AttentionTasks,
  CARD,
  ExpenseOverview,
  GettingStarted,
  Hero,
  QuickActions,
  RsvpSnapshot,
  StatCards,
  StatusBanner,
  StatusTiles,
  UpcomingCeremonies,
} from './sections';

/**
 * The wedding overview (PRD DASH-01 to DASH-03, Stitch "Wedding Overview
 * Dashboard", decision 0022): where the celebrations stand, from one read
 * of the API. Every number comes from the wedding's own records; a section
 * that could not be loaded says so instead of showing zero. Archived and
 * deletion-pending weddings show the same numbers without the shortcuts
 * that would change anything.
 */
export async function OverviewSection({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params;
  const [user, dashboard] = await Promise.all([getWorkspaceUser(), getDashboard(weddingId)]);
  if (dashboard.kind !== 'ok') return <Unavailable href={workspacePath(weddingId)} />;

  const isNew =
    dashboard.wedding.status === 'active' &&
    dashboard.ceremonies?.upcoming === 0 &&
    dashboard.ceremonies.undated === 0 &&
    dashboard.guests?.contacts === 0;

  return (
    <div className="flex flex-col gap-6">
      <Hero dashboard={dashboard} firstName={firstName(user?.displayName)} />
      <StatusBanner wedding={dashboard.wedding} />
      {isNew && <GettingStarted dashboard={dashboard} />}
      <StatCards dashboard={dashboard} />
      <QuickActions dashboard={dashboard} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-7 xl:col-span-8">
          <UpcomingCeremonies dashboard={dashboard} />
          <AttentionTasks dashboard={dashboard} />
        </div>
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-5 xl:col-span-4">
          <AboutWedding wedding={dashboard.wedding} />
          <ExpenseOverview dashboard={dashboard} />
          <RsvpSnapshot dashboard={dashboard} />
        </div>
      </div>
      <StatusTiles dashboard={dashboard} />
    </div>
  );
}

function Unavailable({ href }: { href: string }) {
  return (
    <section className={`${CARD} p-8`}>
      <h1 className="text-title-md text-on-surface">We couldn’t load the overview</h1>
      <p className="mt-2 text-body-md text-on-surface-variant">
        Something went wrong on our side. Please try again in a moment.
      </p>
      <ButtonLink href={href} size="md" className="mt-5">
        Try again
      </ButtonLink>
    </section>
  );
}

/** While the overview loads: announced to screen readers, with the page's outline. */
export function OverviewLoading() {
  const block = 'animate-pulse rounded-2xl bg-surface-container';
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <p role="status" className="sr-only">
        Loading the overview…
      </p>
      <div className={`${block} h-44`} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className={`${block} h-32`} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className={`${block} h-96 lg:col-span-7 xl:col-span-8`} />
        <div className={`${block} h-96 lg:col-span-5 xl:col-span-4`} />
      </div>
    </div>
  );
}
