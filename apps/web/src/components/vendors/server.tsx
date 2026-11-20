import 'server-only';
import { FormAlert } from '@/components/forms/form-alert';
import { ButtonLink } from '@/components/ui/button-link';
import { Icon, type IconName } from '@/components/ui/icon';
import { eventWhen } from '@/lib/events/format';
import { getEvents } from '@/lib/events/events';
import { vendorsPath } from '@/lib/routes';
import { directoryStats, filterParams, readFilters, type Vendor } from '@/lib/vendors/directory';
import { getVendors } from '@/lib/vendors/vendors';
import { getWedding } from '@/lib/weddings/workspace';
import { AddVendorButton, VendorDrawer } from './vendor-drawer';
import { VendorDirectory } from './vendor-directory';
import type { VendorEventChoice } from './vendor-form';

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * The Vendors page (Stitch "Vendors Management"): figures from the real
 * directory, then the vendors with search and filters, or a first-vendor
 * prompt. Adding and editing only while the wedding is active. The layout
 * has already answered "not found" for anyone who is not a member.
 */
export async function VendorsSection({
  params,
  searchParams,
}: {
  params: Promise<{ weddingId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { weddingId } = await params;
  const filters = readFilters(await searchParams);
  const [wedding, vendors, events] = await Promise.all([
    getWedding(weddingId),
    getVendors(weddingId),
    getEvents(weddingId),
  ]);
  if (wedding.kind !== 'ok') return null;
  const writable = wedding.wedding.status === 'active';
  const choices: VendorEventChoice[] =
    events.kind === 'ok'
      ? events.events.map((event) => ({
          id: event.id,
          title: event.title,
          ...(eventWhen(event) ? { when: eventWhen(event) } : {}),
        }))
      : [];
  const hasVendors = vendors.kind === 'ok' && vendors.vendors.length > 0;

  const page = (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex max-w-2xl flex-col gap-2">
          <p className="flex items-center gap-2 text-label-sm font-semibold tracking-widest text-secondary uppercase">
            <span className="size-1.5 rounded-full bg-secondary" aria-hidden="true" />
            Vendor directory & contacts
          </p>
          <h1 className="font-serif text-headline-lg-mobile tracking-tight text-on-surface sm:text-headline-lg">
            Vendors
          </h1>
          <p className="text-body-lg text-on-surface-variant">
            Keep your wedding vendors, the ceremonies they work at and their contacts organized in
            one private directory.
          </p>
        </div>
        {hasVendors && <AddVendorButton>Add vendor</AddVendorButton>}
      </header>

      {!writable && (
        <FormAlert tone="error" title="This wedding is read-only">
          It has been archived, so its vendors can still be seen but no longer changed.
        </FormAlert>
      )}

      {vendors.kind === 'unavailable' ? (
        <section className="rounded-2xl bg-surface-container-lowest p-8 shadow-sm">
          <h2 className="text-title-md text-on-surface">We couldn’t load the vendors</h2>
          <p className="mt-2 text-body-md text-on-surface-variant">
            Something went wrong on our side. Your vendors are safe; please try again in a moment.
          </p>
          <ButtonLink
            href={vendorsPath(weddingId, filterParams(filters))}
            size="md"
            className="mt-5"
          >
            Try again
          </ButtonLink>
        </section>
      ) : !hasVendors ? (
        <VendorsEmpty writable={writable} />
      ) : (
        <>
          <VendorStats vendors={vendors.vendors} />
          <VendorDirectory
            weddingId={weddingId}
            vendors={vendors.vendors}
            truncated={vendors.truncated}
            events={choices}
            initialFilters={filters}
          />
        </>
      )}

      <aside className="flex items-start gap-3 rounded-2xl bg-surface-container-low p-4 text-body-sm text-on-surface-variant">
        <Icon name="shield" className="mt-0.5 size-5 shrink-0 text-secondary" />
        <p>
          <span className="font-semibold text-on-surface">Private to your planning team.</span>{' '}
          Vendor contacts and notes are visible only to this wedding’s owners and managers. They
          never appear on your public wedding website.
        </p>
      </aside>
    </div>
  );

  return (
    <VendorDrawer
      weddingId={weddingId}
      vendors={vendors.kind === 'ok' ? vendors.vendors : []}
      events={choices}
      writable={writable}
      canDelete={writable && wedding.wedding.role === 'owner'}
    >
      {page}
    </VendorDrawer>
  );
}

function Stat({
  label,
  value,
  note,
  icon,
  iconClass,
  valueClass = 'text-primary',
  bar,
  barClass,
}: {
  label: string;
  value: number;
  note: string;
  icon: IconName;
  iconClass: string;
  valueClass?: string;
  /** How full the bar is, 0 to 100. */
  bar: number;
  barClass: string;
}) {
  return (
    <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-4 shadow-xs">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-label-md text-on-surface-variant">{label}</h2>
        <Icon name={icon} className={`size-5 shrink-0 ${iconClass}`} />
      </div>
      <p className="mt-3 flex flex-wrap items-baseline gap-x-2">
        <span className={`font-serif text-headline-md ${valueClass}`}>{value}</span>
        <span className="text-body-sm text-on-surface-variant">{note}</span>
      </p>
      <span
        aria-hidden="true"
        className="mt-3 block h-1 overflow-hidden rounded-full bg-surface-container-high"
      >
        <span className={`block h-full rounded-full ${barClass}`} style={{ width: `${bar}%` }} />
      </span>
    </div>
  );
}

/** The directory's real figures (none of the design's sample numbers). */
function VendorStats({ vendors }: { vendors: readonly Vendor[] }) {
  const stats = directoryStats(vendors);
  const share = (count: number) => (stats.total > 0 ? Math.round((count / stats.total) * 100) : 0);
  return (
    <section aria-label="Vendor summary" className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
      <Stat
        label="Total vendors"
        value={stats.total}
        note={`across ${stats.categories} ${stats.categories === 1 ? 'category' : 'categories'}`}
        icon="storefront"
        iconClass="text-secondary"
        bar={100}
        barClass="bg-primary"
      />
      <Stat
        label="Multi-event partners"
        value={stats.multiEvent}
        note="at 2+ ceremonies"
        icon="diversity-3"
        iconClass="text-primary"
        bar={share(stats.multiEvent)}
        barClass="bg-primary-container"
      />
      <Stat
        label="Ready to contact"
        value={stats.reachable}
        note="with phone & email"
        icon="contact-phone"
        iconClass="text-secondary"
        bar={share(stats.reachable)}
        barClass="bg-secondary"
      />
      <Stat
        label="Unlinked to events"
        value={stats.unlinked}
        note="general services"
        icon="link-off"
        iconClass="text-secondary"
        valueClass="text-secondary"
        bar={share(stats.unlinked)}
        barClass="bg-secondary-fixed-dim"
      />
    </section>
  );
}

/** A new directory: no vendors yet (Stitch "Vendors Management", empty state). */
function VendorsEmpty({ writable }: { writable: boolean }) {
  return (
    <section className="flex flex-col items-center rounded-2xl bg-surface-container-lowest px-6 py-14 text-center shadow-xs">
      <span
        className="mb-5 flex size-20 items-center justify-center rounded-full bg-secondary-container/50 text-secondary"
        aria-hidden="true"
      >
        <Icon name="storefront" className="size-9" />
      </span>
      <h2 className="font-serif text-headline-md text-primary">Bring your wedding team together</h2>
      <p className="mt-2 mb-6 max-w-md text-body-md text-on-surface-variant">
        Keep your caterers, photographers, decorators, stylists and transport contacts in one
        private directory, linked to the ceremonies they work at.
      </p>
      {writable ? (
        <AddVendorButton>Add your first vendor</AddVendorButton>
      ) : (
        <p className="text-body-sm text-on-surface-variant">No vendors were added.</p>
      )}
    </section>
  );
}

/** While the vendors load: placeholder tiles and rows, announced once. */
export function VendorsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <p role="status" className="sr-only">
        Loading vendors…
      </p>
      <div aria-hidden="true" className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl bg-surface-container-lowest shadow-xs"
          />
        ))}
      </div>
      <div
        aria-hidden="true"
        className="flex flex-col gap-px overflow-hidden rounded-2xl bg-surface-container-high shadow-xs"
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 animate-pulse bg-surface-container-lowest" />
        ))}
      </div>
    </div>
  );
}
