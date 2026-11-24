import { Icon, type IconName } from '@/components/ui/icon';
import { partOfDay } from '@/lib/events/format';
import { routes } from '@/lib/routes';
import {
  celebrationCount,
  dateRangeLabel,
  eventDay,
  eventTime,
  monogram,
  placeLabel,
  storyParagraphs,
  venueLabel,
  youtubeWatchUrl,
  type Site,
  type SiteEvent,
} from '@/lib/website/site';
import { CoverImage } from './cover-image';
import { Livestream } from './livestream';
import {
  NO_CELEBRATIONS,
  PRIVATE_REPLY_NOTE,
  RSVP_CTA,
  SECTION_ANCHORS,
  sectionsOf,
  type SectionId,
} from './sections';
import { SiteGallery, type GalleryAlbum } from './site-gallery';
import { SiteRsvp } from './site-rsvp';
import { SITE_SKINS, type SiteSkin } from './site-skins';

type Theme = Site['templateId'];

const NAV_LABELS: Record<SectionId, string> = {
  story: 'Our Story',
  celebrations: 'Celebrations',
  gallery: 'Gallery',
  rsvp: 'RSVP',
  faq: 'FAQ',
};

/** Today in India, as `YYYY-MM-DD`, for the countdown. */
function today(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

/** Whole days from today to the first celebration; undefined once it has begun. */
function daysToGo(range: Site['dateRange']): number | undefined {
  if (!range) return undefined;
  const days = Math.round((Date.parse(range.start) - Date.parse(today())) / 86_400_000);
  return days >= 0 ? days : undefined;
}

/** The small picture on a ceremony's tag, by the time of day it starts. */
function ceremonyIcon(event: Pick<SiteEvent, 'startTime'>): IconName {
  const part = partOfDay(event.startTime);
  if (part === 'Morning' || part === 'Afternoon') return 'wb-sunny';
  if (part) return 'local-fire-department';
  return 'celebration';
}

/**
 * Which ceremony cards take a whole row on wider screens, so the two-column
 * grid never leaves a hole: a card with a livestream always does, and so
 * does a card that would otherwise sit alone on its row.
 */
export function fullRows(
  events: readonly Pick<SiteEvent, 'livestreamVideoId' | 'cancelled'>[],
): boolean[] {
  const full = events.map((event) => Boolean(event.livestreamVideoId) && !event.cancelled);
  let column = 0;
  events.forEach((_, index) => {
    if (full[index]) {
      // A half-filled row before a full one: its card takes the row.
      if (column === 1) full[index - 1] = true;
      column = 0;
    } else column = (column + 1) % 2;
  });
  if (column === 1) full[events.length - 1] = true;
  return full;
}

interface CelebrationDay {
  /** "Wed 10 Feb 2027", or "Date to be announced". */
  label: string;
  /** "10 Feb" for the jump chips. */
  chip: string;
  titles: string[];
  /** The day's first ceremony, which carries the day's anchor. */
  firstIndex: number;
}

/** The ceremonies still on, by day, for "At a glance" and the day chips. */
function celebrationDays(events: readonly SiteEvent[]): CelebrationDay[] {
  const days = new Map<string, CelebrationDay>();
  events.forEach((event, index) => {
    if (event.cancelled) return;
    const day = eventDay(event);
    const key = day?.short ?? 'Date to be announced';
    const known = days.get(key);
    if (known) known.titles.push(event.title);
    else {
      days.set(key, {
        label: key,
        chip: day ? `${day.day} ${day.month}` : 'Date to come',
        titles: [event.title],
        firstIndex: index,
      });
    }
  });
  return [...days.values()];
}

/** The anchor of the day a ceremony opens, as "At a glance" and the day chips link to it. */
function dayAnchor(number: number): string {
  return `celebrations-day-${number}`;
}

function SectionTitle({
  skin,
  overline,
  title,
  id,
  aside,
}: {
  skin: SiteSkin;
  overline: string;
  title: string;
  id: string;
  aside?: string;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
      <div>
        <p className={skin.overline}>{overline}</p>
        <h2 id={id} className={`mt-1 ${skin.heading}`}>
          {title}
        </h2>
      </div>
      {aside && <p className={skin.body}>{aside}</p>}
    </div>
  );
}

function Header({ site, skin, sections }: { site: Site; skin: SiteSkin; sections: SectionId[] }) {
  const theme = site.templateId;
  const [bride, groom] = monogram(site);
  return (
    <header className={`sticky top-0 z-40 w-full ${skin.header}`}>
      <div className="mx-auto flex min-h-14 w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 px-4 site-sm:min-h-16 site-sm:px-6">
        <a href="#top" className="flex min-w-0 items-center gap-2.5">
          {theme === 'modern' ? (
            <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-minimal-ink" />
          ) : (
            <span
              aria-hidden="true"
              className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
                theme === 'royal'
                  ? 'border border-regal-gold/40 bg-regal-emerald text-regal-cream'
                  : 'bg-surface-container text-primary'
              }`}
            >
              <Icon name="favorite" className="size-4.5" />
            </span>
          )}
          <span className="flex min-w-0 flex-col">
            <span
              className={`truncate ${
                theme === 'royal'
                  ? 'font-display text-[13.5px] font-bold tracking-wider text-regal-ink uppercase'
                  : theme === 'modern'
                    ? 'font-serif text-[1.125rem] leading-none tracking-tight text-minimal-text'
                    : 'text-title-sm leading-tight font-semibold text-primary'
              }`}
            >
              {site.coupleName}
            </span>
            <span
              className={`hidden site-sm:block ${
                theme === 'modern'
                  ? 'mt-0.5 font-mono text-[9px] tracking-widest text-minimal-muted uppercase'
                  : theme === 'royal'
                    ? 'text-[10px] tracking-[0.2em] text-regal-bronze uppercase'
                    : 'text-label-sm tracking-wider text-on-surface-variant uppercase'
              }`}
            >
              {bride} &amp; {groom} · Wedding
            </span>
          </span>
        </a>
        <nav
          aria-label="Website sections"
          className="order-last -mx-4 -mt-1 flex w-[calc(100%+2rem)] gap-5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] site-sm:-mx-6 site-sm:w-[calc(100%+3rem)] site-sm:px-6 site-md:order-none site-md:mx-0 site-md:mt-0 site-md:w-auto site-md:px-0 site-md:pb-0 [&::-webkit-scrollbar]:hidden"
        >
          {sections.map((section) => (
            <a
              key={section}
              href={`#${SECTION_ANCHORS[section]}`}
              className={`inline-flex min-h-8 shrink-0 items-center transition-colors ${skin.navLink}`}
            >
              {NAV_LABELS[section]}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}

function Welcome({ site, skin }: { site: Site; skin: SiteSkin }) {
  const theme = site.templateId;
  const dates = dateRangeLabel(site.dateRange);
  const place = placeLabel(site);
  const count = celebrationCount(site.events);
  const [bride, groom] = monogram(site);
  const countLabel = count === 1 ? '1 celebration' : `${count} celebrations`;
  const meta = (
    <p
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${
        theme === 'royal' ? 'text-[13px] text-regal-sub' : skin.body
      }`}
    >
      {dates && (
        <span className="flex items-center gap-1.5 font-medium">
          <Icon
            name="calendar-today"
            className={`size-4 ${theme === 'royal' ? 'text-regal-gold-light' : 'text-primary'}`}
          />
          {dates}
        </span>
      )}
      {dates && (
        <span aria-hidden="true" className="opacity-60">
          •
        </span>
      )}
      <span className="flex items-center gap-1.5">
        <Icon
          name="location-on"
          className={`size-4 ${theme === 'royal' ? 'text-regal-gold-light' : 'text-primary'}`}
        />
        {place}
      </span>
    </p>
  );
  // On a phone with a cover photo, the card rises over the photo's lower edge.
  const lift = site.coverUrl ? 'z-10 -mt-24 mx-2 site-sm:mx-0 site-sm:mt-0' : '';
  const actions = (
    <div className="flex flex-col gap-2.5 site-sm:flex-row site-sm:flex-wrap">
      <a href={`#${SECTION_ANCHORS.rsvp}`} className={skin.primary}>
        <Icon name="task-alt" className="size-4.5" />
        {RSVP_CTA}
      </a>
      <a href={`#${SECTION_ANCHORS.celebrations}`} className={skin.secondary}>
        See the celebrations
        <Icon name="arrow-forward" className="size-4" />
      </a>
    </div>
  );
  const note = (
    <p
      className={`flex items-center gap-1.5 ${theme === 'royal' ? 'text-[12px] text-regal-sub' : skin.privacy}`}
    >
      <Icon name="lock" className="size-3.5 shrink-0" />
      {PRIVATE_REPLY_NOTE}
    </p>
  );

  const card =
    theme === 'modern' ? (
      <div className={`relative flex flex-col gap-4 ${skin.card} site-sm:p-7 ${lift}`}>
        <div className="hidden flex-wrap items-center justify-between gap-2 border-b border-minimal-line-soft pb-3 site-sm:flex">
          <p className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-minimal-tan uppercase">
            <Icon name="favorite" className="size-3.5" />
            Wedding website
          </p>
          <p className="rounded-full border border-minimal-line bg-minimal-subtle px-2 py-0.5 font-mono text-[10px] tracking-wide text-minimal-body uppercase">
            Celebrations: {String(count).padStart(2, '0')}
          </p>
        </div>
        <div>
          <p className="font-mono text-[10px] tracking-widest text-minimal-muted uppercase">
            We request the honour of your presence
          </p>
          <h1 className="mt-1 font-serif text-[2.25rem] leading-[1.1] font-normal tracking-tight wrap-break-word text-minimal-text site-sm:text-[3rem]">
            {site.coupleName}
          </h1>
        </div>
        <dl className="flex flex-col gap-1.5 border-t border-minimal-line-soft pt-3 text-[13px]">
          {dates && (
            <div className="flex items-baseline gap-3">
              <dt className="w-16 shrink-0 font-mono text-[10px] tracking-wider text-minimal-muted uppercase">
                Dates
              </dt>
              <dd className="font-medium text-minimal-text">{dates}</dd>
            </div>
          )}
          <div className="flex items-baseline gap-3">
            <dt className="w-16 shrink-0 font-mono text-[10px] tracking-wider text-minimal-muted uppercase">
              Place
            </dt>
            <dd className="text-minimal-text">{place}</dd>
          </div>
        </dl>
        {site.headline && (
          <div className="rounded-md border border-minimal-line/70 bg-minimal-subtle p-4">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="hidden size-9 shrink-0 items-center justify-center rounded-full border border-minimal-line site-sm:flex bg-surface-container-lowest font-mono text-[11px] font-medium text-minimal-ink"
              >
                {bride}
                {groom}
              </span>
              <p className="font-serif text-[1.25rem] leading-snug text-minimal-text">
                {site.headline}
              </p>
            </div>
          </div>
        )}
        {actions}
        {note}
      </div>
    ) : theme === 'royal' ? (
      <div
        className={`relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-regal-gold/45 bg-linear-to-b from-regal-hero to-regal-deep p-5 text-on-primary shadow-lg site-sm:p-8 ${lift}`}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-14 -right-14 size-56 rounded-full border border-regal-gold/20"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-6 -right-6 size-40 rounded-full border border-regal-gold/15"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-12 -left-12 size-48 rounded-full bg-regal-gold/5 blur-xl"
        />
        <div className="relative hidden flex-wrap items-center justify-between gap-2 site-sm:flex">
          <p className="flex items-center gap-1 font-display text-[11px] font-semibold tracking-[0.25em] text-regal-gold-light uppercase">
            <Icon name="workspace-premium" className="size-4" />
            Wedding celebration
          </p>
          <p className="flex items-center gap-1 rounded-full border border-regal-emboss-line bg-regal-emboss px-3 py-0.5 text-[11px] font-bold tracking-wide text-regal-gold-ink shadow-xs">
            <Icon name="celebration" className="size-3.5" />
            {countLabel}
          </p>
        </div>
        <div aria-hidden="true" className="relative flex items-center gap-2 opacity-70">
          <span className="h-px flex-1 bg-linear-to-r from-transparent via-regal-gold to-transparent" />
          <span className="text-[10px] text-regal-gold-light">◆</span>
          <span className="h-px flex-1 bg-linear-to-r from-transparent via-regal-gold to-transparent" />
        </div>
        <div className="relative">
          <p className="font-display text-[10px] font-medium tracking-[0.3em] text-regal-gold-light/90 uppercase">
            You’re cordially invited
          </p>
          <h1 className="mt-1 font-serif text-[2.25rem] leading-tight font-normal tracking-tight wrap-break-word text-regal-ivory site-sm:text-[3rem]">
            {site.coupleName}’s Wedding
          </h1>
        </div>
        <div className="relative">{meta}</div>
        {site.headline && (
          <div className="relative rounded-xl border border-regal-parchment-line bg-regal-parchment p-4 text-on-surface shadow-sm">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="hidden size-10 shrink-0 items-center justify-center rounded-full border border-regal-emboss-line site-sm:flex bg-regal-emboss font-display text-[12px] font-bold text-regal-gold-ink shadow-xs"
              >
                {bride}
                {groom}
              </span>
              <div className="min-w-0">
                <p className="font-display text-[12px] font-bold tracking-wider text-regal-bronze uppercase">
                  Namaste &amp; welcome
                </p>
                <p className="font-serif text-[1.25rem] leading-snug text-regal-ink italic">
                  {site.headline}
                </p>
              </div>
            </div>
          </div>
        )}
        <div className="relative">{actions}</div>
        <div className="relative">{note}</div>
      </div>
    ) : (
      <div
        className={`relative flex flex-col gap-4 overflow-hidden rounded-2xl bg-surface-container-lowest p-5 shadow-sm site-sm:p-8 ${lift}`}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -bottom-12 size-48 rounded-full bg-secondary-container/30 blur-2xl"
        />
        <div className="relative hidden flex-wrap items-center justify-between gap-2 site-sm:flex">
          <p className="flex items-center gap-1.5 text-label-sm font-semibold tracking-widest text-secondary uppercase">
            <Icon name="all-inclusive" className="size-4.5" />
            We’re getting married
          </p>
          <p className="flex items-center gap-1 rounded-full bg-secondary-container/50 px-2.5 py-0.5 text-label-sm text-on-secondary-container">
            <Icon name="celebration" className="size-3.5" />
            {countLabel}
          </p>
        </div>
        <div className="relative">
          <p className="text-label-sm tracking-widest text-on-surface-variant uppercase">
            You’re invited
          </p>
          <h1 className="mt-1 font-serif text-[2.25rem] leading-tight wrap-break-word text-on-surface site-sm:text-[3rem]">
            {site.coupleName}’s Wedding
          </h1>
        </div>
        <div className="relative">{meta}</div>
        {site.headline && (
          <div className="relative rounded-xl bg-surface-container-low p-4">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="hidden size-10 shrink-0 items-center justify-center rounded-full bg-secondary-container text-title-sm site-sm:flex font-semibold text-on-secondary-container"
              >
                {bride}
                {groom}
              </span>
              <div className="min-w-0">
                <p className="text-label-sm font-semibold tracking-wider text-secondary uppercase">
                  Namaste &amp; welcome
                </p>
                <p className="font-serif text-[1.25rem] leading-snug text-primary italic">
                  {site.headline}
                </p>
              </div>
            </div>
          </div>
        )}
        <div className="relative">{actions}</div>
        <div className="relative">{note}</div>
      </div>
    );

  return (
    <section className="grid grid-cols-1 gap-4 site-lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] site-lg:gap-6">
      {card}
      <Photo site={site} skin={skin} />
    </section>
  );
}

/** The welcome card's photo; the couple's monogram, drawn in the design, until there is one. */
function Photo({ site, skin }: { site: Site; skin: SiteSkin }) {
  const theme = site.templateId;
  const [bride, groom] = monogram(site);
  const place = placeLabel(site);
  if (site.coverUrl) {
    return (
      <div
        className={`relative order-first -mx-4 -mt-4 aspect-[4/5] overflow-hidden site-sm:order-none site-sm:mx-0 site-sm:mt-0 site-sm:aspect-auto site-sm:min-h-80 site-lg:min-h-full ${skin.photo} site-phone:rounded-none! site-phone:border-0! site-phone:shadow-none!`}
      >
        <CoverImage src={site.coverUrl} className={theme === 'modern' ? 'grayscale-[15%]' : ''} />
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-black/35 to-transparent site-sm:hidden"
        />
        <p className={`absolute inset-x-0 bottom-0 ${skin.caption} site-phone:hidden!`}>
          {theme === 'modern' ? (
            <>
              <span>{place}</span>
              <span className="text-white/70">Fig. 01</span>
            </>
          ) : (
            <>
              <Icon name="photo-library" className="size-4" />
              {place}
            </>
          )}
        </p>
      </div>
    );
  }
  return (
    <div
      aria-hidden="true"
      className={`relative hidden min-h-full items-center justify-center overflow-hidden site-lg:flex ${
        theme === 'royal'
          ? 'rounded-2xl border border-regal-gold/45 bg-regal-emerald'
          : theme === 'modern'
            ? 'rounded-[0.875rem] border border-minimal-line bg-minimal-subtle'
            : 'rounded-2xl bg-secondary-container/25'
      }`}
    >
      {theme === 'royal' && <span className="absolute inset-0 bg-jali opacity-50" />}
      <span
        className={`relative flex size-56 flex-col items-center justify-center rounded-full ${
          theme === 'royal'
            ? 'border border-regal-gold/50 text-regal-cream'
            : theme === 'modern'
              ? 'border border-minimal-line bg-surface-container-lowest text-minimal-text'
              : 'border border-secondary/30 bg-surface-container-lowest/70 text-primary'
        }`}
      >
        <span
          className={
            theme === 'royal'
              ? 'font-display text-[3.5rem] font-bold tracking-wider'
              : 'font-serif text-[4rem] leading-none'
          }
        >
          {bride}
          <span className={theme === 'royal' ? 'text-regal-gold' : 'text-secondary'}>&amp;</span>
          {groom}
        </span>
        <span
          className={
            theme === 'modern'
              ? 'mt-2 font-mono text-[10px] tracking-widest text-minimal-muted uppercase'
              : theme === 'royal'
                ? 'mt-2 font-display text-[11px] tracking-[0.2em] text-regal-gold-light uppercase'
                : 'mt-2 text-label-sm tracking-widest text-secondary uppercase'
          }
        >
          {site.city}
        </span>
      </span>
    </div>
  );
}

function QuickFacts({ site, skin }: { site: Site; skin: SiteSkin }) {
  const count = celebrationCount(site.events);
  const days = daysToGo(site.dateRange);
  const facts = [
    days !== undefined
      ? {
          value: days === 0 ? 'Today' : String(days),
          label: days === 1 ? 'day to go' : 'days to go',
          icon: 'hourglass-top' as const,
        }
      : { value: '—', label: 'dates to come', icon: 'hourglass-top' as const },
    {
      value: String(count),
      label: count === 1 ? 'celebration' : 'celebrations',
      icon: 'celebration' as const,
    },
    { value: site.city, label: site.state, icon: 'location-on' as const },
  ];
  return (
    <ul className="grid grid-cols-3 gap-2 site-sm:gap-4">
      {facts.map((fact) => (
        <li
          key={fact.label}
          className={`flex min-w-0 flex-col gap-1 ${skin.card} p-3! site-sm:p-5!`}
        >
          <Icon
            name={fact.icon}
            className={`size-5 ${
              site.templateId === 'royal'
                ? 'text-regal-bronze-soft'
                : site.templateId === 'modern'
                  ? 'text-minimal-tan'
                  : 'text-secondary'
            }`}
          />
          <span className={`wrap-break-word ${skin.statValue}`}>{fact.value}</span>
          <span
            className={`leading-tight wrap-break-word ${skin.statLabel} site-phone:text-[10px]! site-phone:tracking-normal!`}
          >
            {fact.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The wedding's main venue, when the couple chose to show it (decision
 * 0022): its name, address and a link to Google Maps.
 */
function Venue({ site, skin }: { site: Site; skin: SiteSkin }) {
  const venue = site.mainVenue;
  if (!venue) return null;
  return (
    <section
      aria-labelledby="site-venue"
      className={`flex flex-col gap-3 site-sm:flex-row site-sm:items-center site-sm:justify-between ${skin.card}`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <Icon name="location-on" className={`mt-1 size-6 shrink-0 ${skin.detailIcon}`} />
        <div className="min-w-0">
          <p className={skin.overline}>The wedding venue</p>
          <h2 id="site-venue" className={`wrap-break-word ${skin.title}`}>
            {venue.name ?? 'Our wedding venue'}
          </h2>
          {venue.address && <p className={`wrap-break-word ${skin.body}`}>{venue.address}</p>}
        </div>
      </div>
      {venue.mapsUrl && (
        <p className="shrink-0">
          <a
            href={venue.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={skin.secondary}
          >
            <Icon name="location-on" className="size-4" />
            Get directions <span className="sr-only">to the wedding venue (opens Google Maps)</span>
            <Icon name="arrow-outward" className="size-4" />
          </a>
        </p>
      )}
    </section>
  );
}

function Story({ site, skin }: { site: Site; skin: SiteSkin }) {
  const paragraphs = storyParagraphs(site.story);
  const days = celebrationDays(site.events);
  const glance = days.length > 0 && (
    <div className={`flex flex-col gap-3 ${skin.card}`}>
      <h3 className={skin.overline}>At a glance</h3>
      <ol className={`flex flex-col ${skin.details} gap-0! p-0!`}>
        {days.map((day, index) => (
          <li key={day.label} className="border-b border-current/10 last:border-b-0">
            <a
              href={`#${dayAnchor(index + 1)}`}
              className="flex items-baseline gap-3 px-3.5 py-2.5 transition-opacity hover:opacity-80"
            >
              <span className={`shrink-0 whitespace-nowrap ${skin.tag}`}>Day {index + 1}</span>
              <span className="min-w-0 flex-1">
                <span className={`block ${skin.detailStrong}`}>{day.label}</span>
                <span className={`block ${skin.detailText}`}>{day.titles.join(' · ')}</span>
              </span>
              <Icon name="arrow-downward" className="size-4 shrink-0 self-center opacity-60" />
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
  if (paragraphs.length === 0) return glance || null;
  return (
    <section
      id={SECTION_ANCHORS.story}
      aria-labelledby="site-story"
      className="grid scroll-mt-24 grid-cols-1 gap-4 site-lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] site-lg:gap-6"
    >
      <div className={skin.card}>
        <SectionTitle
          skin={skin}
          overline="The journey together"
          title="Our Story"
          id="site-story"
        />
        <div
          className={`flex flex-col gap-4 text-body-md leading-relaxed site-sm:text-body-lg ${site.templateId === 'royal' ? 'text-regal-body' : site.templateId === 'modern' ? 'text-minimal-text' : 'text-on-surface-variant'}`}
        >
          {paragraphs.map((paragraph, index) => (
            <p key={index} className="whitespace-pre-line">
              {paragraph}
            </p>
          ))}
        </div>
      </div>
      {glance}
    </section>
  );
}

function Celebration({
  event,
  index,
  total,
  wide,
  skin,
  theme,
  anchor,
}: {
  event: SiteEvent;
  index: number;
  total: number;
  /** The day's anchor, on the first ceremony of each day. */
  anchor?: string | undefined;
  /** Takes a whole row (see fullRows). */
  wide: boolean;
  skin: SiteSkin;
  theme: Theme;
}) {
  const day = eventDay(event);
  const time = eventTime(event);
  const venue = venueLabel(event);
  const part = partOfDay(event.startTime);
  const badge = event.cancelled ? 'Cancelled' : day ? `${day.weekday}` : 'Date to come';
  const live = Boolean(event.livestreamVideoId) && !event.cancelled;
  return (
    <li
      id={anchor}
      className={`flex min-w-0 scroll-mt-32 flex-col gap-3 ${skin.card} ${wide ? 'site-md:col-span-2' : ''}`}
    >
      {theme === 'modern' ? (
        <div className="flex items-baseline justify-between gap-2 border-b border-minimal-line-soft pb-2.5">
          <p className="flex min-w-0 items-center gap-2">
            <span className={`truncate ${skin.tag}`}>
              {String(index + 1).padStart(2, '0')} / {event.title}
            </span>
            {part && (
              <span className="shrink-0 font-mono text-[10px] text-minimal-muted uppercase">
                · {part} function
              </span>
            )}
          </p>
          <p className={skin.status}>{badge}</p>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-2">
          <p className={skin.tag}>
            <Icon name={ceremonyIcon(event)} className={skin.tagIcon} />
            Function {index + 1} of {total}
          </p>
          <p className={skin.status}>{badge}</p>
        </div>
      )}
      <h3
        className={`wrap-break-word ${skin.title} ${event.cancelled ? 'line-through opacity-70' : ''}`}
      >
        {event.title}
      </h3>
      {event.cancelled ? (
        <p className={`${skin.note} not-italic`}>This celebration has been cancelled.</p>
      ) : (
        <>
          <dl className={skin.details}>
            {theme === 'modern' ? (
              <>
                <div className="flex items-start gap-2">
                  <dt className="mt-0.5 w-14 shrink-0 font-mono text-[10px] text-minimal-muted uppercase">
                    When
                  </dt>
                  <dd className={skin.detailStrong}>
                    {day?.short ?? 'Date to be announced'}
                    {' · '}
                    <span>{time ?? 'Time to be announced'}</span>
                  </dd>
                </div>
                <div className="flex items-start gap-2">
                  <dt className="mt-0.5 w-14 shrink-0 font-mono text-[10px] text-minimal-muted uppercase">
                    Where
                  </dt>
                  <dd className={skin.detailText}>{venue ?? 'Venue to be announced'}</dd>
                </div>
                {event.dressCode && (
                  <div className="flex items-start gap-2">
                    <dt className="mt-0.5 w-14 shrink-0 font-mono text-[10px] text-minimal-muted uppercase">
                      Attire
                    </dt>
                    <dd className={skin.detailText}>{event.dressCode}</dd>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-start gap-2">
                  <dt>
                    <Icon name="schedule" className={`mt-0.5 shrink-0 ${skin.detailIcon}`} />
                    <span className="sr-only">When</span>
                  </dt>
                  <dd className={skin.detailStrong}>
                    {day?.short ?? 'Date to be announced'}
                    {' · '}
                    <span>{time ?? 'Time to be announced'}</span>
                  </dd>
                </div>
                <div className="flex items-start gap-2">
                  <dt>
                    <Icon name="location-on" className={`mt-0.5 shrink-0 ${skin.detailIcon}`} />
                    <span className="sr-only">Where</span>
                  </dt>
                  <dd className={skin.detailText}>{venue ?? 'Venue to be announced'}</dd>
                </div>
                {event.dressCode && (
                  <div className="flex items-start gap-2">
                    <dt>
                      <Icon name="checkroom" className={`mt-0.5 shrink-0 ${skin.detailIcon}`} />
                      <span className="sr-only">Attire</span>
                    </dt>
                    <dd className={skin.detailText}>Attire: {event.dressCode}</dd>
                  </div>
                )}
              </>
            )}
          </dl>
          {event.description && (
            <p className={`whitespace-pre-line ${skin.body}`}>{event.description}</p>
          )}
          {event.mapsUrl && (
            <p>
              <a
                href={event.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={skin.secondary}
              >
                <Icon name="location-on" className="size-4" />
                Get directions <span className="sr-only">to {event.title} (opens Google Maps)</span>
                <Icon name="arrow-outward" className="size-4" />
              </a>
            </p>
          )}
          {live && event.livestreamVideoId && (
            <div
              className={`overflow-hidden ${
                theme === 'royal'
                  ? 'rounded-xl border border-regal-gold/50 bg-regal-deep'
                  : theme === 'modern'
                    ? 'rounded-md bg-tertiary'
                    : 'rounded-xl bg-primary'
              }`}
            >
              <Livestream
                videoId={event.livestreamVideoId}
                title={event.title}
                className="aspect-[4/3] max-h-96 site-sm:aspect-video"
              >
                {theme === 'royal' && (
                  <span aria-hidden="true" className="absolute inset-0 bg-jali opacity-30" />
                )}
                <span className="relative flex size-full flex-col items-center justify-center gap-3 p-6 text-center">
                  <span
                    className={`flex size-14 shrink-0 items-center justify-center rounded-full shadow-lg transition-transform group-hover:scale-105 ${
                      theme === 'royal'
                        ? 'border-2 border-regal-gold bg-regal-ink text-regal-gold-light'
                        : theme === 'modern'
                          ? 'bg-white/10 text-white'
                          : 'bg-secondary text-on-secondary'
                    }`}
                  >
                    <Icon name="play-arrow" className="size-7 translate-x-0.5" />
                  </span>
                  <span
                    className={
                      theme === 'royal'
                        ? 'font-serif text-[1.5rem] text-regal-ivory'
                        : 'font-serif text-[1.375rem] text-white'
                    }
                  >
                    Watch the livestream
                  </span>
                </span>
              </Livestream>
              <p className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-white/10 px-5 py-3 text-label-sm text-white/85">
                <span className="flex items-center gap-1.5">
                  <Icon name="sensors" className="size-4" />
                  Streamed on YouTube{time ? ` · begins at ${time}` : ''}
                </span>
                <a
                  href={youtubeWatchUrl(event.livestreamVideoId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-white"
                >
                  Open in YouTube ↗
                </a>
              </p>
            </div>
          )}
        </>
      )}
    </li>
  );
}

/**
 * The wedding website in one of the three designs (decision 0017), laid
 * out in the visual language of the Stitch RSVP screens: a welcome card
 * with the couple's photo, quick facts, the story beside the days at a
 * glance, ceremony cards two to a row, the RSVP and the questions.
 */
export function ThemedSite({
  site,
  gallery = [],
}: {
  site: Site;
  /** Albums with approved photos; only the published website has them. */
  gallery?: readonly GalleryAlbum[];
}) {
  const theme = site.templateId;
  const skin = SITE_SKINS[theme];
  const sections = sectionsOf(site, gallery.length > 0);
  const photoCount = gallery.reduce((sum, album) => sum + album.photoCount, 0);
  const count = celebrationCount(site.events);
  const wide = fullRows(site.events);
  const days = celebrationDays(site.events);
  const anchors = new Map(days.map((day, index) => [day.firstIndex, dayAnchor(index + 1)]));
  return (
    <div
      data-rsvp-theme={theme}
      className={`@container/site flex flex-1 flex-col font-sans antialiased ${skin.page}`}
    >
      <Header site={site} skin={skin} sections={sections} />
      <main
        id="top"
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 pt-4 pb-12 site-sm:px-6 site-sm:pt-8"
      >
        <div className="flex flex-col gap-4 site-sm:gap-5">
          <Welcome site={site} skin={skin} />
          <QuickFacts site={site} skin={skin} />
          <Venue site={site} skin={skin} />
        </div>

        <Story site={site} skin={skin} />

        <section
          id={SECTION_ANCHORS.celebrations}
          aria-labelledby="site-celebrations"
          className="scroll-mt-24"
        >
          <SectionTitle
            skin={skin}
            overline={
              site.dateRange && site.dateRange.start !== site.dateRange.end
                ? 'Multi-day itinerary'
                : 'The itinerary'
            }
            title="The Celebrations"
            id="site-celebrations"
            aside={`${count === 1 ? '1 celebration' : `${count} celebrations`} · ${placeLabel(site)}`}
          />
          {days.length > 1 && (
            <nav
              aria-label="Jump to a day"
              className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] site-sm:-mx-6 site-sm:px-6 site-lg:hidden [&::-webkit-scrollbar]:hidden"
            >
              {days.map((day, index) => (
                <a
                  key={day.label}
                  href={`#${dayAnchor(index + 1)}`}
                  className={`shrink-0 whitespace-nowrap ${skin.secondary}`}
                >
                  Day {index + 1} · {day.chip}
                </a>
              ))}
            </nav>
          )}
          {site.events.length === 0 ? (
            <p className={`${skin.card} ${skin.body}`}>{NO_CELEBRATIONS}</p>
          ) : (
            <ol className="grid grid-cols-1 gap-4 site-md:grid-cols-2 site-lg:gap-5">
              {site.events.map((event, index) => (
                <Celebration
                  key={index}
                  event={event}
                  index={index}
                  total={site.events.length}
                  wide={wide[index] ?? false}
                  skin={skin}
                  theme={theme}
                  anchor={anchors.get(index)}
                />
              ))}
            </ol>
          )}
        </section>

        {gallery.length > 0 && (
          <section
            id={SECTION_ANCHORS.gallery}
            aria-labelledby="site-gallery"
            className="scroll-mt-24"
          >
            <SectionTitle
              skin={skin}
              overline="Moments shared by family & friends"
              title="Gallery"
              id="site-gallery"
              aside={photoCount === 1 ? '1 photo' : `${photoCount} photos`}
            />
            <SiteGallery slug={site.slug} albums={gallery} skin={skin} />
          </section>
        )}

        <section
          id={SECTION_ANCHORS.rsvp}
          aria-labelledby="site-rsvp"
          className="grid scroll-mt-24 grid-cols-1 items-start gap-4 site-lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)] site-lg:gap-6"
        >
          <div className={`flex flex-col gap-3 site-lg:sticky site-lg:top-24 ${skin.card}`}>
            <p className={skin.overline}>Kindly reply</p>
            <h2 id="site-rsvp" className={skin.heading}>
              RSVP
            </h2>
            <p className={skin.body}>
              Let the couple know who from your family is coming to each celebration. You can change
              your answers any time before the wedding.
            </p>
            <p className={`flex items-start gap-1.5 ${skin.privacy}`}>
              <Icon name="lock" className={`mt-0.5 shrink-0 ${skin.privacyIcon}`} />
              Your private invitation link keeps your answers yours.
            </p>
          </div>
          <SiteRsvp site={site} />
        </section>

        {site.faq.length > 0 && (
          <section id={SECTION_ANCHORS.faq} aria-labelledby="site-faq" className="scroll-mt-24">
            <SectionTitle
              skin={skin}
              overline="Frequently asked"
              title="Questions & Answers"
              id="site-faq"
            />
            <div className="grid grid-cols-1 items-start gap-4 site-md:grid-cols-2">
              {site.faq.map((item, index) => (
                <details key={index} open={index === 0} className={`group ${skin.card}`}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
                    <span className={`${skin.title} text-[1.125rem]`}>{item.question}</span>
                    <span
                      className={`flex size-8 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-open:rotate-180 ${skin.stepperButton}`}
                    >
                      <Icon name="expand-more" className="size-5" />
                    </span>
                  </summary>
                  <p className={`mt-3 whitespace-pre-line ${skin.body}`}>{item.answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="mx-auto w-full max-w-6xl px-4 pb-8 site-sm:px-6">
        <div
          className={`flex flex-col items-center justify-between gap-3 text-center site-sm:flex-row site-sm:text-left ${skin.footer}`}
        >
          <p
            className={`font-serif text-[1.375rem] italic ${theme === 'royal' ? 'text-regal-ivory' : theme === 'modern' ? 'text-minimal-text' : 'text-primary'}`}
          >
            With love, {site.coupleName}
          </p>
          <a
            href={routes.home}
            className={`text-label-sm tracking-widest uppercase ${theme === 'royal' ? 'text-regal-gold-light' : theme === 'modern' ? 'font-mono text-minimal-muted' : 'text-on-surface-variant'} hover:underline`}
          >
            Made with My Marriage
          </a>
        </div>
      </footer>

      {/* On a phone, replying is always one tap away. */}
      <div
        className={`sticky bottom-0 z-30 border-t border-black/5 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] site-sm:hidden ${skin.header}`}
      >
        <a href={`#${SECTION_ANCHORS.rsvp}`} className={`w-full ${skin.primary}`}>
          <Icon name="task-alt" className="size-4.5" />
          {RSVP_CTA}
        </a>
      </div>
    </div>
  );
}
