import 'server-only';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/icon';
import type { Dashboard } from '@/lib/dashboard/dashboard';
import {
  clockTime,
  countdown,
  dayChip,
  paidSplit,
  plural,
  shortDay,
  teamLine,
  weddingWeek,
} from '@/lib/dashboard/format';
import { zonePlace } from '@/lib/events/format';
import { formatInr } from '@/lib/expenses/money';
import { formatBytes } from '@/lib/photos/format';
import {
  eventsPath,
  expensesPath,
  guestsPath,
  photosPath,
  publicSitePath,
  settingsPath,
  tasksPath,
  teamPath,
  websitePath,
  withNewForm,
  workspacePath,
} from '@/lib/routes';
import { dueLabel } from '@/lib/tasks/format';
import { displayTitle } from '@/lib/weddings/details';
import { longDate } from '@/lib/weddings/format';
import { managesTeam } from '@/lib/weddings/roles';

export const CARD =
  'rounded-2xl bg-surface-container-lowest shadow-xs ring-1 ring-outline-variant/30';
const LINK =
  'inline-flex min-h-11 items-center gap-1 text-label-md font-semibold text-primary hover:underline';
const INDIA = 'Asia/Kolkata';
/** Ceremonies the RSVP snapshot lists; the rest are on the Guests page. */
const RSVP_ROWS = 5;

type Wedding = Dashboard['wedding'];
type Ceremonies = NonNullable<Dashboard['ceremonies']>;
type Tasks = NonNullable<Dashboard['tasks']>;
type Expenses = NonNullable<Dashboard['expenses']>;
type Guests = NonNullable<Dashboard['guests']>;

/** A section that could not be loaded: said plainly, never shown as zero. */
export function SectionUnavailable({ title, weddingId }: { title: string; weddingId: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-surface-container-low p-4 text-body-sm text-on-surface-variant">
      <p className="flex items-center gap-2 font-semibold text-on-surface">
        <Icon name="error" className="size-4 shrink-0 text-error" />
        {title} unavailable
      </p>
      <p>We couldn’t load this just now. The rest of the overview is up to date.</p>
      <Link href={workspacePath(weddingId)} className={LINK}>
        Try again
        <Icon name="sync" className="size-4" />
      </Link>
    </div>
  );
}

function Panel({
  id,
  icon,
  title,
  subtitle,
  action,
  children,
}: {
  id: string;
  icon: IconName;
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={`${CARD} flex flex-col gap-5 p-5 sm:p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-on-surface">
            <Icon name={icon} className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 id={id} className="font-serif text-headline-sm text-on-surface">
              {title}
            </h2>
            {subtitle && <p className="text-body-sm text-on-surface-variant">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="flex flex-wrap items-center gap-x-4">{action}</div>}
      </div>
      {children}
    </section>
  );
}

function StatusChip({ status }: { status: Wedding['status'] }) {
  const [label, tone] =
    status === 'active'
      ? ['Active wedding', 'bg-primary-fixed/60 text-on-primary-fixed']
      : status === 'archived'
        ? ['Archived · read-only', 'bg-surface-container-highest text-on-surface-variant']
        : ['Deletion pending', 'bg-error-container text-on-error-container'];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-label-sm ${tone}`}
    >
      {status === 'active' && (
        <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
      )}
      {label}
    </span>
  );
}

