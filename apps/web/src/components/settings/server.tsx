import 'server-only';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ButtonLink } from '@/components/ui/button-link';
import { Icon, type IconName } from '@/components/ui/icon';
import { formatBytes } from '@/lib/photos/format';
import { getAlbums, getQuota } from '@/lib/photos/albums';
import { photosPath, publicSitePath, settingsPath, websitePath } from '@/lib/routes';
import { getWebsite } from '@/lib/website/website';
import { stampTime } from '@/lib/weddings/details';
import { coupleName } from '@/lib/weddings/format';
import { getSettings, type WeddingSettings } from '@/lib/weddings/settings';
import { DetailsForm } from './details-form';
import { ArchiveAction, CancelDeletionAction, DeletionAction } from './lifecycle-actions';

const CARD = 'rounded-2xl bg-surface-container-lowest shadow-xs ring-1 ring-outline-variant/30';

/**
 * Wedding Settings (Stitch "Wedding Settings & Lifecycle Management",
 * decision 0021): the wedding's details for any member; archiving and
 * deletion requests for its owners only. Read-only once archived or while
 * deletion waits. The role and status only change what is shown: the API
 * decides what is allowed.
 */
export async function SettingsSection({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params;
  const [settings, website, albums, quota] = await Promise.all([
    getSettings(weddingId),
    getWebsite(weddingId),
    getAlbums(weddingId),
    getQuota(weddingId),
  ]);
  if (settings.kind !== 'ok') return <Unavailable href={settingsPath(weddingId)} />;

  const { wedding } = settings;
  const isOwner = wedding.role === 'owner';
  const readOnly = wedding.status !== 'active';
  const couple = coupleName(wedding);
  const counts =
    albums.kind === 'ok'
      ? albums.albums.reduce(
          (sum, album) => ({
            approved: sum.approved + album.counts.approved,
            pending: sum.pending + album.counts.pending,
          }),
          { approved: 0, pending: 0 },
        )
      : null;

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex max-w-2xl flex-col gap-2">
          <p className="flex flex-wrap items-center gap-2 text-label-sm font-semibold tracking-widest text-secondary uppercase">
            <Icon name="settings" className="size-4" />
            Settings
            <StatusChip status={wedding.status} />
          </p>
          <h1 className="font-serif text-headline-lg-mobile tracking-tight text-on-surface sm:text-headline-lg">
            Wedding settings
          </h1>
          <p className="text-body-lg text-on-surface-variant">
            The details your team plans around, and what happens to the wedding afterwards.
          </p>
        </div>
        <div className="flex flex-col gap-1 lg:items-end">
          {settings.lastSaved && (
            <p className="flex items-center gap-1.5 text-body-sm text-on-surface-variant">
              <Icon name="cloud-done" className="size-4 shrink-0" />
              <span>
                Last saved
                {settings.lastSaved.byName && (
                  <>
                    {' '}
                    by{' '}
                    <span className="font-semibold text-on-surface">
                      {settings.lastSaved.byName}
                    </span>
                  </>
                )}{' '}
                · {stampTime(settings.lastSaved.at)}
              </span>
            </p>
          )}
          <a
            href="#lifecycle"
            className="inline-flex items-center gap-1 text-label-md font-semibold text-primary hover:underline"
          >
            Archive & deletion
            <Icon name="arrow-downward" className="size-4" />
          </a>
        </div>
      </header>

      <StatusBanner settings={settings} isOwner={isOwner} />

      <section aria-labelledby="general-heading" className={CARD}>
        <div className="flex flex-col gap-1 border-b border-outline-variant/40 px-5 pt-6 pb-5 sm:px-8">
          <h2 id="general-heading" className="font-serif text-headline-sm text-on-surface">
            General information
          </h2>
          <p className="text-body-sm text-on-surface-variant">
            Shown across your workspace. Anyone on the team can change it while the wedding is
            active.
          </p>
        </div>
        <DetailsForm
          wedding={wedding}
          readOnly={readOnly}
          {...(website.kind === 'ok' && website.coverUrl ? { coverUrl: website.coverUrl } : {})}
        />
      </section>

      <section aria-labelledby="connected-heading" className="flex flex-col gap-4">
        <div>
          <h2 id="connected-heading" className="font-serif text-headline-sm text-on-surface">
            Website & photos
          </h2>
          <p className="text-body-sm text-on-surface-variant">
            Managed on their own pages; here is where they stand.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <LinkCard
            icon="language"
            title="Wedding website"
            badge={
              website.kind !== 'ok'
                ? undefined
                : website.status === 'published' && wedding.status !== 'deletion_pending'
                  ? { label: 'Published', tone: 'live' }
                  : wedding.status === 'deletion_pending' && website.status === 'published'
                    ? { label: 'Offline', tone: 'muted' }
                    : { label: 'Draft', tone: 'muted' }
            }
            body={
              website.kind === 'ok' ? (
                <>
                  <p className="w-fit max-w-full truncate rounded-sm bg-surface-container-low px-2 py-1 font-mono text-body-sm text-on-surface">
                    {publicSitePath(website.slug)}
                  </p>
                  <p>
                    {website.status === 'published'
                      ? 'Guests see your ceremonies and reply to invitations. Photos show only if you turn on the gallery.'
                      : 'Not published yet: only your team can preview it.'}
                  </p>
                </>
              ) : (
                <p>We couldn’t load the website’s status just now.</p>
              )
            }
            links={[
              { href: websitePath(weddingId), label: 'Open website builder' },
              ...(website.kind === 'ok' &&
              website.status === 'published' &&
              wedding.status !== 'deletion_pending'
                ? [{ href: publicSitePath(website.slug), label: 'View live site', external: true }]
                : []),
            ]}
          />
          <LinkCard
            icon="photo-library"
            title="Photos & QR drive"
            badge={
              quota.kind === 'ok'
                ? {
                    label: `${formatBytes(quota.usedBytes)} of ${formatBytes(quota.limitBytes)}`,
                    tone: 'muted',
                  }
                : undefined
            }
            body={
              counts ? (
                <>
                  <p className="font-semibold text-on-surface">
                    {counts.approved} approved · {counts.pending} waiting for review
                  </p>
                  <p>Guests add photos with your QR codes; you choose what appears.</p>
                </>
              ) : (
                <p>We couldn’t load your photos just now.</p>
              )
            }
            links={[{ href: photosPath(weddingId), label: 'Open photos' }]}
          />
        </div>
      </section>

      <Lifecycle settings={settings} isOwner={isOwner} couple={couple} />
    </div>
  );
}

