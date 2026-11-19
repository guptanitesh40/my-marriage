import 'server-only';
import { redirect } from 'next/navigation';
import { currentUserOrNull } from '@/components/auth/server';
import { FormAlert } from '@/components/forms/form-alert';
import { ButtonLink } from '@/components/ui/button-link';
import { getCurrentUser, type CurrentUser } from '@/lib/auth/current-user';
import { loginThenReturnTo, routes } from '@/lib/routes';
import { coupleName, whereAndWhen } from '@/lib/weddings/format';
import {
  getInvites,
  getMyInvites,
  getMyWeddings,
  ownedActiveWedding,
  type Wedding,
} from '@/lib/weddings/my-weddings';
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
export async function WeddingStep({ startOwn = false }: { startOwn?: boolean }) {
  const { user, weddings } = await onboardingVisitor(routes.onboarding);
  const owned = weddings ? ownedActiveWedding(weddings) : undefined;

  if (!owned && !startOwn) {
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
        You can own one active wedding at a time, and still help plan others.
      </p>
    </>
  );
}

/**
 * Step 2: invite your partner. Shows the invitation form, the pending
 * invitation if one was sent, or — once the partner has accepted — that
 * they have joined.
 */
export async function PartnerStep() {
  const { weddings } = await onboardingVisitor(routes.onboardingPartner);
  const owned = weddings ? ownedActiveWedding(weddings) : undefined;
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