/** Title, place and date, and the countdown to the main wedding day with its venue. */
export function Hero({
  dashboard,
  firstName,
}: {
  dashboard: Dashboard;
  firstName: string | undefined;
}) {
  const { wedding, today } = dashboard;
  const days = countdown(wedding.weddingDate, today);
  const week =
    wedding.status === 'active'
      ? weddingWeek(dashboard.ceremonies?.next[0]?.startDate, today)
      : undefined;
  const venue = wedding.mainVenue;

  return (
    <section
      aria-labelledby="overview-title"
      className={`${CARD} flex flex-col gap-6 p-5 sm:p-8 lg:flex-row lg:items-center lg:justify-between`}
    >
      <div className="flex min-w-0 flex-col gap-3">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-2 text-label-md text-on-surface-variant">
          <StatusChip status={wedding.status} />
          <span className="inline-flex items-center gap-1">
            <Icon name="location-on" className="size-4 shrink-0" />
            {wedding.city}, {wedding.state}
          </span>
          {wedding.weddingDate && (
            <span>
              {longDate(wedding.weddingDate)}{' '}
              <span className="text-on-surface-variant/80">(main wedding day)</span>
            </span>
          )}
        </p>
        <h1
          id="overview-title"
          className="font-serif text-headline-lg-mobile tracking-tight break-words text-on-surface sm:text-headline-lg"
        >
          {displayTitle(wedding)}
        </h1>
        <p className="text-body-lg text-on-surface-variant">
          {firstName ? `Welcome back, ${firstName}. ` : ''}
          {wedding.status === 'active'
            ? 'Here’s where your celebrations stand today.'
            : 'Everything stays readable here; nothing can be changed.'}
        </p>
        {week && (
          <p className="flex w-fit items-center gap-2 rounded-full bg-secondary-container px-3 py-1 text-label-md font-semibold text-on-secondary-container">
            <Icon name="celebration" className="size-4" />
            Wedding week · {week}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-4 rounded-2xl bg-surface-container-low p-4 lg:max-w-sm">
        {days.kind === 'ahead' || days.kind === 'past' ? (
          <p className="flex size-20 shrink-0 flex-col items-center justify-center rounded-xl bg-secondary-container text-on-secondary-container">
            <span className="font-serif text-headline-md leading-none">
              {new Intl.NumberFormat('en-IN').format(days.days)}
            </span>
            <span className="text-label-sm tracking-wider uppercase">
              {days.days === 1 ? 'day' : 'days'}
            </span>
          </p>
        ) : (
          <span className="flex size-20 shrink-0 items-center justify-center rounded-xl bg-secondary-container text-on-secondary-container">
            <Icon
              name={days.kind === 'today' ? 'celebration' : 'calendar-today'}
              className="size-8"
            />
          </span>
        )}
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-title-sm text-on-surface">
            {days.kind === 'ahead' && 'To the main wedding day'}
            {days.kind === 'today' && 'It’s your wedding day!'}
            {days.kind === 'past' && 'Since the main wedding day'}
            {days.kind === 'unset' && 'No wedding date yet'}
          </p>
          {venue?.name && <p className="text-body-sm text-on-surface">{venue.name}</p>}
          {venue?.address && (
            <p className="text-body-sm text-on-surface-variant">{venue.address}</p>
          )}
          {venue?.mapsUrl && (
            <a
              href={venue.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-1 text-label-md font-semibold text-secondary hover:underline"
            >
              Open in Maps
              <Icon name="open-in-new" className="size-4" />
            </a>
          )}
          {days.kind === 'unset' && wedding.status === 'active' && (
            <Link href={settingsPath(wedding.id)} className={LINK}>
              Set the date
              <Icon name="arrow-forward" className="size-4" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

/** Why the overview is read-only, and where an owner can still act. */
export function StatusBanner({ wedding }: { wedding: Wedding }) {
  if (wedding.status === 'active') return null;
  const deleting = wedding.status === 'deletion_pending';
  return (
    <section
      aria-labelledby="status-heading"
      className={`flex flex-col gap-3 rounded-2xl p-5 sm:flex-row sm:items-start ${
        deleting ? 'bg-error-container/40 ring-1 ring-error/30' : 'bg-surface-container-high'
      }`}
    >
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-container-lowest ${
          deleting ? 'text-error' : 'text-on-surface-variant'
        }`}
      >
        <Icon name={deleting ? 'warning' : 'lock'} className="size-5" />
      </span>
      <div className="min-w-0 flex-1 text-body-sm text-on-surface">
        <h2 id="status-heading" className="mb-1 text-title-sm text-on-surface">
          {deleting ? 'This wedding is waiting to be deleted' : 'This wedding is archived'}
        </h2>
        <p>
          {deleting
            ? 'The website, gallery and guest links are offline, and nothing can be changed. Nothing has been erased.'
            : `Planning is closed${wedding.archivedAt ? ` since ${longDate(wedding.archivedAt)}` : ''}. Everything stays readable.`}
        </p>
        <p className="mt-2 flex flex-wrap gap-x-5">
          {deleting ? (
            <Link href={settingsPath(wedding.id)} className={LINK}>
              {wedding.role === 'owner' ? 'Cancel the deletion request' : 'See the request'}
              <Icon name="arrow-forward" className="size-4" />
            </Link>
          ) : (
            wedding.role === 'owner' && (
              <>
                <Link href={websitePath(wedding.id)} className={LINK}>
                  Unpublish the website
                </Link>
                <Link href={photosPath(wedding.id)} className={LINK}>
                  Hide or delete photos
                </Link>
              </>
            )
          )}
        </p>
      </div>
    </section>
  );
}

function Stat({
  label,
  icon,
  href,
  children,
}: {
  label: string;
  icon: IconName;
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`${CARD} group flex min-w-0 flex-col gap-3 p-5 transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="text-label-sm font-semibold tracking-widest text-on-surface-variant uppercase">
          {label}
        </span>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant group-hover:text-primary">
          <Icon name={icon} className="size-4.5" />
        </span>
      </span>
      {children}
    </Link>
  );
}

function StatUnavailable() {
  return (
    <span className="flex flex-col gap-1">
      <span className="font-serif text-headline-sm text-on-surface-variant">Unavailable</span>
      <span className="text-body-sm text-on-surface-variant">Couldn’t load just now.</span>
    </span>
  );
}

/** The four headline numbers, each opening its page. */
export function StatCards({ dashboard }: { dashboard: Dashboard }) {
  const { wedding, ceremonies, tasks, expenses, guests, today } = dashboard;
  const next = ceremonies?.next[0];
  const split = expenses ? paidSplit(expenses.paidPaise, expenses.outstandingPaise) : undefined;
  const value = 'font-serif text-headline-md leading-tight break-words text-on-surface';
  const note = 'text-body-sm text-on-surface-variant';
  return (
    <section
      aria-label="At a glance"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <Stat label="Upcoming ceremonies" icon="event-upcoming" href={eventsPath(wedding.id)}>
        {ceremonies ? (
          <>
            <span className={value}>{plural(ceremonies.upcoming, 'ceremony', 'ceremonies')}</span>
            <span className={note}>
              {next
                ? `Next: ${next.title} · ${shortDay(next.startDate, today)}${next.startTime ? `, ${clockTime(next.startTime)}` : ''}`
                : ceremonies.undated > 0
                  ? `${plural(ceremonies.undated, 'ceremony', 'ceremonies')} without a date`
                  : 'None planned yet'}
            </span>
          </>
        ) : (
          <StatUnavailable />
        )}
      </Stat>

      <Stat
        label="Open tasks"
        icon="task-alt"
        href={
          tasks && tasks.overdue > 0
            ? tasksPath(wedding.id, new URLSearchParams({ view: 'overdue' }))
            : tasksPath(wedding.id)
        }
      >
        {tasks ? (
          <>
            <span className="flex flex-wrap items-center gap-2">
              <span className={value}>{plural(tasks.open, 'open task', 'open tasks')}</span>
              {tasks.overdue > 0 && (
                <span className="rounded-full bg-error-container px-2 py-0.5 text-label-sm font-semibold text-on-error-container">
                  {tasks.overdue} overdue
                </span>
              )}
            </span>
            <span className={note}>
              {tasks.dueSoon > 0
                ? `${tasks.dueSoon} due in the next 7 days`
                : tasks.open > 0
                  ? 'Nothing due in the next 7 days'
                  : 'Nothing to do yet'}
            </span>
          </>
        ) : (
          <StatUnavailable />
        )}
      </Stat>

      <Stat label="Recorded expenses" icon="currency-rupee" href={expensesPath(wedding.id)}>
        {expenses && split ? (
          <>
            <span className={value}>{formatInr(expenses.finalPaise)}</span>
            {expenses.count > 0 ? (
              <>
                <PaidBar split={split} />
                <span className="flex flex-wrap justify-between gap-x-3 text-label-sm text-on-surface-variant">
                  <span>{formatInr(expenses.paidPaise)} paid</span>
                  <span>{formatInr(expenses.outstandingPaise)} outstanding</span>
                </span>
              </>
            ) : (
              <span className={note}>No expenses recorded yet</span>
            )}
          </>
        ) : (
          <StatUnavailable />
        )}
      </Stat>

      <Stat label="Guest contacts" icon="groups" href={guestsPath(wedding.id)}>
        {guests ? (
          <>
            <span className={value}>{plural(guests.contacts, 'contact')}</span>
            <span className={note}>
              {plural(guests.invitedPeople, 'person', 'people')} invited across ceremonies
            </span>
          </>
        ) : (
          <StatUnavailable />
        )}
      </Stat>
    </section>
  );
}

function PaidBar({ split }: { split: { paid: number; due: number } }) {
  return (
    <span
      className="flex h-2 w-full overflow-hidden rounded-full bg-surface-container-high"
      aria-hidden="true"
    >
      <span className="h-full bg-primary" style={{ width: `${split.paid}%` }} />
      <span className="h-full bg-secondary-fixed-dim" style={{ width: `${split.due}%` }} />
    </span>
  );
}

/** Shortcuts to the existing forms; only while the wedding can change. */
export function QuickActions({ dashboard }: { dashboard: Dashboard }) {
  const { wedding, photos, website } = dashboard;
  if (wedding.status !== 'active') return null;
  const id = wedding.id;
  const chip =
    'inline-flex min-h-11 items-center gap-2 rounded-lg bg-surface-container-lowest px-4 text-label-md font-semibold text-on-surface shadow-xs ring-1 ring-outline-variant/40 transition-colors hover:bg-surface-container';
  return (
    <nav
      aria-label="Quick actions"
      className="flex flex-wrap items-center gap-2 rounded-2xl bg-surface-container-low p-3"
    >
      <span className="flex items-center gap-1.5 px-2 text-label-sm font-semibold tracking-widest text-on-surface-variant uppercase">
        <Icon name="rocket-launch" className="size-4" />
        Quick actions
      </span>
      <Link href={withNewForm(eventsPath(id))} className={chip}>
        <Icon name="add" className="size-4.5" />
        Add ceremony
      </Link>
      <Link href={withNewForm(tasksPath(id))} className={chip}>
        <Icon name="checklist" className="size-4.5" />
        Add task
      </Link>
      <Link href={withNewForm(expensesPath(id))} className={chip}>
        <Icon name="payments" className="size-4.5" />
        Add expense
      </Link>
      <Link href={withNewForm(guestsPath(id))} className={chip}>
        <Icon name="person-add" className="size-4.5" />
        Add guest
      </Link>
      {photos && photos.awaitingReview > 0 && (
        <Link
          href={photosPath(id, new URLSearchParams({ view: 'review' }))}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-secondary-container px-4 text-label-md font-semibold text-on-secondary-container transition-colors hover:bg-secondary-fixed"
        >
          <Icon name="photo-library" className="size-4.5" />
          Review photos ({photos.awaitingReview})
        </Link>
      )}
      {website?.published && (
        <a
          href={publicSitePath(website.slug)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-label-md font-semibold text-on-primary transition-colors hover:bg-primary-container"
        >
          <Icon name="open-in-new" className="size-4.5" />
          View public site
        </a>
      )}
    </nav>
  );
}

/** The next ceremonies, with their time, venue, attire and people confirmed. */
export function UpcomingCeremonies({ dashboard }: { dashboard: Dashboard }) {
  const { wedding, ceremonies } = dashboard;
  const id = wedding.id;
  return (
    <Panel
      id="ceremonies-heading"
      icon="temple-hindu"
      title="Upcoming celebrations"
      subtitle="The next ceremonies, soonest first"
      action={
        <Link href={eventsPath(id)} className={LINK}>
          View all events
          <Icon name="arrow-forward" className="size-4" />
        </Link>
      }
    >
      {!ceremonies ? (
        <SectionUnavailable title="Ceremonies" weddingId={id} />
      ) : ceremonies.next.length === 0 ? (
        <Empty
          text={
            ceremonies.undated > 0
              ? `No dated ceremonies to come. ${plural(ceremonies.undated, 'ceremony', 'ceremonies')} still ${ceremonies.undated === 1 ? 'needs' : 'need'} a date.`
              : 'No ceremonies to come.'
          }
          action={
            wedding.status === 'active'
              ? { href: withNewForm(eventsPath(id)), label: 'Add a ceremony' }
              : undefined
          }
        />
      ) : (
        <ol className="flex flex-col gap-3">
          {ceremonies.next.map((ceremony, index) => (
            <CeremonyRow
              key={ceremony.id}
              ceremony={ceremony}
              first={index === 0}
              mainDay={ceremony.startDate === wedding.weddingDate}
            />
          ))}
          {ceremonies.undated > 0 && (
            <li className="text-body-sm text-on-surface-variant">
              And {plural(ceremonies.undated, 'ceremony', 'ceremonies')} without a date yet.
            </li>
          )}
        </ol>
      )}
    </Panel>
  );
}

function CeremonyRow({
  ceremony,
  first,
  mainDay,
}: {
  ceremony: Ceremonies['next'][number];
  first: boolean;
  mainDay: boolean;
}) {
  const chip = dayChip(ceremony.startDate);
  return (
    <li className="flex items-start gap-4 rounded-xl bg-surface-container-low p-4">
      <p
        className={`flex size-14 shrink-0 flex-col items-center justify-center rounded-lg ${
          mainDay ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface'
        }`}
      >
        <span className="text-label-sm tracking-wider uppercase">{chip.month}</span>
        <span className="font-serif text-title-lg leading-none">{chip.day}</span>
      </p>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h3 className="flex flex-wrap items-center gap-2 text-title-md break-words text-on-surface">
          {ceremony.title}
          {first && (
            <span className="rounded-full bg-secondary-container px-2 py-0.5 text-label-sm text-on-secondary-container">
              Next up
            </span>
          )}
          {mainDay && (
            <span className="rounded-full bg-primary-fixed/60 px-2 py-0.5 text-label-sm text-on-primary-fixed">
              Main day
            </span>
          )}
        </h3>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-on-surface-variant">
          <span className="inline-flex items-center gap-1">
            <Icon name="schedule" className="size-4 shrink-0" />
            {ceremony.startTime ? clockTime(ceremony.startTime) : 'Time not set'}
            {ceremony.timeZone !== INDIA && ` · ${zonePlace(ceremony.timeZone)} time`}
          </span>
          <span className="inline-flex min-w-0 items-center gap-1">
            <Icon name="location-on" className="size-4 shrink-0" />
            <span className="break-words">{ceremony.venueName ?? 'Venue not set'}</span>
          </span>
        </p>
        {(ceremony.dressCode || ceremony.confirmedPeople !== undefined) && (
          <p className="flex flex-wrap items-center gap-2 text-label-sm">
            {ceremony.dressCode && (
              <span className="inline-flex items-center gap-1 rounded-md bg-surface-container-high px-2 py-1 text-on-surface-variant">
                <Icon name="checkroom" className="size-3.5 shrink-0" />
                Attire: {ceremony.dressCode}
              </span>
            )}
            {ceremony.confirmedPeople !== undefined && (
              <span className="font-semibold text-primary">
                {plural(ceremony.confirmedPeople, 'person', 'people')} confirmed
              </span>
            )}
          </p>
        )}
      </div>
    </li>
  );
}

/** Overdue and soon-due open tasks; each opens the Tasks page. */
export function AttentionTasks({ dashboard }: { dashboard: Dashboard }) {
  const { wedding, tasks, today } = dashboard;
  const id = wedding.id;
  return (
    <Panel
      id="tasks-heading"
      icon="notifications-active"
      title="Tasks needing attention"
      subtitle={
        tasks
          ? tasks.overdue > 0
            ? `${plural(tasks.overdue, 'task is', 'tasks are')} overdue`
            : 'Overdue first, then the soonest due'
          : undefined
      }
      action={
        <>
          {wedding.status === 'active' && (
            <Link href={withNewForm(tasksPath(id))} className={LINK}>
              <Icon name="add" className="size-4" />
              Add task
            </Link>
          )}
          <Link href={tasksPath(id)} className={LINK}>
            View all{tasks ? ` (${tasks.open})` : ''}
            <Icon name="arrow-forward" className="size-4" />
          </Link>
        </>
      }
    >
      {!tasks ? (
        <SectionUnavailable title="Tasks" weddingId={id} />
      ) : tasks.attention.length === 0 ? (
        <Empty text="No open tasks. You’re all caught up." />
      ) : (
        <ul className="flex flex-col gap-2">
          {tasks.attention.map((task) => (
            <TaskRow key={task.id} task={task} today={today} href={tasksPath(id)} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function TaskRow({
  task,
  today,
  href,
}: {
  task: Tasks['attention'][number];
  today: string;
  href: string;
}) {
  const due = dueLabel(task, today);
  const tone =
    due.tone === 'overdue'
      ? 'bg-error-container text-on-error-container'
      : due.tone === 'soon'
        ? 'bg-secondary-container text-on-secondary-container'
        : 'bg-surface-container-high text-on-surface-variant';
  return (
    <li>
      <Link
        href={href}
        className="flex flex-col gap-1.5 rounded-xl bg-surface-container-low p-4 transition-colors hover:bg-surface-container"
      >
        <span className="flex flex-wrap items-center justify-between gap-2">
          <span className="min-w-0 text-title-sm break-words text-on-surface">{task.title}</span>
          <span className={`rounded-full px-2 py-0.5 text-label-sm font-semibold ${tone}`}>
            {due.text}
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-on-surface-variant">
          <span>{task.event?.title ?? 'General'}</span>
          {task.priority === 'high' && (
            <span className="inline-flex items-center gap-1 font-semibold text-error">
              <Icon name="flag" className="size-3.5" />
              High priority
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Icon name="account-circle" className="size-4" />
            {task.assignee?.displayName ?? 'Unassigned'}
          </span>
        </span>
      </Link>
    </li>
  );
}

/** "About this wedding": the description from Settings, for the whole team. */
export function AboutWedding({ wedding }: { wedding: Wedding }) {
  if (!wedding.description) {
    if (wedding.status !== 'active' || !managesTeam(wedding.role)) return null;
    return (
      <section aria-labelledby="about-heading" className={`${CARD} flex flex-col gap-2 p-5`}>
        <h2 id="about-heading" className="text-title-md text-on-surface">
          About this wedding
        </h2>
        <p className="text-body-sm text-on-surface-variant">
          A few lines for your team: what the celebrations are, who is coming from where.
        </p>
        <Link href={settingsPath(wedding.id)} className={LINK}>
          Add a description
          <Icon name="arrow-forward" className="size-4" />
        </Link>
      </section>
    );
  }
  return (
    <section aria-labelledby="about-heading" className={`${CARD} flex flex-col gap-2 p-5`}>
      <h2 id="about-heading" className="flex items-center gap-2 text-title-md text-on-surface">
        <Icon name="info" className="size-5 text-secondary" />
        About this wedding
      </h2>
      <div className="flex flex-col gap-2 text-body-md break-words text-on-surface">
        {wedding.description.split(/\n{2,}/).map((paragraph, index) => (
          <p key={index} className="whitespace-pre-line">
            {paragraph}
          </p>
        ))}
      </div>
      <p className="text-label-sm text-on-surface-variant">Only your team sees this.</p>
    </section>
  );
}

/** What is recorded, paid and outstanding, and where most of it goes. */
export function ExpenseOverview({ dashboard }: { dashboard: Dashboard }) {
  const { wedding, expenses } = dashboard;
  const id = wedding.id;
  return (
    <Panel
      id="expenses-heading"
      icon="account-balance-wallet"
      title="Expense overview"
      action={
        <Link href={expensesPath(id)} className={LINK}>
          View expenses
          <Icon name="arrow-forward" className="size-4" />
        </Link>
      }
    >
      {!expenses ? (
        <SectionUnavailable title="Expenses" weddingId={id} />
      ) : expenses.count === 0 ? (
        <Empty
          text="No expenses recorded yet."
          action={
            wedding.status === 'active'
              ? { href: withNewForm(expensesPath(id)), label: 'Add an expense' }
              : undefined
          }
        />
      ) : (
        <ExpenseFigures expenses={expenses} />
      )}
    </Panel>
  );
}

function ExpenseFigures({ expenses }: { expenses: Expenses }) {
  const split = paidSplit(expenses.paidPaise, expenses.outstandingPaise);
  return (
    <>
      <div className="flex flex-col gap-3 rounded-xl bg-surface-container-low p-4">
        <p className="text-label-sm font-semibold tracking-widest text-on-surface-variant uppercase">
          Recorded expenses
        </p>
        <p className="font-serif text-headline-md break-words text-on-surface">
          {formatInr(expenses.finalPaise)}
        </p>
        <PaidBar split={split} />
        <dl className="grid grid-cols-2 gap-3 text-body-sm">
          <div>
            <dt className="flex items-center gap-1.5 text-on-surface-variant">
              <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
              Paid so far
            </dt>
            <dd className="font-semibold break-words text-on-surface">
              {formatInr(expenses.paidPaise)}
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-on-surface-variant">
              <span className="size-2 rounded-full bg-secondary-fixed-dim" aria-hidden="true" />
              Outstanding
            </dt>
            <dd className="font-semibold break-words text-on-surface">
              {formatInr(expenses.outstandingPaise)}
            </dd>
          </div>
        </dl>
        {expenses.overdue > 0 && (
          <p className="flex items-center gap-1.5 text-body-sm font-semibold text-error">
            <Icon name="warning" className="size-4" />
            {plural(expenses.overdue, 'payment')} past due
          </p>
        )}
      </div>
      {expenses.topCategories.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-label-sm font-semibold tracking-widest text-on-surface-variant uppercase">
            Top categories
          </h3>
          <ul className="flex flex-col gap-2">
            {expenses.topCategories.map((category) => (
              <li
                key={category.category}
                className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-low px-3 py-2 text-body-sm"
              >
                <span className="min-w-0 break-words text-on-surface">{category.category}</span>
                <span className="shrink-0 font-semibold text-on-surface">
                  {formatInr(category.finalPaise)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

/** Contacts and people invited, and each ceremony's answers. */
export function RsvpSnapshot({ dashboard }: { dashboard: Dashboard }) {
  const { wedding, guests } = dashboard;
  const id = wedding.id;
  return (
    <Panel
      id="guests-heading"
      icon="group"
      title="Guests & RSVP"
      action={
        <Link href={guestsPath(id)} className={LINK}>
          Manage list
          <Icon name="arrow-forward" className="size-4" />
        </Link>
      }
    >
      {!guests ? (
        <SectionUnavailable title="Guests" weddingId={id} />
      ) : guests.contacts === 0 ? (
        <Empty
          text="No guests yet. Add them one by one, or import a CSV file on the Guests page."
          action={
            wedding.status === 'active'
              ? { href: withNewForm(guestsPath(id)), label: 'Add a guest' }
              : undefined
          }
        />
      ) : (
        <RsvpFigures guests={guests} />
      )}
    </Panel>
  );
}

function RsvpFigures({ guests }: { guests: Guests }) {
  const invited = guests.events.filter((event) => event.invitedGuests > 0);
  const shown = invited.slice(0, RSVP_ROWS);
  return (
    <>
      <p className="text-body-md text-on-surface">
        <span className="font-semibold">{plural(guests.contacts, 'guest contact')}</span>{' '}
        representing{' '}
        <span className="font-semibold">{plural(guests.invitedPeople, 'person', 'people')}</span>{' '}
        invited.
      </p>
      {invited.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {shown.map((event) => (
            <li
              key={event.eventId}
              className="flex flex-col gap-1 rounded-xl bg-surface-container-low p-3"
            >
              <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-title-sm break-words text-on-surface">{event.title}</span>
                <span className="text-body-sm font-semibold text-primary">
                  {plural(event.confirmedPeople, 'person', 'people')} confirmed
                </span>
              </span>
              <span className="text-body-sm text-on-surface-variant">
                {event.pending} awaiting reply · {event.maybe} maybe · {event.notAttending} declined
              </span>
            </li>
          ))}
          {invited.length > shown.length && (
            <li className="text-body-sm text-on-surface-variant">
              And {plural(invited.length - shown.length, 'more ceremony', 'more ceremonies')} on the
              Guests page.
            </li>
          )}
        </ul>
      ) : (
        <p className="text-body-sm text-on-surface-variant">Nobody is invited to a ceremony yet.</p>
      )}
      <p className="flex items-start gap-2 rounded-lg bg-secondary-container/40 p-3 text-body-sm text-on-surface">
        <Icon name="info" className="mt-0.5 size-4 shrink-0 text-secondary" />
        <span>
          A family is one contact. Confirmed counts people attending each ceremony, never added
          across ceremonies; replies count invitations, one per contact.
        </span>
      </p>
    </>
  );
}

function Tile({
  icon,
  title,
  badge,
  children,
  link,
}: {
  icon: IconName;
  title: string;
  badge?: { label: string; tone: 'live' | 'warm' | 'muted' };
  children: ReactNode;
  link?: { href: string; label: string; external?: boolean };
}) {
  const tones = {
    live: 'bg-primary-fixed/60 text-on-primary-fixed',
    warm: 'bg-secondary-container text-on-secondary-container',
    muted: 'bg-surface-container-high text-on-surface-variant',
  } as const;
  return (
    <article className={`${CARD} flex flex-col gap-2 p-5`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-on-surface">
          <Icon name={icon} className="size-5" />
        </span>
        <h3 className="text-title-md text-on-surface">{title}</h3>
        {badge && (
          <span className={`rounded-full px-2.5 py-0.5 text-label-sm ${tones[badge.tone]}`}>
            {badge.label}
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-1 text-body-sm text-on-surface-variant">
        {children}
      </div>
      {link &&
        (link.external ? (
          <a
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1 text-label-md font-semibold text-secondary hover:underline"
          >
            {link.label}
            <Icon name="open-in-new" className="size-4" />
          </a>
        ) : (
          <Link href={link.href} className={LINK}>
            {link.label}
            <Icon name="arrow-forward" className="size-4" />
          </Link>
        ))}
    </article>
  );
}

/** Photos, the website and the team, each in a small tile. */
export function StatusTiles({ dashboard }: { dashboard: Dashboard }) {
  const { wedding, photos, website, team } = dashboard;
  const id = wedding.id;
  const offline = wedding.status === 'deletion_pending';
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Tile
        icon="photo-library"
        title="Photos & QR drive"
        {...(photos && photos.awaitingReview > 0
          ? { badge: { label: `${photos.awaitingReview} awaiting review`, tone: 'warm' as const } }
          : {})}
        link={
          photos && photos.awaitingReview > 0 && wedding.status === 'active'
            ? {
                href: photosPath(id, new URLSearchParams({ view: 'review' })),
                label: 'Review photos',
              }
            : { href: photosPath(id), label: 'Open photos' }
        }
      >
        {photos ? (
          <>
            <p className="font-semibold text-on-surface">
              {plural(photos.approved, 'approved photo')}
            </p>
            <p>
              {formatBytes(photos.usedBytes)} of {formatBytes(photos.limitBytes)} used
            </p>
          </>
        ) : (
          <p>Couldn’t load just now.</p>
        )}
      </Tile>

      <Tile
        icon="language"
        title="Wedding website"
        {...(website
          ? {
              badge: website.published
                ? { label: 'Published', tone: 'live' as const }
                : { label: offline ? 'Offline' : 'Draft', tone: 'muted' as const },
            }
          : {})}
        link={
          website?.published
            ? { href: publicSitePath(website.slug), label: 'View live site', external: true }
            : { href: websitePath(id), label: 'Open website builder' }
        }
      >
        {website ? (
          <>
            <p className="w-fit max-w-full truncate rounded-sm bg-surface-container-low px-2 py-1 font-mono text-on-surface">
              {publicSitePath(website.slug)}
            </p>
            <p>
              {website.published
                ? 'Guests can see your ceremonies and reply to invitations.'
                : offline
                  ? 'Offline while the wedding waits to be deleted.'
                  : 'Not published yet: only your team can preview it.'}
            </p>
            {website.published && (
              <Link href={websitePath(id)} className="font-semibold text-primary hover:underline">
                Open website builder
              </Link>
            )}
          </>
        ) : (
          <p>Couldn’t load just now.</p>
        )}
      </Tile>

      <Tile
        icon="supervisor-account"
        title="Family & planner team"
        {...(managesTeam(wedding.role)
          ? { link: { href: teamPath(id), label: 'Manage team' } }
          : {})}
      >
        {team ? (
          <p>
            {teamLine(team)}
            {team.pendingInvites !== undefined && team.pendingInvites > 0
              ? ` · ${plural(team.pendingInvites, 'pending invitation')}`
              : ''}
          </p>
        ) : (
          <p>Couldn’t load just now.</p>
        )}
      </Tile>
    </div>
  );
}

/** A brand-new wedding's first steps, each to an existing page. */
export function GettingStarted({ dashboard }: { dashboard: Dashboard }) {
  const { wedding, ceremonies, guests, team, website } = dashboard;
  const id = wedding.id;
  const steps: { done: boolean; title: string; text: string; href: string; label: string }[] = [
    {
      done: Boolean(ceremonies && ceremonies.upcoming + ceremonies.undated > 0),
      title: 'Add your ceremonies',
      text: 'Haldi, Mehendi, the wedding: each with its own day, time and venue.',
      href: withNewForm(eventsPath(id)),
      label: 'Add a ceremony',
    },
    {
      done: Boolean(wedding.weddingDate),
      title: 'Set the wedding date',
      text: 'The main day your countdown counts to.',
      href: settingsPath(id),
      label: 'Open settings',
    },
    {
      done: Boolean(guests && guests.contacts > 0),
      title: 'Add your guests',
      text: 'One by one, or import a CSV file on the Guests page.',
      href: withNewForm(guestsPath(id)),
      label: 'Add a guest',
    },
    ...(managesTeam(wedding.role)
      ? [
          {
            done: Boolean(team && team.owners + team.admins + team.managers > 1),
            title: 'Invite your partner or family',
            text: 'Plan together: everyone sees the same wedding.',
            href: teamPath(id),
            label: 'Invite someone',
          },
        ]
      : []),
    {
      done: Boolean(website?.published),
      title: 'Set up your website',
      text: 'Choose a design and publish when you’re ready for guests.',
      href: websitePath(id),
      label: 'Open website builder',
    },
  ];
  return (
    <section aria-labelledby="start-heading" className={`${CARD} flex flex-col gap-5 p-5 sm:p-8`}>
      <div>
        <h2 id="start-heading" className="font-serif text-headline-sm text-on-surface">
          Begin planning your wedding
        </h2>
        <p className="text-body-md text-on-surface-variant">
          A few first steps. This overview fills in as you go.
        </p>
      </div>
      <ol className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className="flex flex-col gap-2 rounded-xl bg-surface-container-low p-4"
          >
            <p className="flex items-center gap-2 text-title-sm text-on-surface">
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-full text-label-md ${
                  step.done
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-highest text-on-surface'
                }`}
              >
                {step.done ? <Icon name="check" className="size-4" /> : index + 1}
              </span>
              {step.title}
              {step.done && <span className="sr-only">(done)</span>}
            </p>
            <p className="text-body-sm text-on-surface-variant">{step.text}</p>
            {!step.done && (
              <Link href={step.href} className={LINK}>
                {step.label}
                <Icon name="arrow-forward" className="size-4" />
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

function Empty({
  text,
  action,
}: {
  text: string;
  action?: { href: string; label: string } | undefined;
}) {
  return (
    <div className="flex flex-col items-start gap-1 rounded-xl bg-surface-container-low p-4 text-body-sm text-on-surface-variant">
      <p>{text}</p>
      {action && (
        <Link href={action.href} className={LINK}>
          {action.label}
          <Icon name="arrow-forward" className="size-4" />
        </Link>
      )}
    </div>
  );
}
