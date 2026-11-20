import 'server-only';
import { Icon } from '@/components/ui/icon';
import { firstName } from '@/lib/format';
import { coupleName, whereAndWhen } from '@/lib/weddings/format';
import { getWedding, getWorkspaceUser } from '@/lib/weddings/workspace';

/**
 * The top of the overview: who is here and which wedding this is. The
 * planning summaries join it as their features are built (PRD DASH-01).
 * Renders nothing when the layout is already explaining a problem.
 */
export async function OverviewIntro({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params;
  const [user, result] = await Promise.all([getWorkspaceUser(), getWedding(weddingId)]);
  if (!user || result.kind !== 'ok') return null;
  const { wedding } = result;

  return (
    <section className="flex max-w-3xl flex-col gap-2">
      <p className="text-label-sm font-semibold tracking-widest text-secondary uppercase">
        Overview
      </p>
      <h1 className="font-serif text-headline-lg-mobile tracking-tight text-primary sm:text-headline-lg">
        Welcome, {firstName(user.displayName) ?? user.displayName}.
      </h1>
      <p className="text-body-lg text-on-surface-variant">
        {coupleName(wedding)}’s wedding · {whereAndWhen(wedding)}
      </p>
      <p className="mt-4 flex items-center gap-2 text-body-sm text-on-surface-variant">
        <Icon name="lock" className="size-4 shrink-0 text-secondary" />
        Only the wedding’s owners and managers can see this workspace.
      </p>
    </section>
  );
}
