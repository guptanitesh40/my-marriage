import 'server-only';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { SignOutButton } from '@/components/auth/sign-out-button';
import { ButtonLink } from '@/components/ui/button-link';
import { Wordmark } from '@/components/ui/wordmark';
import { loginThenReturnTo, routes, workspacePath } from '@/lib/routes';
import { getMyInvites, getMyWeddings } from '@/lib/weddings/my-weddings';
import { getWedding, getWorkspaceUser } from '@/lib/weddings/workspace';
import { WorkspaceShell } from './workspace-shell';

/**
 * The workspace of the wedding in the address, for a signed-in, verified
 * member. The API decides who is a member: anyone else, and any address
 * that is not a wedding, sees the same "not found", which says nothing
 * about whether the wedding exists.
 */
export async function Workspace({
  params,
  children,
}: {
  params: Promise<{ weddingId: string }>;
  children: ReactNode;
}) {
  const { weddingId } = await params;
  const [user, result, weddings, invites] = await Promise.all([
    getWorkspaceUser(),
    getWedding(weddingId),
    getMyWeddings(),
    getMyInvites(),
  ]);
  if (!user) redirect(loginThenReturnTo(workspacePath(weddingId)));
  if (!user.emailVerified) redirect(routes.verifyEmail);

  if (result.kind === 'not-found') {
    return (
      <WorkspaceProblem
        title="We couldn’t find that wedding"
        body="It may have been removed, or it isn’t one you’re a member of. Your weddings are on your dashboard."
        action={{ href: routes.dashboard, label: 'Go to your dashboard' }}
      />
    );
  }
  if (result.kind === 'unavailable') {
    return (
      <WorkspaceProblem
        title="We couldn’t load this wedding"
        body="Something went wrong on our side. Your wedding is safe; please try again in a moment."
        action={{ href: workspacePath(weddingId), label: 'Try again' }}
      />
    );
  }
  return (
    <WorkspaceShell
      wedding={result.wedding}
      weddings={weddings ?? [result.wedding]}
      invites={invites ?? []}
      user={user}
    >
      {children}
    </WorkspaceShell>
  );
}

/** While the workspace asks the API: announced to screen readers, blank otherwise. */
export function WorkspaceLoading() {
  return (
    <div className="flex w-full flex-1 bg-surface">
      <p role="status" className="sr-only">
        Loading your workspace…
      </p>
    </div>
  );
}

function WorkspaceProblem({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: { href: string; label: string };
}) {
  return (
    <div className="flex w-full flex-1 flex-col bg-surface-container-low">
      <header className="w-full bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-310 items-center justify-between gap-4 px-5 md:px-10">
          <Wordmark />
          <SignOutButton variant="link" />
        </div>
      </header>
      <main id="main" className="flex w-full flex-1 justify-center px-5 py-12 sm:py-16">
        <section className="h-fit w-full max-w-xl rounded-lg border border-surface-container-highest bg-surface-container-lowest p-8 shadow-sm sm:p-10">
          <h1 className="font-serif text-headline-lg-mobile text-on-surface sm:text-headline-lg">
            {title}
          </h1>
          <p className="mt-4 text-body-lg text-on-surface-variant">{body}</p>
          <ButtonLink href={action.href} size="md" className="mt-6">
            {action.label}
          </ButtonLink>
        </section>
      </main>
    </div>
  );
}