function StatusChip({ status }: { status: WeddingSettings['wedding']['status'] }) {
  const [label, tone] =
    status === 'active'
      ? ['Active', 'bg-primary-fixed/60 text-on-primary-fixed']
      : status === 'archived'
        ? ['Archived', 'bg-surface-container-highest text-on-surface-variant']
        : ['Deletion pending', 'bg-error-container text-on-error-container'];
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-label-sm tracking-wider normal-case ${tone}`}>
      {label}
    </span>
  );
}

/** Why the page is read-only, and what an owner can still do. */
function StatusBanner({ settings, isOwner }: { settings: WeddingSettings; isOwner: boolean }) {
  const { wedding } = settings;
  if (wedding.status === 'archived') {
    return (
      <Banner icon="lock" tone="plain" title="This wedding is archived and read-only">
        <p>
          Archived
          {settings.archived?.byName ? ` by ${settings.archived.byName}` : ''}
          {settings.archived ? ` on ${stampTime(settings.archived.at)}` : ''}. Everything stays
          readable; nothing can be changed.
        </p>
        {isOwner && (
          <p className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            <Link
              href={websitePath(wedding.id)}
              className="font-semibold text-primary hover:underline"
            >
              Unpublish the website
            </Link>
            <Link
              href={photosPath(wedding.id)}
              className="font-semibold text-primary hover:underline"
            >
              Hide or delete photos
            </Link>
          </p>
        )}
      </Banner>
    );
  }
  if (wedding.status === 'deletion_pending') {
    return (
      <Banner icon="warning" tone="danger" title="This wedding is waiting to be deleted">
        <p>
          Requested
          {settings.deletionRequest?.byName ? ` by ${settings.deletionRequest.byName}` : ''}
          {settings.deletionRequest ? ` on ${stampTime(settings.deletionRequest.requestedAt)}` : ''}
          . The website, gallery, invitation pages and upload links are offline, and the workspace
          is read-only. Nothing has been erased.
        </p>
        {isOwner ? (
          <div className="mt-4">
            <CancelDeletionAction weddingId={wedding.id} />
          </div>
        ) : (
          <p className="mt-2">Only the bride or groom can cancel the request.</p>
        )}
      </Banner>
    );
  }
  return null;
}

function Lifecycle({
  settings,
  isOwner,
  couple,
}: {
  settings: WeddingSettings;
  isOwner: boolean;
  couple: string;
}) {
  const { wedding } = settings;
  return (
    <section
      id="lifecycle"
      aria-labelledby="lifecycle-heading"
      className="flex scroll-mt-24 flex-col gap-4"
    >
      <div>
        <h2 id="lifecycle-heading" className="font-serif text-headline-sm text-on-surface">
          Archive & deletion
        </h2>
        <p className="text-body-sm text-on-surface-variant">
          For after the celebrations. Only the bride and groom can do these.
        </p>
      </div>

      {!isOwner && (
        <p className="flex items-start gap-3 rounded-2xl bg-surface-container-low p-5 text-body-sm text-on-surface">
          <Icon name="shield" className="mt-0.5 size-5 shrink-0 text-secondary" />
          Archiving or deleting the wedding is for the bride and groom. Ask them if it’s time.
        </p>
      )}

      <div className={`${CARD} flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6`}>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="flex flex-wrap items-center gap-2 text-title-md text-on-surface">
            Archive this wedding
            <span className="rounded-sm bg-surface-container-high px-1.5 py-0.5 text-label-sm text-on-surface-variant">
              Bride & groom only
            </span>
          </h3>
          <p className="text-body-sm text-on-surface-variant">
            {wedding.status === 'archived'
              ? `Archived${settings.archived ? ` on ${stampTime(settings.archived.at)}` : ''}. Planning is closed; your records stay readable.`
              : 'Closes planning, replies and guest uploads. Your records and published website stay for you to look back on. You can still start another wedding.'}
          </p>
        </div>
        {isOwner && wedding.status === 'active' && (
          <ArchiveAction weddingId={wedding.id} coupleName={couple} />
        )}
      </div>

      <div className="flex flex-col gap-4 rounded-2xl bg-error-container/25 p-5 ring-1 ring-error/30 sm:flex-row sm:items-center sm:p-6">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="flex items-center gap-2 text-title-md text-error">
            <Icon name="warning" className="size-5 shrink-0" />
            Delete this wedding
          </h3>
          <p className="text-body-sm text-on-surface-variant">
            {wedding.status === 'deletion_pending'
              ? 'Deletion has been requested. Cancel it above to bring the wedding back.'
              : 'Takes the wedding offline at once and schedules it for deletion. Nothing is erased while it waits, and either of you can cancel. Only want to stop planning? Archive it instead.'}
          </p>
        </div>
        {isOwner && wedding.status !== 'deletion_pending' && (
          <DeletionAction weddingId={wedding.id} coupleName={couple} />
        )}
      </div>
    </section>
  );
}

function Banner({
  icon,
  tone,
  title,
  children,
}: {
  icon: IconName;
  tone: 'plain' | 'danger';
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby="status-heading"
      className={`flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-start ${
        tone === 'danger'
          ? 'bg-error-container/40 ring-1 ring-error/30'
          : 'bg-surface-container-high'
      }`}
    >
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-container-lowest ${
          tone === 'danger' ? 'text-error' : 'text-on-surface-variant'
        }`}
      >
        <Icon name={icon} className="size-5" />
      </span>
      <div className="min-w-0 flex-1 text-body-sm text-on-surface">
        <h2 id="status-heading" className="mb-1 text-title-sm text-on-surface">
          {title}
        </h2>
        {children}
      </div>
    </section>
  );
}

