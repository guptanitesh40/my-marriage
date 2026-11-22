import 'server-only';
import Link from 'next/link';
import { FormAlert } from '@/components/forms/form-alert';
import { ButtonLink } from '@/components/ui/button-link';
import { Icon } from '@/components/ui/icon';
import {
  getAlbums,
  getPhotos,
  getQuota,
  getReviewQueue,
  getUploadLinks,
  type Quota,
} from '@/lib/photos/albums';
import { getWebsite } from '@/lib/website/website';
import {
  albumKindLabel,
  albumWhere,
  formatBytes,
  readAlbumFilter,
  storageOf,
} from '@/lib/photos/format';
import { albumPath, photosPath, websitePath } from '@/lib/routes';
import { getWedding } from '@/lib/weddings/workspace';
import { AlbumGrid } from './album-grid';
import { CreateAlbumButton, RenameAlbumButton } from './album-name-dialog';
import { ExportButton } from './export-button';
import { AlbumUploadsSwitch } from './album-uploads-switch';
import { PhotoGrid } from './photo-grid';
import { PhotoUploader } from './photo-uploader';
import { RefreshWhileProcessing } from './refresh-while-processing';
import { ReviewQueue } from './review-queue';
import { ShareUploadsButton } from './share-upload-dialog';

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * The Photos page (Stitch "Photos & Albums Workspace"): storage, photos
 * waiting for review and the public gallery at a glance, then the albums
 * or the review queue. Changes only while the wedding is active. The
 * layout has already answered "not found" for anyone who is not a member.
 */
