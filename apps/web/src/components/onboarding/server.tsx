import 'server-only';
import { redirect } from 'next/navigation';
import { currentUserOrNull } from '@/components/auth/server';
import { FormAlert } from '@/components/forms/form-alert';
import { ButtonLink } from '@/components/ui/button-link';
import { getCurrentUser, type CurrentUser } from '@/lib/auth/current-user';
import { loginThenReturnTo, routes } from '@/lib/routes';
import { coupleName, whereAndWhen } from '@/lib/weddings/format';
import { ownedActiveWedding } from '@/lib/weddings/choose';
import { getInvites, getMyInvites, getMyWeddings, type Wedding } from '@/lib/weddings/my-weddings';
import { PartnerInvite } from './partner-invite';
import { PendingInvitations } from './pending-invitations';
import { StepHeading, StepProgress, stepCardClass } from './step-progress';
import { WeddingDetailsForm } from './wedding-details-form';

/**
 * The signed-in, verified visitor of an onboarding page, sent to sign in or
 * to verify first otherwise. What the page shows comes from the API, never
 * from the browser, so a refresh or a second tab always shows the truth.
 */
async function onboardingVisitor(path: string): Promise<{
  user: CurrentUser;
  weddings: Wedding[] | null;
}> {
  const user = await getCurrentUser();
  if (!user) redirect(loginThenReturnTo(path));
  if (!user.emailVerified) redirect(routes.verifyEmail);
  return { user, weddings: await getMyWeddings() };
}

/**
 * Step 1: the form to create the wedding — or, for someone who already owns
 * one (coming back from step 2, or refreshing), the same form showing that
 * wedding, to change its details. A second wedding cannot be created (PRD
 * WED-03), so creating is not offered then.
 *
 * Someone who owns no wedding but has been invited to one sees their
 * invitations first (decision 0008), on every visit until they accept one
 * or create a wedding, unless they just chose to start their own
 * (`startOwn`, from "Start my own wedding instead").
 */
export async function WeddingStep({
  startOwn = false,
  startNew = false,
}: {
  startOwn?: boolean;
  /** Another wedding, from the wedding switcher: always the empty form. */
  startNew?: boolean;
}) {
  const { user, weddings } = await onboardingVisitor(routes.onboarding);
  const owned = !startNew && weddings ? ownedActiveWedding(weddings) : undefined;

  if (!owned && !startOwn && !startNew) {
    const invites = await getMyInvites();
    if (invites && invites.length > 0) {
      return <PendingInvitations invites={invites} email={user.email} />;
    }
  }

  return (
    <>
      <StepProgress step={1} title="Your wedding" />
      {owned ? (
        <StepHeading
          title="Your wedding details"
          intro="Change anything you need, then continue. You can refine these details as your planning unfolds."
        />
      ) : (
        <StepHeading
          title="Let’s start your wedding"
          intro="Just a few details to create your shared planning space. You can refine them as your planning unfolds."
        />
      )}
      <div className={stepCardClass}>
        <div
          className="pointer-events-none absolute top-0 right-0 size-32 rounded-bl-[80px] bg-secondary-container/20"
          aria-hidden="true"
        />
        <WeddingDetailsForm wedding={owned} />
      </div>
      <p className="mt-6 px-2 text-body-sm text-on-surface-variant">
        You can own or help plan several weddings, and switch between them at any time.
      </p>
    </>
  );
}

/**
 * Step 2: invite your partner. Shows the invitation form, the pending
 * invitation if one was sent, or — once the partner has accepted — that
 * they have joined.
 */
export async function PartnerStep({ weddingId }: { weddingId?: string } = {}) {
  const { weddings } = await onboardingVisitor(routes.onboardingPartner);
  const owned = weddingId
    ? weddings?.find(
        (wedding) =>
          wedding.id === weddingId && wedding.role === 'owner' && wedding.status === 'active',
      )
    : weddings
      ? ownedActiveWedding(weddings)
      : undefined;
  // Nothing to invite a partner to yet.
  if (!owned) redirect(routes.onboarding);

  const invites = (await getInvites(owned.id)) ?? [];
  const partnerInvites = invites.filter((invite) => invite.role === 'owner');
  const joined = partnerInvites.find((invite) => invite.status === 'accepted');
  const open = partnerInvites.find(
    (invite) => invite.status === 'pending' || invite.status === 'expired',
  );

  if (joined) {
    return (
      <>
        <StepProgress step={2} title="Invite your partner" aside="Done" />
        <StepHeading
          title="Better together"
          intro="You and your partner now plan this wedding together, as equal owners."
        />
        <div className={stepCardClass}>
          <FormAlert tone="success" title="Your partner has joined">
            {joined.email} accepted the invitation and is now an owner of {coupleName(owned)}’s
            wedding.
          </FormAlert>
          <ButtonLink href={routes.dashboard} size="lg" className="w-full">
            Continue to your dashboard
          </ButtonLink>
        </div>
      </>
    );
  }

  return (
    <PartnerInvite
      weddingId={owned.id}
      initial={open}
      created={{ couple: coupleName(owned), details: whereAndWhen(owned) }}
    />
  );
}

/** The signed-in address, in the header. */
export async function AccountChip() {
  const user = await currentUserOrNull();
  if (!user) return null;
  return (
    <p className="hidden items-center gap-2 rounded-full bg-surface-container-lowest px-3 py-1.5 text-label-md text-on-surface shadow-sm sm:flex">
      <span className="size-2 rounded-full bg-primary-container" aria-hidden="true" />
      <span className="sr-only">Signed in as </span>
      {user.email}
    </p>
  );
}

/**
 * The invitations waiting for the signed-in account (`/invitations`), to
 * accept or decline without the email link. For anyone, including someone
 * already on a wedding's team, who lands in their workspace on signing in
 * and is pointed here by its banner.
 */
export async function InvitationsStep() {
  const { user, weddings } = await onboardingVisitor(routes.invitations);
  const invites = await getMyInvites();
  if (invites && invites.length > 0) {
    return (
      <PendingInvitations
        invites={invites}
        email={user.email}
        hasWeddings={(weddings?.length ?? 0) > 0}
      />
    );
  }
  return (
    <section className={stepCardClass}>
      <h1 className="font-serif text-headline-md text-on-surface">
        {invites ? 'No invitations waiting' : 'We couldn’t load your invitations'}
      </h1>
      <p className="text-body-md text-on-surface-variant">
        {invites
          ? `Nothing is waiting for ${user.email}. An invitation that was accepted, declined, withdrawn or has expired isn’t shown.`
          : 'Something went wrong on our side. Please try again in a moment.'}
      </p>
      <ButtonLink href={invites ? routes.dashboard : routes.invitations} size="md">
        {invites ? 'Go to my weddings' : 'Try again'}
      </ButtonLink>
    </section>
  );
}
