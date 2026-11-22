import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { rsvpFonts } from '@/components/rsvp/rsvp-fonts';
import { ButtonLink } from '@/components/ui/button-link';
import { Icon } from '@/components/ui/icon';
import { getCurrentUser } from '@/lib/auth/current-user';
import { loginThenReturnTo, routes, websitePath, websitePreviewPath } from '@/lib/routes';
import { TEMPLATES, templateLabel, type TemplateId } from '@/lib/website/templates';
import { getWebsitePreview } from '@/lib/website/website';
import { WeddingSite } from './site/wedding-site';

function isTemplate(value: unknown): value is TemplateId {
  return TEMPLATES.some((template) => template.id === value);
}

/**
 * The organizers' full-page preview (PRD SITE-04): the saved draft exactly
 * as guests would see it, in the chosen design or, to compare, another.
 * Members only (the API answers "not found" to anyone else), never indexed
 * or cached. Comparing designs here changes nothing; choosing one is done
 * on the Website page.
 */
export async function WebsitePreview({
  params,
  searchParams,
}: {
  params: Promise<{ weddingId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ weddingId }, query] = await Promise.all([params, searchParams]);
  const self = websitePreviewPath(weddingId);
  const [user, result] = await Promise.all([getCurrentUser(), getWebsitePreview(weddingId)]);
  if (!user) redirect(loginThenReturnTo(self));
  if (!user.emailVerified) redirect(routes.verifyEmail);
  // The same answer as the workspace's for a wedding you don't belong to:
  // nothing says whether it exists.
  if (result.kind === 'not-found') {
    return (
      <Problem
        title="We couldn’t find that wedding"
        body="It may have been removed, or it isn’t one you’re a member of."
        action={{ href: routes.dashboard, label: 'Go to your dashboard' }}
      />
    );
  }
  if (result.kind === 'unavailable') {
    return (
      <Problem
        title="We couldn’t load the preview"
        body="Something went wrong on our side. Your website is safe; please try again."
        action={{ href: self, label: 'Try again' }}
      />
    );
  }

  const chosen = result.site.templateId;
  const shown = isTemplate(query.template) ? query.template : chosen;
  return (
    <>
      <div className="bg-tertiary text-on-tertiary">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex items-start gap-3">
            <Link
              href={websitePath(weddingId)}
              className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-label-md font-semibold hover:bg-white/10"
            >
              <Icon name="arrow-back" className="size-4" />
              Back
            </Link>
            <p className="text-body-sm">
              <span className="font-semibold">Preview of your saved draft.</span>{' '}
              <span className="opacity-80">
                Only you and your co-planners can see this page. Guests see your website once it’s
                published.
              </span>
            </p>
          </div>
          <nav aria-label="Preview in another design" className="flex shrink-0 gap-1">
            {TEMPLATES.map((template) => {
              const current = template.id === shown;
              return (
                <Link
                  key={template.id}
                  href={websitePreviewPath(weddingId, template.id)}
                  aria-current={current ? 'page' : undefined}
                  replace
                  scroll={false}
                  className={`rounded-md px-3 py-1.5 text-label-md font-semibold transition-colors ${
                    current ? 'bg-on-tertiary text-tertiary' : 'hover:bg-white/10'
                  }`}
                >
                  {template.label}
                  {template.id === chosen && <span className="sr-only"> (your design)</span>}
                </Link>
              );
            })}
          </nav>
        </div>
        {shown !== chosen && (
          <p className="bg-secondary-container px-4 py-2 text-center text-body-sm text-on-secondary-container">
            You’re comparing {templateLabel(shown)}. Your website uses {templateLabel(chosen)};
            change it on the Website page.
          </p>
        )}
      </div>
      <div className={`${rsvpFonts} flex flex-1 flex-col`}>
        <WeddingSite site={{ ...result.site, templateId: shown }} />
      </div>
    </>
  );
}

function Problem({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: { href: string; label: string };
}) {
  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-5 py-20 text-center">
      <h1 className="font-serif text-headline-md text-on-surface">{title}</h1>
      <p className="text-body-md text-on-surface-variant">{body}</p>
      <ButtonLink href={action.href} size="md">
        {action.label}
      </ButtonLink>
    </main>
  );
}

export function WebsitePreviewLoading() {
  return (
    <p role="status" className="py-24 text-center text-body-md text-on-surface-variant">
      Loading your preview…
    </p>
  );
}