export async function PhotosSection({
  params,
  searchParams,
}: {
  params: Promise<{ weddingId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { weddingId } = await params;
  const query = await searchParams;
  const view = query.view === 'review' ? 'review' : 'albums';
  const filter = readAlbumFilter(query.show);
  const reviewAlbum = typeof query.album === 'string' ? query.album : undefined;
  const [wedding, albums, quota, links, queue, website] = await Promise.all([
    getWedding(weddingId),
    getAlbums(weddingId),
    getQuota(weddingId),
    getUploadLinks(weddingId),
    getReviewQueue(weddingId),
    getWebsite(weddingId),
  ]);
  if (wedding.kind !== 'ok') return null;
  const writable = wedding.wedding.status === 'active';
  const pending = queue.kind === 'ok' ? queue.total : 0;
  const processing = queue.kind === 'ok' ? queue.processing : 0;
  const approved =
    albums.kind === 'ok' ? albums.albums.reduce((sum, album) => sum + album.counts.approved, 0) : 0;
  const albumLinks = new Map(
    links.kind === 'ok' ? links.albums.map((link) => [link.albumId ?? '', link] as const) : [],
  );

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex max-w-2xl flex-col gap-2">
          <p className="flex items-center gap-2 text-label-sm font-semibold tracking-widest text-secondary uppercase">
            <Icon name="photo-library" className="size-4" />
            Wedding photos & guest contributions
          </p>
          <h1 className="font-serif text-headline-lg-mobile tracking-tight text-on-surface sm:text-headline-lg">
            Photos & Albums
          </h1>
          <p className="text-body-lg text-on-surface-variant">
            Collect, review and keep the memories of every celebration. Guest uploads go to your
            private review before anything appears on your website.
          </p>
        </div>
        {albums.kind === 'ok' && (
          <div className="flex flex-wrap gap-2">
            <ShareUploadsButton
              weddingId={weddingId}
              target={{ kind: 'general' }}
              writable={writable}
              {...(links.kind === 'ok' && links.general ? { link: links.general } : {})}
            >
              Invite photo uploads
            </ShareUploadsButton>
            <ExportButton weddingId={weddingId}>Export all</ExportButton>
            {writable && <CreateAlbumButton weddingId={weddingId}>Create album</CreateAlbumButton>}
          </div>
        )}
      </header>

      {!writable && (
        <FormAlert tone="error" title="This wedding is read-only">
          It has been archived, so guests can no longer upload. Its photos can still be seen, and
          owners can still hide or delete them.
        </FormAlert>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {quota.kind === 'ok' && <StorageCard quota={quota} />}
        <PendingCard weddingId={weddingId} pending={pending} />
        <GalleryCard
          weddingId={weddingId}
          approved={approved}
          {...(website.kind === 'ok' && website.status === 'published'
            ? { slug: website.slug }
            : {})}
        />
      </div>

      <nav aria-label="Photos views" className="flex gap-1 border-b border-outline-variant/50">
        <ViewTab href={photosPath(weddingId)} current={view === 'albums'}>
          Albums
        </ViewTab>
        <ViewTab
          href={photosPath(weddingId, new URLSearchParams({ view: 'review' }))}
          current={view === 'review'}
        >
          Pending review
          {pending > 0 && (
            <span className="ml-2 rounded-full bg-secondary-container px-2 py-0.5 text-label-sm text-on-secondary-container">
              {pending}
            </span>
          )}
        </ViewTab>
      </nav>

      {processing > 0 && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl bg-surface-container-low px-4 py-3 text-body-sm text-on-surface-variant"
        >
          <Icon name="sync" className="size-4 animate-spin text-secondary" />
          {processing === 1
            ? '1 new photo is being checked and will appear in a moment.'
            : `${processing} new photos are being checked and will appear in a moment.`}
        </p>
      )}
      <RefreshWhileProcessing processing={processing} />

      {albums.kind === 'unavailable' ? (
        <Unavailable href={photosPath(weddingId)} />
      ) : view === 'review' ? (
        queue.kind === 'unavailable' ? (
          <Unavailable href={photosPath(weddingId, new URLSearchParams({ view: 'review' }))} />
        ) : (
          <ReviewQueue
            weddingId={weddingId}
            photos={queue.photos}
            total={queue.total}
            albumTitles={albums.albums.map((album) => [album.id, album.title] as const)}
            writable={writable}
            {...(reviewAlbum ? { initialAlbum: reviewAlbum } : {})}
          />
        )
      ) : albums.albums.length === 0 ? (
        <AlbumsEmpty />
      ) : (
        <AlbumGrid
          weddingId={weddingId}
          albums={albums.albums}
          links={Object.fromEntries(albumLinks)}
          writable={writable}
          initialFilter={filter}
        />
      )}

      <PrivacyNote />
    </div>
  );
}

function ViewTab({
  href,
  current,
  children,
}: {
  href: string;
  current: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={current ? 'page' : undefined}
      className={`-mb-px inline-flex min-h-10 items-center border-b-2 px-4 text-label-md font-semibold transition-colors ${
        current
          ? 'border-primary text-primary'
          : 'border-transparent text-on-surface-variant hover:text-on-surface'
      }`}
    >
      {children}
    </Link>
  );
}

const CARD =
  'flex flex-col gap-3 rounded-2xl bg-surface-container-lowest p-5 shadow-xs ring-1 ring-outline-variant/30';

/**
 * Space used against the 5 GB allowance, counting uploads in progress, with
 * the warnings at 90% and when full. No upgrade: there is no paid storage
 * (decision 0019).
 */
function StorageCard({ quota }: { quota: Quota }) {
  const storage = storageOf(quota);
  const bar =
    storage.level === 'ok'
      ? 'bg-primary'
      : storage.level === 'notice'
        ? 'bg-secondary'
        : 'bg-error';
  return (
    <section aria-labelledby="storage-heading" className={CARD}>
      <h2
        id="storage-heading"
        className="flex items-center gap-2 text-label-sm font-semibold tracking-wider text-on-surface-variant uppercase"
      >
        <Icon name="cloud-done" className="size-4.5 text-secondary" />
        Photo storage used
      </h2>
      <p className="text-title-md text-on-surface tabular-nums">
        {formatBytes(storage.taken)} / {formatBytes(quota.limitBytes)}{' '}
        <span className="text-on-surface-variant">({storage.percent}%)</span>
      </p>
      <div
        role="progressbar"
        aria-labelledby="storage-heading"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={storage.percent}
        aria-valuetext={`${storage.percent}% used`}
        className="h-2 overflow-hidden rounded-full bg-surface-container-high"
      >
        <span
          className={`block h-full rounded-full ${bar}`}
          style={{ width: `${Math.max(storage.percent, storage.taken > 0 ? 1 : 0)}%` }}
        />
      </div>
      <p className="text-body-sm text-on-surface-variant">
        {formatBytes(storage.available)} available, shared by every album.
      </p>
      {storage.level === 'full' ? (
        <FormAlert tone="error" title="Your photo storage is full">
          New uploads are turned away until photos are removed.
        </FormAlert>
      ) : storage.level === 'warning' ? (
        <FormAlert tone="error" title={`Storage is ${storage.percent}% full`}>
          Uploads stop when it is full. Remove photos you don’t need.
        </FormAlert>
      ) : null}
    </section>
  );
}

function PendingCard({ weddingId, pending }: { weddingId: string; pending: number }) {
  return (
    <section aria-labelledby="pending-heading" className={CARD}>
      <h2 id="pending-heading">
        <span className="inline-flex items-center gap-2 rounded-full bg-secondary-container px-3 py-1 text-label-md font-semibold text-on-secondary-container">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-secondary" />
          {pending} {pending === 1 ? 'photo' : 'photos'} pending review
        </span>
      </h2>
      <p className="text-body-sm text-on-surface-variant">
        {pending > 0
          ? 'Uploads stay private until you clear them.'
          : 'Nothing is waiting. Photos from guests will appear here for your review.'}
      </p>
      {pending > 0 && (
        <Link
          href={photosPath(weddingId, new URLSearchParams({ view: 'review' }))}
          className="mt-auto inline-flex min-h-8 items-center gap-1 self-start text-title-sm text-primary hover:underline"
        >
          Review pending queue
          <Icon name="arrow-forward" className="size-4" />
        </Link>
      )}
    </section>
  );
}

function GalleryCard({
  weddingId,
  approved,
  slug,
}: {
  weddingId: string;
  approved: number;
  /** Set while the website is published. */
  slug?: string;
}) {
  return (
    <section aria-labelledby="gallery-heading" className={CARD}>
      <h2
        id="gallery-heading"
        className="flex items-center gap-2 text-label-sm font-semibold tracking-wider text-on-surface-variant uppercase"
      >
        <span
          aria-hidden="true"
          className={`size-2 rounded-full ${slug ? 'bg-primary' : 'bg-outline'}`}
        />
        Website gallery
      </h2>
      <p className="font-serif text-headline-sm text-on-surface">
        {approved} approved {approved === 1 ? 'photo' : 'photos'}
      </p>
      {slug ? (
        <>
          <p className="text-body-sm text-on-surface-variant">
            Shown on your website at <span className="font-semibold">/w/{slug}</span>
          </p>
          <a
            href={`/w/${encodeURIComponent(slug)}#gallery`}
            target="_blank"
            rel="noreferrer"
            className="mt-auto inline-flex min-h-8 items-center gap-1 self-start text-title-sm text-primary hover:underline"
          >
            Preview live site
            <Icon name="open-in-new" className="size-4" />
          </a>
        </>
      ) : (
        <>
          <p className="text-body-sm text-on-surface-variant">
            Approved photos appear on your website once it is published.
          </p>
          <Link
            href={websitePath(weddingId)}
            className="mt-auto inline-flex min-h-8 items-center gap-1 self-start text-title-sm text-primary hover:underline"
          >
            Go to Wedding Website
            <Icon name="arrow-forward" className="size-4" />
          </Link>
        </>
      )}
    </section>
  );
}

function AlbumsEmpty() {
  return (
    <section className="flex flex-col items-center rounded-2xl bg-surface-container-lowest px-6 py-14 text-center shadow-xs">
      <span
        className="mb-5 flex size-20 items-center justify-center rounded-full bg-secondary-container/50 text-secondary"
        aria-hidden="true"
      >
        <Icon name="photo-library" className="size-9" />
      </span>
      <h2 className="font-serif text-headline-md text-primary">No albums</h2>
      <p className="mt-2 max-w-md text-body-md text-on-surface-variant">
        This wedding was archived before any albums were made.
      </p>
    </section>
  );
}

function Unavailable({ href }: { href: string }) {
  return (
    <section className="rounded-2xl bg-surface-container-lowest p-8 shadow-sm">
      <h2 className="text-title-md text-on-surface">We couldn’t load the albums</h2>
      <p className="mt-2 text-body-md text-on-surface-variant">
        Something went wrong on our side. Your photos are safe; please try again in a moment.
      </p>
      <ButtonLink href={href} size="md" className="mt-5">
        Try again
      </ButtonLink>
    </section>
  );
}

function PrivacyNote() {
  return (
    <aside className="flex items-start gap-4 rounded-2xl bg-surface-container-lowest p-5 shadow-xs ring-1 ring-outline-variant/30">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-container text-primary">
        <Icon name="lock" className="size-5" />
      </span>
      <div>
        <p className="text-title-sm text-on-surface">Private until you approve</p>
        <p className="mt-1 text-body-sm text-on-surface-variant">
          Photos uploaded by guests go to your private review first. Unapproved photos never appear
          on your wedding website or to other guests; only the ones you approve are published.
        </p>
      </div>
    </aside>
  );
}

/** While the albums load: placeholder cards, announced once. */
export function PhotosLoading() {
  return (
    <div className="flex flex-col gap-6">
      <p role="status" className="sr-only">
        Loading albums…
      </p>
      <div
        aria-hidden="true"
        className="h-36 animate-pulse rounded-2xl bg-surface-container-lowest"
      />
      <div aria-hidden="true" className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-60 animate-pulse rounded-2xl bg-surface-container-lowest" />
        ))}
      </div>
    </div>
  );
}

