import 'server-only';
import { accountHome } from '@/components/auth/server';
import { ButtonLink } from '@/components/ui/button-link';
import { SignedOutActions } from './site-header';

/**
 * The header's account area for whoever is visiting: a way back in for
 * someone signed in, "Log in" for everyone else. Reads the request, so it
 * renders inside <Suspense> while the rest of the page is prerendered.
 */
export async function HeaderAccount() {
  const home = await accountHome();
  if (!home) return <SignedOutActions />;
  return (
    <ButtonLink href={home.href} size="md">
      {home.label}
    </ButtonLink>
  );
}

/**
 * Holds the account area's place while the visitor is looked up — empty
 * rather than "Log in", so a signed-in visitor never sees the wrong buttons
 * first, and the same size, so the header does not shift.
 */
export function HeaderAccountPlaceholder() {
  return (
    <div aria-hidden className="invisible flex items-center gap-4">
      <SignedOutActions prefetch={false} />
    </div>
  );
}