function LinkCard({
  icon,
  title,
  badge,
  body,
  links,
}: {
  icon: IconName;
  title: string;
  badge: { label: string; tone: 'live' | 'muted' } | undefined;
  body: ReactNode;
  links: readonly { href: string; label: string; external?: boolean }[];
}) {
  return (
    <article className={`${CARD} flex flex-col gap-3 p-5 sm:p-6`}>
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-surface-container-low text-on-surface">
          <Icon name={icon} className="size-5" />
        </span>
        {badge && (
          <span
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-label-sm ${
              badge.tone === 'live'
                ? 'bg-primary-fixed/60 text-on-primary-fixed'
                : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            {badge.tone === 'live' && (
              <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
            )}
            {badge.label}
          </span>
        )}
      </div>
      <h3 className="text-title-md text-on-surface">{title}</h3>
      <div className="flex min-w-0 flex-col gap-2 text-body-sm text-on-surface-variant">{body}</div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-2">
        {links.map((link) =>
          link.external ? (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-1 text-label-md font-semibold text-secondary hover:underline"
            >
              {link.label}
              <Icon name="open-in-new" className="size-4" />
            </a>
          ) : (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex min-h-11 items-center gap-1 text-label-md font-semibold text-primary hover:underline"
            >
              {link.label}
              <Icon name="arrow-forward" className="size-4" />
            </Link>
          ),
        )}
      </div>
    </article>
  );
}

function Unavailable({ href }: { href: string }) {
  return (
    <section className={`${CARD} p-8`}>
      <h1 className="text-title-md text-on-surface">We couldn’t load the settings</h1>
      <p className="mt-2 text-body-md text-on-surface-variant">
        Something went wrong on our side. Please try again in a moment.
      </p>
      <ButtonLink href={href} size="md" className="mt-5">
        Try again
      </ButtonLink>
    </section>
  );
}

/** While the settings load: announced to screen readers, with the page's outline. */
export function SettingsLoading() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true">
      <p role="status" className="sr-only">
        Loading the settings…
      </p>
      <div className="h-24 animate-pulse rounded-2xl bg-surface-container" />
      <div className="h-96 animate-pulse rounded-2xl bg-surface-container" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="h-44 animate-pulse rounded-2xl bg-surface-container" />
        <div className="h-44 animate-pulse rounded-2xl bg-surface-container" />
      </div>
    </div>
  );
}