/**
 * One album (Stitch "Photos & Albums Workspace", album detail): what it is,
 * its settings, and its photos. An album of another wedding, or of a
 * deleted ceremony, is simply not here.
 */
export async function AlbumSection({
  params,
}: {
  params: Promise<{ weddingId: string; albumId: string }>;
}) {
  const { weddingId, albumId } = await params;
  const [wedding, albums, photos, links] = await Promise.all([
    getWedding(weddingId),
    getAlbums(weddingId),
    getPhotos(weddingId, albumId),
    getUploadLinks(weddingId),
  ]);
  if (wedding.kind !== 'ok') return null;
  const writable = wedding.wedding.status === 'active';
  if (albums.kind === 'unavailable') return <Unavailable href={albumPath(weddingId, albumId)} />;
  const album = albums.albums.find((candidate) => candidate.id === albumId);

  const back = (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-label-md">
      <Link
        href={photosPath(weddingId)}
        className="inline-flex min-h-8 items-center gap-1.5 font-semibold text-primary hover:underline"
      >
        <Icon name="arrow-back" className="size-4" />
        All albums
      </Link>
      {album && (
        <>
          <span aria-hidden="true" className="text-outline">
            /
          </span>
          <span aria-current="page" className="truncate text-on-surface-variant">
            {album.title}
          </span>
        </>
      )}
    </nav>
  );

  if (!album) {
    return (
      <div className="flex flex-col gap-6">
        {back}
        <section className="rounded-2xl bg-surface-container-lowest p-8 shadow-sm">
          <h1 className="font-serif text-headline-md text-on-surface">This album isn’t here</h1>
          <p className="mt-2 text-body-md text-on-surface-variant">
            It may belong to a ceremony that was deleted. Your other albums are on the Photos page.
          </p>
        </section>
      </div>
    );
  }

  const where = albumWhere(album);
  const albumLink =
    links.kind === 'ok' ? links.albums.find((link) => link.albumId === album.id) : undefined;
  const ownerSafety = !writable && wedding.wedding.role === 'owner';
  return (
    <div className="flex flex-col gap-6">
      {back}
      <header className="flex flex-col gap-5 rounded-2xl bg-surface-container-lowest p-5 shadow-xs ring-1 ring-outline-variant/30 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-label-sm font-semibold tracking-widest text-secondary uppercase">
            {where ?? albumKindLabel(album)}
          </p>
          <h1 className="font-serif text-headline-lg-mobile wrap-break-word text-on-surface sm:text-headline-lg">
            {album.title}
          </h1>
          <p className="max-w-2xl text-body-md text-on-surface-variant">
            {album.kind === 'event'
              ? 'Photos of this ceremony. The album takes the ceremony’s name; rename the ceremony on the Events page.'
              : album.kind === 'general'
                ? 'Photos of the whole wedding that belong to no one ceremony.'
                : 'An album of your own, for photos of anything you like.'}
          </p>
          {album.event?.cancelled && (
            <p className="text-body-sm font-semibold text-error">This ceremony was cancelled.</p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <ShareUploadsButton
            weddingId={weddingId}
            target={{ kind: 'album', albumId: album.id, albumTitle: album.title }}
            writable={writable}
            {...(albumLink ? { link: albumLink } : {})}
          >
            Album QR & link
          </ShareUploadsButton>
          {album.counts.total > 0 && (
            <ExportButton weddingId={weddingId} albumId={album.id}>
              Download all ({album.counts.total})
            </ExportButton>
          )}
          {writable && album.kind !== 'event' && (
            <RenameAlbumButton weddingId={weddingId} album={album} />
          )}
        </div>
      </header>

      <AlbumUploadsSwitch weddingId={weddingId} album={album} writable={writable} />

      {writable && <PhotoUploader albumId={album.id} albumTitle={album.title} />}

      <section aria-labelledby="album-photos" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="album-photos" className="font-serif text-headline-sm text-on-surface">
            Photos
          </h2>
          <p className="text-body-sm text-on-surface-variant">
            {album.counts.approved} approved · {album.counts.pending} waiting for review
          </p>
        </div>
        {photos.kind === 'ok' && photos.processing > 0 && (
          <p
            role="status"
            className="flex items-center gap-2 rounded-xl bg-surface-container-low px-4 py-3 text-body-sm text-on-surface-variant"
          >
            <Icon name="sync" className="size-4 animate-spin text-secondary" />
            {photos.processing === 1
              ? '1 photo is being checked and will appear in a moment.'
              : `${photos.processing} photos are being checked and will appear in a moment.`}
          </p>
        )}
        {photos.kind === 'ok' && <RefreshWhileProcessing processing={photos.processing} />}
        {photos.kind === 'unavailable' ? (
          <p className="rounded-2xl bg-surface-container-lowest p-6 text-body-md text-on-surface-variant shadow-xs">
            We couldn’t load the photos. Please try again in a moment.
          </p>
        ) : photos.photos.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl bg-surface-container-lowest px-6 py-12 text-center shadow-xs">
            <span
              className="mb-4 flex size-14 items-center justify-center rounded-full bg-surface-container text-secondary"
              aria-hidden="true"
            >
              <Icon name="image" className="size-7" />
            </span>
            <p className="font-serif text-headline-sm text-on-surface">
              No photos in this album yet
            </p>
            <p className="mt-2 max-w-md text-body-md text-on-surface-variant">
              Photos you and your team add appear here approved. Guests’ photos wait for your review
              first.
            </p>
          </div>
        ) : (
          <PhotoGrid
            weddingId={weddingId}
            photos={photos.photos}
            writable={writable}
            ownerSafety={ownerSafety}
          />
        )}
      </section>
    </div>
  );
}

export function AlbumLoading() {
  return (
    <div className="flex flex-col gap-6">
      <p role="status" className="sr-only">
        Loading the album…
      </p>
      <div
        aria-hidden="true"
        className="h-40 animate-pulse rounded-2xl bg-surface-container-lowest"
      />
      <div
        aria-hidden="true"
        className="h-56 animate-pulse rounded-2xl bg-surface-container-lowest"
      />
    </div>
  );
}
