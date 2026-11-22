import { Icon } from '@/components/ui/icon';
import { CoverImage } from '@/components/website/site/cover-image';
import type { GuestView } from '@/lib/guests/guests';
import { dateRangeLabel, monthYear } from '@/lib/website/site';
import { RSVP_SKINS } from './rsvp-theme';

/** The first and last day of the guest's ceremonies that are still on. */
export function datesOf(events: GuestView['events']) {
  const days = events
    .filter((event) => !event.cancelled && event.startDate)
    .map((event) => event.startDate as string)
    .sort();
  const start = days[0];
  const end = days.at(-1);
  return start && end ? { start, end } : undefined;
}

/** "RS" for Rajesh Sharma: the first letters of the first and last words. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/);
  const first = Array.from(words[0] ?? '')[0] ?? '';
  const last = words.length > 1 ? (Array.from(words.at(-1) ?? '')[0] ?? '') : '';
  return `${first}${last}`.toUpperCase();
}

type HeaderView = Pick<GuestView, 'coupleName' | 'templateId' | 'events'>;

/** The top bar of each design; the brand alone until the invitation is known. */
export function RsvpHeader({ view }: { view?: HeaderView }) {
  const theme = view?.templateId ?? 'traditional';
  const skin = RSVP_SKINS[theme];
  return (
    <header className={`sticky top-0 z-40 w-full ${skin.header}`}>
      <div className="mx-auto flex h-16 w-full max-w-lg items-center justify-between gap-3 px-5">
        {!view ? (
          <p className="flex items-center gap-2 font-serif text-title-md text-primary italic">
            <span
              aria-hidden="true"
              className="flex size-8 items-center justify-center rounded-full bg-primary font-serif text-body-md text-on-primary not-italic"
            >
              M
            </span>
            My Marriage
          </p>
        ) : theme === 'modern' ? (
          <>
            <p className="flex min-w-0 items-center gap-3">
              <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-minimal-ink" />
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-serif text-[1.125rem] leading-none tracking-tight text-minimal-text">
                  {view.coupleName}
                </span>
                <span className="mt-0.5 font-mono text-[9px] tracking-widest text-minimal-muted uppercase">
                  Private RSVP registry
                </span>
              </span>
            </p>
            {monthYear(datesOf(view.events)) && (
              <span className="shrink-0 rounded-full border border-minimal-line bg-minimal-subtle px-2 py-0.5 font-mono text-[10px] tracking-wider text-minimal-tan uppercase">
                {monthYear(datesOf(view.events))}
              </span>
            )}
          </>
        ) : theme === 'royal' ? (
          <>
            <p className="flex min-w-0 items-center gap-2.5">
              <span
                aria-hidden="true"
                className="flex size-9 shrink-0 items-center justify-center rounded-full border border-regal-gold/40 bg-regal-emerald shadow-xs"
              >
                <Icon name="favorite" className="size-4.5 text-regal-cream" />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-display text-[13.5px] font-bold tracking-wider text-regal-ink uppercase">
                  {view.coupleName}
                </span>
                <span className="flex items-center gap-1">
                  <span aria-hidden="true" className="h-0.5 w-1.5 bg-regal-gold" />
                  <span className="text-[10px] tracking-[0.2em] text-regal-bronze uppercase">
                    Royal Nuptials
                  </span>
                  <span aria-hidden="true" className="h-0.5 w-1.5 bg-regal-gold" />
                </span>
              </span>
            </p>
            <span className="shrink-0 rounded-full border border-regal-gold/60 bg-regal-pill px-2 py-0.5 font-display text-[10px] font-semibold tracking-wider text-regal-bronze">
              RSVP
            </span>
          </>
        ) : (
          <p className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-container"
            >
              <Icon name="favorite" className="size-5 text-primary" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-title-sm leading-tight tracking-tight text-primary">
                {view.coupleName}
              </span>
              <span className="text-label-sm tracking-wider text-on-surface-variant uppercase">
                My Marriage
              </span>
            </span>
          </p>
        )}
      </div>
    </header>
  );
}

const WELCOME =
  'We eagerly look forward to sharing these cherished moments with you. Please review and indicate who from your household will join us for each celebration below.';

