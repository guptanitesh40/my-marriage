import 'server-only';
import { FormAlert } from '@/components/forms/form-alert';
import { ButtonLink } from '@/components/ui/button-link';
import { Icon } from '@/components/ui/icon';
import { eventsPath, publicSitePath, websitePath } from '@/lib/routes';
import { getWebsite, type Website } from '@/lib/website/website';
import { templateLabel } from '@/lib/website/templates';
import { getWedding } from '@/lib/weddings/workspace';
import { ThemePicker } from './theme-picker';

const CHECK_LABELS: Record<Website['readiness']['checks'][number]['key'], string> = {
  names: 'Couple names',
  address: 'Website address',
  ceremonies: 'Ceremonies',
};

/**
 * The Wedding Website page (Stitch "Wedding Website Builder & Management"):
 * whether the site is a draft or live, its address, what publishing needs,
 * and the design. Changes only while the wedding is active. The layout has
 * already answered "not found" for anyone who is not a member.
 */
export async function WebsiteSection({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params;
  const [wedding, website] = await Promise.all([getWedding(weddingId), getWebsite(weddingId)]);
  if (wedding.kind !== 'ok') return null;

  if (website.kind !== 'ok') {
    return (
      <section className="rounded-2xl bg-surface-container-lowest p-8 shadow-sm">
        <h1 className="text-title-md text-on-surface">We couldn’t load your website</h1>
        <p className="mt-2 text-body-md text-on-surface-variant">
          Something went wrong on our side. Your website is safe; please try again.
        </p>
        <ButtonLink href={websitePath(weddingId)} size="md" className="mt-5">
          Retry
        </ButtonLink>
      </section>
    );
  }

  const live = website.status === 'published';
  return (
    <div className="flex flex-col gap-8">
      <header className="flex max-w-3xl flex-col gap-2">
        <p className="flex items-center gap-2 text-label-sm font-semibold tracking-widest text-secondary uppercase">
          <span className="size-1.5 rounded-full bg-secondary" aria-hidden="true" />
          Public wedding website
        </p>
        <h1 className="font-serif text-headline-lg-mobile tracking-tight text-on-surface sm:text-headline-lg">
          Wedding Website
        </h1>
        <p className="text-body-lg text-on-surface-variant">
          Create and publish a welcoming home for your guests. Private wedding details stay
          protected.
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-body-sm text-on-surface-variant">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-label-md font-semibold ${
              live
                ? 'bg-primary-fixed text-on-primary-fixed'
                : 'bg-secondary-container text-on-secondary-container'
            }`}
          >
            <span
              aria-hidden="true"
              className={`size-1.5 rounded-full ${live ? 'bg-primary' : 'bg-secondary'}`}
            />
            {live ? 'Published · Live' : 'Draft · Not published'}
          </span>
          {live
            ? `Guests see the ${templateLabel(website.publishedTemplateId ?? website.templateId)} design.${
                website.hasUnpublishedChanges ? ' You have changes that aren’t published yet.' : ''
              }`
            : 'Your website is private until you publish it.'}
        </p>
      </header>

      {!website.writable && (
        <FormAlert tone="error" title="This wedding is read-only">
          It has been archived, so the website can’t be edited.
          {website.canUnpublish ? ' As an owner, you can still unpublish it.' : ''}
        </FormAlert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="website-address-heading"
          className="flex flex-col gap-3 rounded-2xl bg-surface-container-lowest p-5 shadow-xs sm:p-6"
        >
          <h2 id="website-address-heading" className="font-serif text-headline-sm text-on-surface">
            Website address
          </h2>
          <p className="flex min-w-0 items-center gap-2 rounded-lg bg-surface-container-low px-3 py-2.5 font-mono text-body-sm text-on-surface">
            <Icon name="link" className="size-4 shrink-0 text-on-surface-variant" />
            <span className="truncate">{publicSitePath(website.slug)}</span>
          </p>
          <p className="text-body-sm text-on-surface-variant">
            {live
              ? 'Anyone with this address can see your website. Share it on WhatsApp or in your invitations.'
              : 'Short and memorable, for invitations and WhatsApp. Nobody can open it until you publish.'}
          </p>
        </section>

        <section
          aria-labelledby="website-ready-heading"
          className="flex flex-col gap-3 rounded-2xl bg-surface-container-lowest p-5 shadow-xs sm:p-6"
        >
          <h2 id="website-ready-heading" className="font-serif text-headline-sm text-on-surface">
            {website.readiness.ready ? 'Ready to publish' : 'Before you publish'}
          </h2>
          <ul className="flex flex-col gap-2">
            {website.readiness.checks.map((check) => (
              <li key={check.key} className="flex items-start gap-2.5 text-body-sm">
                <Icon
                  name={check.ok ? 'check-circle' : 'error'}
                  className={`mt-0.5 size-4.5 shrink-0 ${check.ok ? 'text-primary' : 'text-secondary'}`}
                />
                <span className="flex min-w-0 flex-col">
                  <span className="font-semibold text-on-surface">{CHECK_LABELS[check.key]}</span>
                  <span className="wrap-break-word text-on-surface-variant">{check.message}</span>
                </span>
              </li>
            ))}
          </ul>
          {!website.readiness.checks.find((check) => check.key === 'ceremonies')?.ok && (
            <ButtonLink href={eventsPath(weddingId)} size="md" variant="secondary">
              Go to Events
            </ButtonLink>
          )}
        </section>
      </div>

      <ThemePicker
        weddingId={weddingId}
        templateId={website.templateId}
        contentVersion={website.contentVersion}
        {...(live && website.publishedTemplateId
          ? { publishedTemplateId: website.publishedTemplateId }
          : {})}
        writable={website.writable}
      />

      <aside className="flex items-start gap-3 rounded-2xl bg-surface-container-low p-4 text-body-sm text-on-surface-variant">
        <Icon name="lock" className="mt-0.5 size-5 shrink-0 text-secondary" />
        <p>
          <span className="font-semibold text-on-surface">Only public details are shown.</span> Your
          website shows your names, your words and your ceremonies. Guest lists, RSVPs, budgets,
          vendors and private links never appear on it.
        </p>
      </aside>
    </div>
  );
}

export function WebsiteLoading() {
  return (
    <div className="flex flex-col gap-6">
      <p role="status" className="sr-only">
        Loading your website…
      </p>
      <div aria-hidden="true" className="grid gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl bg-surface-container-lowest" />
        ))}
      </div>
      <div
        aria-hidden="true"
        className="h-72 animate-pulse rounded-2xl bg-surface-container-lowest"
      />
    </div>
  );
}
