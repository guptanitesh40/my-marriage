import type { ReactNode } from 'react';
import { SignOutButton } from '@/components/auth/sign-out-button';
import { Icon } from '@/components/ui/icon';
import { LogoMark } from '@/components/ui/logo-mark';
import type { CurrentUser } from '@/lib/auth/current-user';
import { initials } from '@/lib/format';
import { coupleName, placeAndYear, roleLabel, statusLabel } from '@/lib/weddings/format';
import type { Wedding } from '@/lib/weddings/my-weddings';
import { SectionNav } from './section-nav';

interface WorkspaceShellProps {
  wedding: Wedding;
  user: Pick<CurrentUser, 'displayName' | 'email'>;
  children: ReactNode;
}

/**
 * The signed-in wedding workspace (Stitch "Workspace Handoff" and "Wedding
 * Overview"): a sidebar with the wedding, its sections and the account on
 * large screens, and a top bar naming the wedding. Everything shown comes
 * from the API; the role and status only change what is displayed, never
 * what is allowed.
 */
export function WorkspaceShell({ wedding, user, children }: WorkspaceShellProps) {
  const status = statusLabel(wedding.status);
  return (
    <div className="flex w-full flex-1 bg-surface">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col justify-between bg-surface-container-low shadow-sm lg:flex">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <Brand />
          <div className="px-4 py-2">
            <div className="rounded-lg border border-surface-container-highest/60 bg-surface-container p-2">
              <p className="truncate text-title-sm text-on-surface">{coupleName(wedding)}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-label-sm tracking-wider text-on-surface-variant uppercase">
                <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
                <span>
                  <span className="sr-only">Your role: </span>
                  {roleLabel(wedding.role)}
                </span>
              </p>
            </div>
          </div>
          <SectionNav weddingId={wedding.id} />
        </div>
        <Account user={user} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 bg-surface/90 px-5 shadow-sm backdrop-blur-xl md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <LogoMark className="size-8 shrink-0 lg:hidden" />
            <p className="flex min-w-0 items-center gap-2 rounded-lg border border-surface-container-highest bg-surface-container-lowest px-3 py-1.5 shadow-sm">
              <Icon name="auto-awesome" className="size-4.5 shrink-0 text-secondary" />
              <span className="truncate text-title-sm tracking-tight text-on-surface">
                {coupleName(wedding)}
                <span className="hidden sm:inline"> — {placeAndYear(wedding)}</span>
              </span>
            </p>
            {status && (
              <span className="shrink-0 rounded-full bg-surface-container-highest px-2.5 py-1 text-label-sm tracking-wider text-on-surface-variant uppercase">
                {status}
              </span>
            )}
          </div>
          <div className="shrink-0 lg:hidden">
            <SignOutButton variant="link" />
          </div>
        </header>
        <main id="main" className="w-full flex-1 px-5 py-8 md:px-10">
          <div className="mx-auto w-full max-w-350">{children}</div>
        </main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex h-16 items-center gap-2 px-4">
      <LogoMark className="size-8 shrink-0" />
      <span className="flex min-w-0 flex-col">
        <span className="font-serif text-headline-sm leading-none tracking-tight text-primary">
          My Marriage
        </span>
        <span className="mt-0.5 text-label-sm tracking-wider text-secondary uppercase">
          Wedding workspace
        </span>
      </span>
    </div>
  );
}

function Account({ user }: Pick<WorkspaceShellProps, 'user'>) {
  return (
    <div className="flex flex-col gap-2 border-t border-surface-container-highest/60 p-3">
      <div className="flex items-center gap-2">
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-title-sm text-on-primary"
          aria-hidden="true"
        >
          {initials(user.displayName)}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-title-sm text-on-surface">{user.displayName}</span>
          <span className="truncate text-label-sm text-on-surface-variant">{user.email}</span>
        </span>
      </div>
      <div className="px-1 text-body-sm">
        <SignOutButton variant="link" />
      </div>
    </div>
  );
}