/** The invitation's welcome card, in the design of the wedding website. */
export function RsvpHero({ view }: { view: GuestView }) {
  const dates = dateRangeLabel(datesOf(view.events));
  const family = view.partySize === 1 ? 'Just you' : `Family of ${view.partySize}`;
  const guests = view.partySize === 1 ? '1 guest' : `${view.partySize} guests`;

  if (view.templateId === 'modern') {
    return (
      <header className="relative overflow-hidden rounded-[0.875rem] border border-minimal-line bg-surface-container-lowest p-5 shadow-[0_1px_4px_rgba(0,0,0,0.015)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-minimal-line-soft pb-3">
          <p className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-minimal-tan uppercase">
            <Icon name="lock" className="size-3.5" />
            Confidential invitation
          </p>
          <p className="rounded-full border border-minimal-line bg-minimal-subtle px-2 py-0.5 font-mono text-[10px] tracking-wide text-minimal-body uppercase">
            Capacity: {String(view.partySize).padStart(2, '0')}{' '}
            {view.partySize === 1 ? 'guest' : 'guests'}
          </p>
        </div>
        <div className="mt-4">
          <p className="font-mono text-[10px] tracking-widest text-minimal-muted uppercase">
            We request the honour of your presence
          </p>
          <h1 className="mt-1 font-serif text-[30px] leading-[1.15] font-normal tracking-tight wrap-break-word text-minimal-text sm:text-[32px]">
            {view.coupleName}
          </h1>
          <dl className="mt-3 flex flex-col gap-1.5 border-t border-minimal-line-soft/80 pt-3 text-[12.5px]">
            {dates && (
              <div className="flex items-center gap-2">
                <dt className="w-14 shrink-0 font-mono text-[10px] tracking-wider text-minimal-muted uppercase">
                  Dates
                </dt>
                <dd className="font-medium text-minimal-text">{dates}</dd>
              </div>
            )}
            {view.place && (
              <div className="flex items-center gap-2">
                <dt className="w-14 shrink-0 font-mono text-[10px] tracking-wider text-minimal-muted uppercase">
                  Venue
                </dt>
                <dd className="truncate text-minimal-text">{view.place}</dd>
              </div>
            )}
          </dl>
        </div>
        {view.coverUrl && (
          <div className="relative mt-4 h-28 overflow-hidden rounded-md border border-minimal-line/70">
            <CoverImage src={view.coverUrl} className="grayscale-[15%]" />
            <p className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 to-transparent p-2 font-mono text-[9px] tracking-wider text-white/90 uppercase">
              {view.place}
            </p>
          </div>
        )}
        <div className="mt-4 rounded-md border border-minimal-line/70 bg-minimal-subtle p-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="flex size-8 items-center justify-center rounded-full border border-minimal-line bg-surface-container-lowest font-mono text-[11px] font-medium text-minimal-ink"
              >
                {initials(view.guestName)}
              </span>
              <div>
                <p className="text-[13.5px] leading-snug font-semibold text-minimal-text">
                  Namaste, {view.guestName}
                </p>
                <p className="font-mono text-[10px] text-minimal-muted uppercase">
                  Primary guest · household of {view.partySize}
                </p>
              </div>
            </div>
            <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-minimal-ink" />
          </div>
          <p className="mt-2.5 text-[12.5px] leading-relaxed text-minimal-body">{WELCOME}</p>
        </div>
      </header>
    );
  }

  if (view.templateId === 'royal') {
    return (
      <header className="relative overflow-hidden rounded-2xl border border-regal-gold/45 bg-linear-to-b from-regal-hero to-regal-deep p-5 text-on-primary shadow-lg">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-12 -right-12 size-48 rounded-full border border-regal-gold/20"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-6 -right-6 size-36 rounded-full border border-regal-gold/15"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-12 -left-12 size-44 rounded-full bg-regal-gold/5 blur-xl"
        />
        <div className="relative z-10 mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1 font-display text-[11px] font-semibold tracking-[0.25em] text-regal-gold-light uppercase">
            <Icon name="workspace-premium" className="size-4" />
            Private invitation
          </p>
          <p className="flex items-center gap-1 rounded-full border border-regal-emboss-line bg-regal-emboss px-3 py-0.5 text-[11px] font-bold tracking-wide text-regal-gold-ink shadow-xs">
            <Icon name="group" className="size-3.5" />
            Up to {guests}
          </p>
        </div>
        <div aria-hidden="true" className="relative z-10 my-2 flex items-center gap-2 opacity-70">
          <span className="h-px flex-1 bg-linear-to-r from-transparent via-regal-gold to-transparent" />
          <span className="text-[10px] text-regal-gold-light">◆</span>
          <span className="h-px flex-1 bg-linear-to-r from-transparent via-regal-gold to-transparent" />
        </div>
        <div className="relative z-10 pt-1">
          <p className="font-display text-[10px] font-medium tracking-[0.3em] text-regal-gold-light/90 uppercase">
            You’re cordially invited
          </p>
          <h1 className="mt-1 font-serif text-headline-lg-mobile leading-snug font-normal tracking-tight wrap-break-word text-regal-ivory">
            {view.coupleName}’s Wedding
          </h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[12.5px] text-regal-sub">
            {dates && (
              <span className="flex items-center gap-1 font-medium">
                <Icon name="calendar-today" className="size-4 text-regal-gold-light" />
                {dates}
              </span>
            )}
            {dates && view.place && (
              <span aria-hidden="true" className="text-regal-gold/60">
                •
              </span>
            )}
            {view.place && (
              <span className="flex items-center gap-1">
                <Icon name="location-on" className="size-4 text-regal-gold-light" />
                {view.place}
              </span>
            )}
          </p>
        </div>
        {view.coverUrl && (
          <div className="relative z-10 mt-4 h-32 overflow-hidden rounded-xl border border-regal-gold/40 shadow-inner">
            <CoverImage src={view.coverUrl} />
            <p className="absolute inset-0 flex items-end bg-linear-to-t from-regal-deep/90 via-regal-deep/30 to-transparent p-2.5 font-display text-[11px] font-medium tracking-wider text-regal-cream">
              {view.place}
            </p>
          </div>
        )}
        <div className="relative z-10 mt-4 rounded-xl border border-regal-parchment-line bg-regal-parchment p-3.5 text-on-surface shadow-sm">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-full border border-regal-emboss-line bg-regal-emboss font-display text-title-sm font-bold text-regal-gold-ink shadow-xs"
            >
              {initials(view.guestName)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-[14.5px] leading-tight font-bold wrap-break-word text-regal-ink">
                Namaste, {view.guestName}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-[11px]">
                <span className="font-semibold tracking-wider text-regal-bronze uppercase">
                  Primary guest
                </span>
                <span aria-hidden="true" className="text-regal-gold">
                  •
                </span>
                <span className="text-regal-body">{family}</span>
              </p>
            </div>
          </div>
          <p className="mt-2.5 text-[13px] leading-relaxed text-regal-body">{WELCOME}</p>
        </div>
      </header>
    );
  }

  return (
    <header className="relative overflow-hidden rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -bottom-10 size-36 rounded-full bg-secondary-container/25 blur-2xl"
      />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-label-sm font-semibold tracking-widest text-secondary uppercase">
          <Icon name="all-inclusive" className="size-4.5" />
          Private invitation
        </p>
        <p className="flex items-center gap-1 rounded-full bg-secondary-container/50 px-2.5 py-0.5 text-label-sm text-on-secondary-container">
          <Icon name="group" className="size-3.5" />
          Up to {guests}
        </p>
      </div>
      <p className="text-label-sm tracking-widest text-on-surface-variant uppercase">
        You’re invited
      </p>
      <h1 className="mt-0.5 font-serif text-headline-lg-mobile leading-snug wrap-break-word text-on-surface">
        {view.coupleName}’s Wedding
      </h1>
      <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-body-sm text-on-surface-variant">
        {dates && (
          <span className="flex items-center gap-1.5">
            <Icon name="calendar-today" className="size-4 text-primary" />
            {dates}
          </span>
        )}
        {dates && view.place && (
          <span aria-hidden="true" className="text-outline-variant">
            •
          </span>
        )}
        {view.place && (
          <span className="flex items-center gap-1.5">
            <Icon name="location-on" className="size-4 text-primary" />
            {view.place}
          </span>
        )}
      </p>
      {view.coverUrl && (
        <div className="relative mt-4 h-28 overflow-hidden rounded-xl">
          <CoverImage src={view.coverUrl} />
          <p className="absolute inset-0 flex items-end bg-linear-to-t from-on-surface/60 via-transparent to-transparent p-2.5 text-label-sm tracking-wide text-surface">
            {view.place}
          </p>
        </div>
      )}
      <div className="relative mt-4 rounded-xl bg-surface-container-low p-3.5">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary-container text-title-sm text-on-secondary-container"
          >
            {initials(view.guestName)}
          </span>
          <div className="min-w-0">
            <p className="text-title-sm leading-tight wrap-break-word text-on-surface">
              Namaste, {view.guestName}
            </p>
            <p className="text-label-sm text-on-surface-variant">Primary guest · {family}</p>
          </div>
        </div>
        <p className="mt-2.5 text-body-sm leading-relaxed text-on-surface-variant">{WELCOME}</p>
      </div>
    </header>
  );
}
