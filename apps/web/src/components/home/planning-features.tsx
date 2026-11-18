import { Icon, type IconName } from '@/components/ui/icon';
import { container } from '@/components/ui/layout';
import { SectionHeading } from '@/components/ui/section-heading';
import { planningFeatures } from '@/content/home/copy';
import {
  ceremonies,
  expenses,
  sampleHousehold,
  taskColumns,
  tasks,
  team,
  type SampleTask,
  type TaskState,
} from '@/content/home/sample-wedding';
import { formatRupees } from '@/lib/format';
import { homeSections } from '@/lib/routes';
import { PreviewTabs } from './preview-tabs';

export function PlanningFeatures() {
  return (
    <section
      id={homeSections.features}
      aria-labelledby="features-title"
      className={`${container} py-20 md:py-28`}
    >
      <SectionHeading
        id="features-title"
        align="center"
        eyebrow={planningFeatures.eyebrow}
        title={planningFeatures.title}
        accent={planningFeatures.accent}
        intro={planningFeatures.intro}
        className="mb-12"
      />

      <div className="overflow-hidden rounded-lg bg-surface-container-lowest shadow-lg">
        <PreviewTabs
          aside={
            <span className="mb-2 hidden rounded-sm bg-secondary-container px-2.5 py-1 text-label-sm font-semibold text-on-secondary-container lg:inline">
              {team.owners} owners · {team.managers} managers
            </span>
          }
          tabs={[
            { id: 'tasks', label: planningFeatures.tabs.tasks, panel: <TaskBoard /> },
            { id: 'expenses', label: planningFeatures.tabs.expenses, panel: <ExpensesPreview /> },
            { id: 'guests', label: planningFeatures.tabs.guests, panel: <GuestsPreview /> },
          ]}
        />
        <ul className="flex flex-wrap items-center justify-around gap-4 border-t border-surface-container bg-surface-container-low px-6 py-4 text-label-md text-on-surface-variant">
          {planningFeatures.highlights.map((item) => (
            <li key={item.label} className="flex items-center gap-2">
              <Icon name={item.icon} className="text-lg text-primary" />
              {item.label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const TASK_ICON_COLOUR: Record<SampleTask['icon'], string> = {
  flag: 'text-on-surface-variant',
  sync: 'text-primary',
  payments: 'text-secondary',
  'flight-land': 'text-on-surface-variant',
  'check-circle': 'text-primary',
};

const COLUMN_DOT: Record<TaskState, string> = {
  todo: 'bg-secondary',
  in_progress: 'bg-primary',
  completed: 'bg-outline',
};

const AVATAR: Record<NonNullable<SampleTask['assignee']>['tone'], string> = {
  primary: 'bg-primary text-on-primary',
  secondary: 'bg-secondary text-on-secondary',
  neutral: 'bg-surface-variant text-on-surface-variant',
};

function TaskBoard() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {taskColumns.map((column) => (
        <div key={column.state} className="flex flex-col gap-3.5">
          <h3 className="flex items-center gap-2 px-1 text-label-md font-semibold text-on-surface">
            <span
              className={`size-2 rounded-full ${COLUMN_DOT[column.state]}`}
              aria-hidden="true"
            />
            {column.label} ({column.count})
          </h3>
          <ul className="flex flex-col gap-3.5">
            {tasks
              .filter((task) => task.state === column.state)
              .map((task) => (
                <TaskCard key={task.title} task={task} />
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function TaskCard({ task }: { task: SampleTask }) {
  const done = task.state === 'completed';
  return (
    // Done is shown by the strike-through and check icon, not by fading:
    // fading drops the small labels below 4.5:1 contrast.
    <li className="rounded-md bg-surface-container-low p-4 shadow-xs">
      <div className="mb-2 flex items-center justify-between">
        <span className="rounded-sm bg-surface-container-highest px-2 py-0.5 text-[11px] font-semibold text-secondary">
          {task.ceremony}
        </span>
        <Icon name={task.icon} className={`text-base ${TASK_ICON_COLOUR[task.icon]}`} />
      </div>
      <p
        className={`mb-1.5 text-title-sm font-semibold text-on-surface ${done ? 'line-through' : ''}`}
      >
        {done ? <span className="sr-only">Completed: </span> : null}
        {task.title}
      </p>
      <p className="mb-3 text-body-sm text-on-surface-variant">{task.detail}</p>
      <div className="flex items-center justify-between text-body-sm">
        <span className="text-label-sm font-semibold text-primary">{task.meta}</span>
        {task.assignee ? (
          <span className="flex items-center gap-1">
            <span
              className={`flex size-6 items-center justify-center rounded-full text-[10px] font-bold ${AVATAR[task.assignee.tone]}`}
              aria-hidden="true"
            >
              {task.assignee.initials}
            </span>
            <span className="text-on-surface-variant">{task.assignee.name}</span>
          </span>
        ) : null}
      </div>
    </li>
  );
}

function ExpensesPreview() {
  return (
    <div className="flex flex-col gap-3.5">
      <ul className="flex flex-col gap-3.5">
        {expenses.map((expense) => {
          const outstanding = expense.totalRupees - expense.paidRupees;
          const paidShare = (expense.paidRupees / expense.totalRupees) * 100;
          return (
            <li
              key={expense.title}
              className="grid grid-cols-1 gap-3 rounded-md bg-surface-container-low p-4 md:grid-cols-[1fr_auto] md:items-center"
            >
              <div>
                <p className="text-title-sm font-semibold text-on-surface">{expense.title}</p>
                <p className="text-body-sm text-on-surface-variant">
                  {expense.vendor} · {expense.ceremonies}
                </p>
                <div className="mt-2.5 h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-surface-container-highest">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${paidShare}%` }}
                  />
                </div>
              </div>
              <dl className="grid grid-cols-3 gap-4 text-body-sm md:text-right">
                <Amount label="Total" value={formatRupees(expense.totalRupees)} />
                <Amount label="Paid" value={formatRupees(expense.paidRupees)} />
                <Amount
                  label="Outstanding"
                  value={outstanding === 0 ? 'Paid in full' : formatRupees(outstanding)}
                  emphasis={outstanding > 0}
                />
              </dl>
            </li>
          );
        })}
      </ul>
      <p className="px-1 text-body-sm text-on-surface-variant">
        One vendor can be linked to several ceremonies, and every payment is kept in the history.
      </p>
    </div>
  );
}

function Amount({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div>
      <dt className="text-label-sm tracking-wider text-on-surface-variant uppercase">{label}</dt>
      <dd
        className={`mt-1 font-semibold tabular-nums ${emphasis ? 'text-secondary' : 'text-on-surface'}`}
      >
        {value}
      </dd>
    </div>
  );
}

const RSVP_LABEL = {
  attending: 'Attending',
  not_attending: 'Not attending',
  maybe: 'Maybe',
  pending: 'No reply yet',
} as const;

function GuestsPreview() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
      {/* Scrolls sideways on narrow screens; focusable so keyboard users can scroll it. */}
      <div
        className="overflow-x-auto rounded-base"
        role="region"
        aria-label="Guests by ceremony"
        tabIndex={0}
      >
        <table className="w-full min-w-[28rem] text-left text-body-sm">
          <caption className="sr-only">People invited and confirmed for each ceremony</caption>
          <thead>
            <tr className="bg-surface-container-low text-label-sm tracking-wider text-on-surface-variant uppercase">
              <th scope="col" className="rounded-l-base px-3 py-2.5 font-semibold">
                Ceremony
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                People invited
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                People coming
              </th>
              <th scope="col" className="rounded-r-base px-3 py-2.5 text-right font-semibold">
                Families yet to reply
              </th>
            </tr>
          </thead>
          <tbody>
            {ceremonies.map((ceremony) => (
              <tr key={ceremony.name} className="border-b border-surface-container last:border-0">
                <th scope="row" className="px-3 py-3 font-semibold text-on-surface">
                  {ceremony.name}
                </th>
                <td className="px-3 py-3 text-right text-on-surface-variant tabular-nums">
                  {ceremony.invitedPeople}
                </td>
                <td className="px-3 py-3 text-right font-semibold text-primary tabular-nums">
                  {ceremony.confirmedPeople}
                </td>
                <td className="px-3 py-3 text-right text-on-surface-variant tabular-nums">
                  {ceremony.pendingContacts}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-md bg-surface-container-low p-5">
        <p className="text-label-sm tracking-wider text-on-surface-variant uppercase">
          One household, one invitation
        </p>
        <p className="mt-2 text-title-sm font-semibold text-on-surface">
          {sampleHousehold.name} · party of {sampleHousehold.partySize}
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {sampleHousehold.invitations.map((invitation) => (
            <HouseholdRow
              key={invitation.ceremony}
              ceremony={invitation.ceremony}
              icon="check"
              status={`${RSVP_LABEL[invitation.status]} · ${invitation.attending} of ${sampleHousehold.partySize}`}
            />
          ))}
          {sampleHousehold.notInvited.map((ceremony) => (
            <HouseholdRow key={ceremony} ceremony={ceremony} status="Not invited" muted />
          ))}
        </ul>
        <p className="mt-3 text-body-sm text-on-surface-variant">
          The party size is set once; each ceremony gets its own reply.
        </p>
      </div>
    </div>
  );
}

function HouseholdRow({
  ceremony,
  status,
  icon,
  muted,
}: {
  ceremony: string;
  status: string;
  icon?: IconName;
  muted?: boolean;
}) {
  return (
    <li className="flex items-center justify-between rounded-base bg-surface-container-lowest px-3 py-2 text-body-sm">
      <span className={muted ? 'text-on-surface-variant' : 'font-semibold text-on-surface'}>
        {ceremony}
      </span>
      <span
        className={`flex items-center gap-1 ${muted ? 'text-on-surface-variant' : 'font-semibold text-primary'}`}
      >
        {icon ? <Icon name={icon} className="text-sm" /> : null}
        {status}
      </span>
    </li>
  );
}
