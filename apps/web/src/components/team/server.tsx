import 'server-only';
import { ButtonLink } from '@/components/ui/button-link';
import { Icon } from '@/components/ui/icon';
import { initials } from '@/lib/format';
import { teamPath, workspacePath } from '@/lib/routes';
import { expiresIn, openTasks, shortDate } from '@/lib/team/format';
import { getTeam, type TeamInvite, type TeamMember } from '@/lib/team/team';
import { getWedding } from '@/lib/weddings/workspace';
import { InviteActions } from './invite-actions';
import { InviteButton } from './invite-button';
import { MemberActions } from './member-actions';

const CARD = 'rounded-2xl bg-surface-container-lowest shadow-xs ring-1 ring-outline-variant/30';

/**
 * Team & Family (Stitch "Team & Collaboration — My Marriage", decision
 * 0020): the bride and groom as protected owners, the admins and managers
 * helping them, and the invitations waiting. Owners and admins only; a
 * manager is told who to ask. Read-only once the wedding is archived.
 */
export async function TeamSection({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params;
  const [wedding, team] = await Promise.all([getWedding(weddingId), getTeam(weddingId)]);
  if (wedding.kind !== 'ok') return null;
  if (team.kind === 'forbidden') return <ForTheCoupleOnly weddingId={weddingId} />;
  if (team.kind === 'unavailable') return <Unavailable href={teamPath(weddingId)} />;

  const writable = wedding.wedding.status === 'active';
  const viewerRole = team.viewerRole;
  const owners = team.members.filter((member) => member.role === 'owner');
  const helpers = team.members.filter((member) => member.role !== 'owner');
  const waiting = team.invites.filter(
    (invite) => invite.status === 'pending' || invite.status === 'expired',
  );
  const partnerInvite = waiting.find((invite) => invite.role === 'owner' && !invite.handOver);
  // Hand-overs (decision 0025) wait with the others: they fill no new seat.
  const helperInvites = waiting.filter((invite) => invite.role !== 'owner' || invite.handOver);
  const owner = viewerRole === 'owner';
  const admins = helpers.filter((member) => member.role === 'admin').length;

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex max-w-2xl flex-col gap-2">
          <p className="flex items-center gap-2 text-label-sm font-semibold tracking-widest text-secondary uppercase">
            <Icon name="supervisor-account" className="size-4" />
            Team & Family
          </p>
          <h1 className="font-serif text-headline-lg-mobile tracking-tight text-on-surface sm:text-headline-lg">
            Your team
          </h1>
          <p className="text-body-lg text-on-surface-variant">
            Plan together with the people you trust.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-surface-container-lowest px-4 py-2.5 text-body-sm text-on-surface shadow-xs ring-1 ring-outline-variant/30">
            <Count tone="bg-primary" n={owners.length} one="owner" />
            <Count tone="bg-secondary" n={admins} one="admin" />
            <Count tone="bg-tertiary" n={helpers.length - admins} one="manager" />
            <Count tone="bg-secondary-fixed-dim" n={waiting.length} one="pending invitation" />
          </p>
          {writable && (
            <InviteButton weddingId={weddingId} kind="helper" canHandOver={owner}>
              <Icon name="person-add" className="size-5" />
              Invite someone
            </InviteButton>
          )}
        </div>
      </header>

      {!writable && (
        <section
          aria-labelledby="archived-heading"
          className="flex items-start gap-4 rounded-2xl bg-surface-container-high p-5"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-container-lowest text-on-surface-variant">
            <Icon name="lock" className="size-5" />
          </span>
          <div>
            <h2 id="archived-heading" className="text-title-sm text-on-surface">
              Archived wedding: the team is read-only
            </h2>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              This celebration is over. Nobody can be invited, changed or removed any more.
            </p>
          </div>
        </section>
      )}

      <section aria-labelledby="owners-heading" className="flex flex-col gap-4">
        <SectionHeading
          id="owners-heading"
          icon="security"
          title="Wedding owners"
          chip="Equal authority"
          intro="The bride and groom: at most two equal owners, with full authority over the wedding. Nobody can remove or change them, but an owner can hand over their own place."
        />
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {owners.map((member) => (
            <li key={member.userId}>
              <OwnerCard
                member={member}
                weddingId={weddingId}
                writable={writable}
                canHandOver={writable && owner && member.isYou}
              />
            </li>
          ))}
          {owners.length < 2 && (
            <li>
              <PartnerSlot
                weddingId={weddingId}
                invite={partnerInvite}
                canInvite={writable && viewerRole === 'owner'}
              />
            </li>
          )}
        </ul>
        <p className="flex items-start gap-3 rounded-xl bg-surface-container p-4 text-body-sm text-on-surface-variant">
          <Icon name="lock" className="mt-0.5 size-4.5 shrink-0 text-secondary" />
          <span>
            <strong className="font-semibold text-on-surface">Equal owner governance:</strong> both
            owners have the same authority. Admins can run the team, but can’t remove an owner,
            invite the partner or archive the wedding. A wedding never has more than two owners. An
            owner who set the wedding up for someone else can hand over their ownership and stay on
            as an admin.
          </span>
        </p>
      </section>

      <section aria-labelledby="helpers-heading" className="flex flex-col gap-4">
        <SectionHeading
          id="helpers-heading"
          icon="groups"
          title={`Admins & managers (${helpers.length})`}
          chip="Planning team"
          intro="Admins plan everything and look after the team with you. Managers help with events, tasks, vendors, expenses, guests, the website and photos, but never manage the team."
        />
        {helpers.length === 0 ? (
          <div className={`${CARD} flex flex-col items-center px-6 py-10 text-center`}>
            <span className="flex size-14 items-center justify-center rounded-full bg-primary-fixed/60 text-primary">
              <Icon name="group-add" className="size-7" />
            </span>
            <h3 className="mt-4 font-serif text-headline-sm text-on-surface">No helpers yet</h3>
            <p className="mt-2 max-w-md text-body-md text-on-surface-variant">
              Invite family, friends or your wedding planner. Make a parent an admin to let them run
              the team with you.
            </p>
            {writable && (
              <div className="mt-5">
                <InviteButton weddingId={weddingId} kind="helper" canHandOver={owner}>
                  <Icon name="person-add" className="size-5" />
                  Invite someone
                </InviteButton>
              </div>
            )}
          </div>
        ) : (
          <ul className={`${CARD} divide-y divide-surface-container-high`}>
            {helpers.map((member) => (
              <li key={member.userId}>
                <HelperRow member={member} weddingId={weddingId} writable={writable} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="invites-heading" className="flex flex-col gap-4">
        <SectionHeading
          id="invites-heading"
          icon="mark-email-read"
          title={`Pending invitations (${helperInvites.length})`}
          intro="Sent to their email address. Nobody gets access until they accept."
        />
        {helperInvites.length === 0 ? (
          <p className="rounded-xl bg-surface-container-low px-5 py-4 text-body-md text-on-surface-variant">
            No invitations are waiting.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {helperInvites.map((invite) => (
              <li key={invite.id}>
                <InviteRow
                  invite={invite}
                  weddingId={weddingId}
                  writable={writable && (invite.role !== 'owner' || owner)}
                />
              </li>
            ))}
          </ul>
        )}
        <p className="flex items-start gap-3 rounded-xl bg-surface-container-low p-4 text-body-sm text-on-surface-variant">
          <Icon name="shield" className="mt-0.5 size-4.5 shrink-0 text-secondary" />
          Invitations are sent as a private link to the person’s email address, and only an account
          with that address can accept. A pending invitation gives no access.
        </p>
      </section>
    </div>
  );
}

function Count({ tone, n, one }: { tone: string; n: number; one: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`size-2 rounded-full ${tone}`} aria-hidden="true" />
      <strong className="font-semibold">{n}</strong> {n === 1 ? one : `${one}s`}
    </span>
  );
}

function SectionHeading({
  id,
  icon,
  title,
  chip,
  intro,
}: {
  id: string;
  icon: 'security' | 'groups' | 'mark-email-read';
  title: string;
  chip?: string;
  intro: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={id} className="flex items-center gap-2 font-serif text-headline-sm text-on-surface">
          <Icon name={icon} className="size-5 text-primary" />
          {title}
        </h2>
        {chip && (
          <span className="rounded-full bg-secondary-fixed/60 px-2.5 py-1 text-label-sm tracking-wider text-on-secondary-fixed-variant uppercase">
            {chip}
          </span>
        )}
      </div>
      <p className="max-w-3xl text-body-sm text-on-surface-variant">{intro}</p>
    </div>
  );
}

function Avatar({ name, tone }: { name: string; tone: string }) {
  return (
    <span
      aria-hidden="true"
      className={`flex size-12 shrink-0 items-center justify-center rounded-xl text-title-md ${tone}`}
    >
      {initials(name)}
    </span>
  );
}

function OwnerCard({
  member,
  weddingId,
  writable,
  canHandOver,
}: {
  member: TeamMember;
  weddingId: string;
  writable: boolean;
  canHandOver: boolean;
}) {
  return (
    <article className={`${CARD} flex h-full flex-col overflow-hidden`}>
      <div className="flex items-start gap-4 p-5">
        <Avatar name={member.displayName} tone="bg-primary text-on-primary" />
        <div className="min-w-0 flex-1">
          <h3 className="flex flex-wrap items-center gap-2 text-title-md text-on-surface">
            <span className="truncate">{member.displayName}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-label-sm text-on-primary">
              <Icon name="workspace-premium" className="size-3.5" />
              Owner
            </span>
            {member.isYou && <YouChip />}
          </h3>
          <p className="truncate text-body-sm text-on-surface-variant">{member.email}</p>
          {member.label && <p className="mt-1 text-label-md text-secondary">{member.label}</p>}
        </div>
        {writable && <MemberActions weddingId={weddingId} member={member} protectedOwner />}
      </div>
      {canHandOver && (
        <div className="px-5 pb-4">
          <InviteButton
            weddingId={weddingId}
            kind="helper"
            canHandOver
            initialRole="handOver"
            variant="secondary"
          >
            <Icon name="sync" className="size-4.5" />
            Hand over my ownership
          </InviteButton>
        </div>
      )}
      <div className="mt-auto flex items-center justify-between gap-2 bg-surface-container-low px-5 py-3 text-body-sm text-on-surface-variant">
        <span className="flex items-center gap-1.5">
          <Icon name="calendar-today" className="size-4" />
          Joined {shortDate(member.joinedAt)}
        </span>
        <span className="flex items-center gap-1 text-label-sm tracking-wider uppercase">
          <Icon name="lock" className="size-3.5" />
          Protected
        </span>
      </div>
    </article>
  );
}

function PartnerSlot({
  weddingId,
  invite,
  canInvite,
}: {
  weddingId: string;
  invite: TeamInvite | undefined;
  canInvite: boolean;
}) {
  return (
    <article className="flex h-full flex-col justify-center gap-3 rounded-2xl border-2 border-dashed border-outline-variant p-5">
      <p className="flex items-center gap-2 text-title-sm text-on-surface">
        <Icon name="person-add" className="size-5 text-secondary" />
        Second owner: available
      </p>
      {invite ? (
        <>
          <p className="text-body-sm text-on-surface-variant">
            <span className="font-semibold text-on-surface">Invite pending:</span> {invite.email}
            {invite.status === 'expired' ? ' (expired)' : ''}
          </p>
          {canInvite && <InviteActions weddingId={weddingId} invite={invite} />}
        </>
      ) : canInvite ? (
        <>
          <p className="text-body-sm text-on-surface-variant">
            Invite your partner as the second equal owner of the wedding.
          </p>
          <div>
            <InviteButton weddingId={weddingId} kind="partner" variant="secondary">
              Invite your partner
            </InviteButton>
          </div>
        </>
      ) : (
        <p className="text-body-sm text-on-surface-variant">
          Only an owner can invite the partner.
        </p>
      )}
    </article>
  );
}

function HelperRow({
  member,
  weddingId,
  writable,
}: {
  member: TeamMember;
  weddingId: string;
  writable: boolean;
}) {
  const admin = member.role === 'admin';
  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <Avatar
          name={member.displayName}
          tone={
            admin
              ? 'bg-secondary-container text-on-secondary-container'
              : 'bg-primary-fixed text-on-primary-fixed-variant'
          }
        />
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span className="text-title-sm text-on-surface">{member.displayName}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-label-sm ${admin ? 'bg-secondary text-on-secondary' : 'bg-surface-container-high text-on-surface-variant'}`}
            >
              {admin ? 'Admin' : 'Manager'}
            </span>
            {member.label && (
              <span className="rounded-full bg-secondary-fixed/60 px-2 py-0.5 text-label-sm text-on-secondary-fixed-variant">
                {member.label}
              </span>
            )}
            {member.isYou && <YouChip />}
          </p>
          <p className="truncate text-body-sm text-on-surface-variant">{member.email}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 pl-16 sm:pl-0">
        <span className="flex items-center gap-1.5 text-body-sm text-on-surface">
          <Icon name="task-alt" className="size-4.5 text-primary" />
          {openTasks(member.openTaskCount)}
        </span>
        <span className="flex items-center gap-1.5 text-body-sm text-on-surface-variant">
          <Icon name="calendar-today" className="size-4" />
          Joined {shortDate(member.joinedAt)}
        </span>
        {writable ? (
          <MemberActions weddingId={weddingId} member={member} />
        ) : (
          <span className="size-9" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}

function InviteRow({
  invite,
  weddingId,
  writable,
}: {
  invite: TeamInvite;
  weddingId: string;
  writable: boolean;
}) {
  const expired = invite.status === 'expired';
  const failed = invite.emailStatus === 'failed';
  return (
    <article
      className={`${CARD} flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5`}
    >
      <div className="flex min-w-0 items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary-fixed/50 text-secondary">
          <Icon name="mail" className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span className="truncate text-title-sm text-on-surface">{invite.email}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-label-sm ${invite.handOver ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'}`}
            >
              {invite.handOver ? 'Owner hand-over' : invite.role === 'admin' ? 'Admin' : 'Manager'}
            </span>
            {invite.label && (
              <span className="rounded-full bg-secondary-fixed/60 px-2 py-0.5 text-label-sm text-on-secondary-fixed-variant">
                {invite.label}
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-label-sm ${
                expired || failed
                  ? 'bg-error-container text-on-error-container'
                  : 'bg-secondary-fixed text-on-secondary-fixed-variant'
              }`}
            >
              <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
              {expired ? 'Expired' : failed ? 'Email not sent' : 'Pending acceptance'}
            </span>
          </p>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            Invited
            {invite.invitedByName ? (
              <>
                {' '}
                by <span className="font-semibold text-on-surface">{invite.invitedByName}</span>
              </>
            ) : null}{' '}
            on {shortDate(invite.createdAt)}
            {expired ? '' : ` · Link expires ${expiresIn(invite.expiresAt)}`}
          </p>
          {invite.handOver && (
            <p className="mt-1 text-body-sm text-on-surface-variant">
              Becomes an owner in place of {invite.invitedByName ?? 'the owner who sent it'}, who
              then stays on as an admin.
            </p>
          )}
        </div>
      </div>
      {writable && <InviteActions weddingId={weddingId} invite={invite} />}
    </article>
  );
}

function YouChip() {
  return (
    <span className="rounded-full bg-primary-fixed px-2 py-0.5 text-label-sm text-on-primary-fixed-variant">
      You
    </span>
  );
}

function ForTheCoupleOnly({ weddingId }: { weddingId: string }) {
  return (
    <section className={`${CARD} flex flex-col items-center px-6 py-12 text-center`}>
      <span className="flex size-14 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
        <Icon name="lock" className="size-7" />
      </span>
      <h1 className="mt-4 font-serif text-headline-md text-on-surface">
        The team is managed by the couple
      </h1>
      <p className="mt-2 max-w-md text-body-md text-on-surface-variant">
        Only the owners and admins can see and change the team. Ask the couple if someone should
        join or leave.
      </p>
      <ButtonLink href={workspacePath(weddingId)} size="md" className="mt-6">
        Back to the overview
      </ButtonLink>
    </section>
  );
}

function Unavailable({ href }: { href: string }) {
  return (
    <section className={`${CARD} p-8`}>
      <h1 className="text-title-md text-on-surface">We couldn’t load the team</h1>
      <p className="mt-2 text-body-md text-on-surface-variant">
        Something went wrong on our side. Please try again in a moment.
      </p>
      <ButtonLink href={href} size="md" className="mt-5">
        Try again
      </ButtonLink>
    </section>
  );
}

/** While the team loads: announced to screen readers, with the page's outline. */
export function TeamLoading() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true">
      <p role="status" className="sr-only">
        Loading your team…
      </p>
      <div className="h-24 animate-pulse rounded-2xl bg-surface-container" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="h-36 animate-pulse rounded-2xl bg-surface-container" />
        <div className="h-36 animate-pulse rounded-2xl bg-surface-container" />
      </div>
      <div className="h-48 animate-pulse rounded-2xl bg-surface-container" />
    </div>
  );
}
