import 'server-only';
import { FormAlert } from '@/components/forms/form-alert';
import { ButtonLink } from '@/components/ui/button-link';
import { Icon, type IconName } from '@/components/ui/icon';
import { eventWhen } from '@/lib/events/format';
import { getEvents } from '@/lib/events/events';
import { filterParams, readFilters, type GuestTotals } from '@/lib/guests/directory';
import { getGuests, getReminderSettings } from '@/lib/guests/guests';
import { isUpcoming } from '@/lib/guests/reminders';
import { guestsPath } from '@/lib/routes';
import { getWedding } from '@/lib/weddings/workspace';
import { GuestDirectory } from './guest-directory';
import { AddGuestButton, GuestDrawer } from './guest-drawer';
import type { GuestEventChoice } from './guest-form';
import { AutoReminders, RemindGuests } from './guest-reminders';
import { ExportGuests, ImportGuests } from './guest-transfer';

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * The Guests & RSVP page (Stitch "Guests & RSVP"): totals that keep
 * contacts, people and answers apart, then the guest list, or a first-guest
 * prompt. Changes only while the wedding is active. The layout has already
 * answered "not found" for anyone who is not a member.
 */
export async function GuestsSection({
  params,
  searchParams,
}: {
  params: Promise<{ weddingId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { weddingId } = await params;
  const filters = readFilters(await searchParams);
  const [wedding, guests, events, reminderSettings] = await Promise.all([
    getWedding(weddingId),
    getGuests(weddingId),
    getEvents(weddingId),
    getReminderSettings(weddingId),
  ]);
  if (wedding.kind !== 'ok') return null;
  const writable = wedding.wedding.status === 'active';
  const coupleName = `${wedding.wedding.brideName} & ${wedding.wedding.groomName}`;
  const choices: GuestEventChoice[] =
    events.kind === 'ok'
      ? events.events.map((event) => ({
          id: event.id,
          title: event.title,
          cancelled: event.state === 'cancelled',
          ...(eventWhen(event) ? { when: eventWhen(event) } : {}),
          ...(event.venue?.name ? { venue: event.venue.name } : {}),
        }))
      : [];
  const hasGuests = guests.kind === 'ok' && guests.guests.length > 0;
  // Reminders are about ceremonies still to come.
  const upcomingIds = new Set(
    events.kind === 'ok' ? events.events.filter((event) => isUpcoming(event)).map((e) => e.id) : [],
  );
  const upcoming = choices.filter((choice) => upcomingIds.has(choice.id));
  const ceremonyNames = choices.filter((choice) => !choice.cancelled).map((choice) => choice.title);

  const page = (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex max-w-2xl flex-col gap-2">
          <p className="flex items-center gap-2 text-label-sm font-semibold tracking-widest text-secondary uppercase">
            <span className="size-1.5 rounded-full bg-secondary" aria-hidden="true" />
            Guest list
          </p>
          <h1 className="font-serif text-headline-lg-mobile tracking-tight text-on-surface sm:text-headline-lg">
            Guests & RSVP
          </h1>
          <p className="text-body-lg text-on-surface-variant">
            Keep your guest list organized and track who’s joining each celebration.
          </p>
        </div>
        {hasGuests && (
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <AddGuestButton>Add guest</AddGuestButton>
            <div className="flex flex-wrap gap-1 sm:justify-end">
              {writable && <RemindGuests weddingId={weddingId} events={upcoming} />}
              {writable && reminderSettings && (
                <AutoReminders weddingId={weddingId} initial={reminderSettings} />
              )}
              {writable && <ImportGuests weddingId={weddingId} ceremonies={ceremonyNames} />}
              <ExportGuests
                guests={guests.kind === 'ok' ? guests.guests : []}
                events={choices}
                coupleName={coupleName}
              />
            </div>
          </div>
        )}
      </header>

      {!writable && (
        <FormAlert tone="error" title="This wedding is read-only">
          It has been archived, so guests and RSVPs can be viewed but not changed.
        </FormAlert>
      )}

      {guests.kind === 'unavailable' ? (
        <section className="rounded-2xl bg-surface-container-lowest p-8 shadow-sm">
          <h2 className="text-title-md text-on-surface">We couldn’t load your guests</h2>
          <p className="mt-2 text-body-md text-on-surface-variant">
            Something went wrong on our side. Your guest list is safe; please try again.
          </p>
          <ButtonLink
            href={guestsPath(weddingId, filterParams(filters))}
            size="md"
            className="mt-5"
          >
            Retry
          </ButtonLink>
        </section>
      ) : !hasGuests ? (
        <GuestsEmpty writable={writable} weddingId={weddingId} ceremonies={ceremonyNames} />
      ) : (
        <>
          <GuestStats totals={guests.totals} />
          <GuestDirectory
            weddingId={weddingId}
            guests={guests.guests}
            truncated={guests.truncated}
            events={choices}
            initialFilters={filters}
          />
        </>
      )}

      <aside className="flex items-start gap-3 rounded-2xl bg-surface-container-low p-4 text-body-sm text-on-surface-variant">
        <Icon name="lock" className="mt-0.5 size-5 shrink-0 text-secondary" />
        <p>
          <span className="font-semibold text-on-surface">Private to your planning team.</span>{' '}
          Guest details, invitation links and RSVPs never appear on your public wedding website.
          Each guest sees only their own invitation, through their private link.
        </p>
      </aside>
    </div>
  );

  return (
    <GuestDrawer
      weddingId={weddingId}
      guests={guests.kind === 'ok' ? guests.guests : []}
      events={choices}
      upcoming={upcoming}
      coupleName={coupleName}
      writable={writable}
      canRemove={writable && wedding.wedding.role === 'owner'}
    >
      {page}
    </GuestDrawer>
  );
}

function Stat({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: IconName;
}) {
  return (
    <div className="flex flex-col rounded-xl bg-surface-container-lowest p-4 shadow-xs">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-label-md text-on-surface-variant">{label}</h2>
        <Icon name={icon} className="size-5 shrink-0 text-secondary" />
      </div>
      <p className="mt-3 font-serif text-headline-md text-on-surface tabular-nums">{value}</p>
      <p className="mt-1 text-body-sm text-on-surface-variant">{note}</p>
    </div>
  );
}

/**
 * Contacts, people and answers kept apart (PRD GUEST-04): people are
 * counted once across the wedding; confirmed people only per ceremony.
 */
function GuestStats({ totals }: { totals: GuestTotals }) {
  const total = totals.answered + totals.pending;
  const events = totals.events.filter((event) => event.invitedGuests > 0);
  return (
    <section
      aria-label="Guest totals"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4"
    >
      <Stat
        label="Guest contacts"
        value={String(totals.contacts)}
        note="families or groups"
        icon="group"
      />
      <Stat
        label="Invited people"
        value={String(totals.invitedPeople)}
        note="counted once across the wedding"
        icon="supervisor-account"
      />
      <Stat
        label="Ceremony responses"
        value={`${totals.answered} of ${total}`}
        note={`${totals.pending} still pending`}
        icon="fact-check"
      />
      <div className="flex flex-col rounded-xl bg-surface-container-lowest p-4 shadow-xs">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-label-md text-on-surface-variant">Confirmed by ceremony</h2>
          <Icon name="event-available" className="size-5 shrink-0 text-secondary" />
        </div>
        {events.length === 0 ? (
          <p className="mt-3 text-body-sm text-on-surface-variant">
            No one invited to a ceremony yet.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-0.5 text-body-sm">
            {events.map((event) => (
              <li key={event.eventId} className="flex justify-between gap-3">
                <span className="truncate text-on-surface">{event.title}</span>
                <span className="shrink-0 text-on-surface tabular-nums">
                  <b>{event.confirmedPeople}</b>
                  <span className="text-on-surface-variant"> of {event.invitedPeople}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-1.5 text-label-sm text-on-surface-variant">
          People attending · Maybe not included
        </p>
      </div>
    </section>
  );
}

/** A new guest list (Stitch "Guests & RSVP", empty state). */
function GuestsEmpty({
  writable,
  weddingId,
  ceremonies,
}: {
  writable: boolean;
  weddingId: string;
  ceremonies: readonly string[];
}) {
  return (
    <section className="flex flex-col items-center rounded-2xl bg-surface-container-lowest px-6 py-14 text-center shadow-xs">
      <span
        className="mb-5 flex size-16 items-center justify-center rounded-full bg-surface-container text-primary"
        aria-hidden="true"
      >
        <Icon name="group" className="size-8" />
      </span>
      <h2 className="font-serif text-headline-md text-on-surface">Your guest list starts here</h2>
      <p className="mt-2 mb-6 max-w-md text-body-md text-on-surface-variant">
        Add a family contact, set their invited party size, and choose the celebrations they’re
        invited to.
      </p>
      {writable ? (
        <>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <AddGuestButton>Add your first guest</AddGuestButton>
            <ImportGuests weddingId={weddingId} ceremonies={ceremonies} />
          </div>
          <p className="mt-3 text-body-sm text-on-surface-variant">
            One contact can represent an entire family.
          </p>
        </>
      ) : (
        <p className="text-body-sm text-on-surface-variant">No guests were added.</p>
      )}
    </section>
  );
}

/** While the guests load: placeholder tiles and rows, announced once. */
export function GuestsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <p role="status" className="sr-only">
        Loading guests…
      </p>
      <div
        aria-hidden="true"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4"
      >
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
