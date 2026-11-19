import 'server-only';
import { Suspense, type ComponentProps } from 'react';
import { accountHome } from '@/components/auth/server';
import { ButtonLink } from '@/components/ui/button-link';
import { routes } from '@/lib/routes';

type StartPlanningLinkProps = Omit<ComponentProps<typeof ButtonLink>, 'href' | 'prefetch'>;

async function ForVisitor(props: StartPlanningLinkProps) {
  return <ButtonLink {...props} href={(await accountHome())?.href ?? routes.login} />;
}

/**
 * A "Start planning" button that leads each visitor to the right place, so
 * someone signed in goes straight to their wedding (or to creating it)
 * rather than through the sign-in page. Until the visitor is known it looks the same and leads to
 * sign-in, but is not prefetched: the sign-in page would only redirect a
 * signed-in visitor.
 */
export function StartPlanningLink(props: StartPlanningLinkProps) {
  return (
    <Suspense fallback={<ButtonLink {...props} href={routes.login} prefetch={false} />}>
      <ForVisitor {...props} />
    </Suspense>
  );
}
