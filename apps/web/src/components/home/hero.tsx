import type { ReactNode } from 'react';
import { ButtonLink } from '@/components/ui/button-link';
import { Icon } from '@/components/ui/icon';
import { container } from '@/components/ui/layout';
import { hero } from '@/content/home/copy';
import { ceremonies, couple, dashboard, recentReply } from '@/content/home/sample-wedding';
import { homeSection, homeSections, publicWeddingUrl, routes } from '@/lib/routes';
import { CEREMONY_TONE } from './ceremony-tone';

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className={`${container} pt-10 pb-20 md:pt-16 md:pb-28`}>
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
        <div className="flex flex-col items-start lg:col-span-5">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full bg-secondary-container/40 px-3 py-1 text-label-sm font-semibold tracking-widest text-secondary uppercase">
            <span className="size-1.5 rounded-full bg-secondary" aria-hidden="true" />
            {hero.eyebrow}
          </p>
          <h1
            id="hero-title"
            className="mb-6 font-serif text-display-lg-mobile tracking-tight text-on-surface md:text-display-lg"
          >
            {hero.title}
            <br />
            <span className="text-primary italic">{hero.accent}</span>
          </h1>
          <p className="mb-8 max-w-lg text-body-lg text-on-surface-variant">{hero.intro}</p>
          <div className="mb-5 flex flex-wrap items-center gap-4">
            <ButtonLink href={routes.login}>{hero.primaryCta}</ButtonLink>
            <ButtonLink href={homeSection(homeSections.howItWorks)} variant="secondary">
              {hero.secondaryCta}
            </ButtonLink>
          </div>
          <p className="flex items-center gap-2 text-body-sm text-on-surface-variant">
            <Icon name="check-circle" className="text-lg text-secondary" />
            {hero.reassurance}
          </p>
        </div>

        <div className="relative lg:col-span-7">
          <div
            className="pointer-events-none absolute -top-10 -right-10 -z-10 size-96 rounded-full bg-secondary-container/30 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-8 -left-8 -z-10 size-80 rounded-full bg-primary-fixed/20 blur-3xl"
            aria-hidden="true"
          />
          <DashboardMockup />
          {/* Sits over empty space at the bottom of the mock-up (see its
              bottom padding); in the Stitch design it covered the guest row. */}
          <div
            className="absolute -bottom-6 -left-6 z-20 hidden max-w-xs items-center gap-3 rounded-md bg-surface-container-lowest p-4 shadow-lg sm:flex"
            aria-hidden="true"
          >
            <div className="flex size-11 items-center justify-center rounded-base bg-surface-container text-[22px] text-secondary">
              <Icon name="language" />
            </div>
            <div className="min-w-0">
              <div className="text-label-sm tracking-wider text-on-surface-variant uppercase">
                Live wedding site
              </div>
              <div className="truncate text-title-sm font-semibold text-primary">
                {publicWeddingUrl(couple.slug)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Illustration only: a static picture of the planning dashboard. */
function DashboardMockup() {
  const featured = ceremonies.find((c) => c.name === dashboard.featuredCeremony);
  return (
    <div
      role="img"
      aria-label={`Example planning dashboard for a fictional wedding, ${couple.names}, showing tasks, RSVPs, expenses and five ceremonies.`}
      className="w-full overflow-hidden rounded-lg bg-surface-container-lowest shadow-xl"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 bg-surface-container-low px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-md bg-primary font-serif text-sm text-on-primary italic">
            {couple.initials}
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-title-sm font-semibold text-on-surface">
              {couple.names}
              <span className="inline-block size-1.5 rounded-full bg-secondary" />
            </div>
            <div className="flex items-center gap-1 text-body-sm text-on-surface-variant">
              <Icon name="pin-drop" className="text-sm" />
              {couple.city} · {couple.dates}
            </div>
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-base bg-surface-container-highest px-3 py-1.5 text-label-md font-semibold text-secondary">
          <Icon name="hourglass-top" className="text-base" />
          {couple.daysToGo} days to go
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-hidden bg-surface-container px-6 py-3">
        {['Timeline', 'Guests & RSVP', 'Expenses', 'Website'].map((label, index) => (
          <span
            key={label}
            className={`shrink-0 rounded-base px-3 py-1 text-label-sm ${
              index === 0
                ? 'bg-surface-container-lowest font-semibold text-on-surface shadow-xs'
                : 'text-on-surface-variant'
            }`}
          >
            {label}
          </span>
        ))}
      </div>

      <div className="flex flex-col gap-6 p-6 sm:pb-16">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Metric label="Tasks">
            <div className="mt-2">
              <span className="font-serif text-headline-sm text-on-surface">
                {dashboard.tasksDone}
              </span>
              <span className="text-body-sm text-on-surface-variant">
                {' '}
                of {dashboard.tasksTotal} done
              </span>
            </div>
            <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-highest">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${(dashboard.tasksDone / dashboard.tasksTotal) * 100}%` }}
              />
            </div>
          </Metric>
          <Metric label={`${dashboard.featuredCeremony} · people`}>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-serif text-headline-sm text-primary">
                {featured?.confirmedPeople}
              </span>
              <span className="text-label-sm text-on-surface-variant">
                of {featured?.invitedPeople} coming
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1 text-label-sm font-semibold text-secondary">
              <Icon name="done-all" className="text-sm" />
              {dashboard.contactsRepliedPercent}% of families replied
            </div>
          </Metric>
          <Metric label="Expenses recorded" className="col-span-2 sm:col-span-1">
            <div className="mt-2 font-serif text-headline-sm text-on-surface">
              {dashboard.recordedExpenses}
            </div>
            <span className="mt-1 text-body-sm text-secondary">
              {dashboard.outstanding} outstanding
            </span>
          </Metric>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-title-sm font-semibold text-on-surface">Ceremonies</span>
            <span className="text-label-sm font-semibold text-secondary">
              {ceremonies.length} scheduled
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
            {ceremonies.map((ceremony, index) => {
              const highlighted = ceremony.tone === 'highlight';
              const last = index === ceremonies.length - 1;
              return (
                <div
                  key={ceremony.name}
                  className={`rounded-base p-3 ${
                    highlighted ? 'bg-primary-container text-on-primary' : 'bg-surface-container'
                  } ${last ? 'col-span-2 sm:col-span-1' : ''}`}
                >
                  <div className="mb-1 flex items-center gap-1.5">
                    <span className={`size-2 rounded-full ${CEREMONY_TONE[ceremony.tone].dot}`} />
                    <span
                      className={`text-label-sm font-semibold ${highlighted ? 'text-on-primary' : 'text-on-surface'}`}
                    >
                      {ceremony.name}
                    </span>
                  </div>
                  <span
                    className={`block text-[11px] ${highlighted ? 'text-on-primary-container' : 'text-on-surface-variant'}`}
                  >
                    {ceremony.shortDate} · {ceremony.shortVenue}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col justify-between gap-3 rounded-md bg-surface-container-low p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-secondary-container text-sm font-bold text-on-secondary-container">
              {recentReply.initials}
            </div>
            <div>
              <div className="text-title-sm font-semibold text-on-surface">
                {recentReply.household}
              </div>
              <div className="text-body-sm text-on-surface-variant">
                {recentReply.attending} attending · {recentReply.ceremonies}
              </div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-primary/10 px-3 py-1 text-label-sm font-semibold text-primary sm:self-auto">
            <Icon name="check" className="text-sm" /> RSVP received
          </span>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  className = '',
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`flex flex-col justify-between rounded-md bg-surface-container-low p-4 ${className}`}
    >
      <span className="text-label-sm tracking-wider text-on-surface-variant uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}
