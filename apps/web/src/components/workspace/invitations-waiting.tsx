import { ButtonLink } from '@/components/ui/button-link';
import { Icon } from '@/components/ui/icon';
import { routes } from '@/lib/routes';
import { coupleName } from '@/lib/weddings/format';
import type { MyInvite } from '@/lib/weddings/my-weddings';

/** "take over as an owner of", "join as an owner of", "help plan, as an admin,". */
function asWhat(invite: MyInvite): string {
  if (invite.handOver) return 'take over as an owner of';
  if (invite.role === 'owner') return 'join as an owner of';
  return `help plan, as ${invite.role === 'admin' ? 'an admin' : 'a manager'},`;
}

/**
 * Invitations to other weddings waiting for the visitor, at the top of
 * every workspace page: someone already on a team lands in their workspace
 * on signing in, so without this they would only find an invitation
 * through its email.
 */
export function InvitationsWaiting({ invites }: { invites: readonly MyInvite[] }) {
  const [first] = invites;
  if (!first) return null;
  const text =
    invites.length === 1
      ? `${first.invitedByName ?? 'Someone'} invited you to ${asWhat(first)} ${coupleName(first)}’s wedding.`
      : `${invites.length} invitations to other weddings are waiting for your answer.`;
  return (
    <section
      aria-label="Invitations waiting"
      className="mb-6 flex flex-col gap-3 rounded-2xl bg-primary-fixed/40 p-4 ring-1 ring-primary/20 sm:flex-row sm:items-center sm:justify-between sm:px-5"
    >
      <p className="flex items-start gap-3 text-body-md text-on-surface">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary">
          <Icon name="mark-email-read" className="size-5" />
        </span>
        <span className="self-center">{text}</span>
      </p>
      <ButtonLink href={routes.invitations} size="md" className="shrink-0">
        {invites.length === 1 ? 'Review invitation' : 'Review invitations'}
      </ButtonLink>
    </section>
  );
}
