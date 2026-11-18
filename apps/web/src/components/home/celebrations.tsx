import { Icon } from '@/components/ui/icon';
import { container } from '@/components/ui/layout';
import { SectionHeading } from '@/components/ui/section-heading';
import { celebrations } from '@/content/home/copy';
import { ceremonies } from '@/content/home/sample-wedding';
import { CEREMONY_TONE } from './ceremony-tone';

export function Celebrations() {
  return (
    <section
      aria-labelledby="celebrations-title"
      className="w-full bg-surface-container-low py-20 md:py-28"
    >
      <div className={container}>
        <div className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading
            id="celebrations-title"
            eyebrow={celebrations.eyebrow}
            title={celebrations.title}
            accent={celebrations.accent}
          />
          <p className="max-w-md text-body-md text-on-surface-variant">{celebrations.intro}</p>
        </div>

        {/* Five across only from lg: at tablet width five columns are too narrow. */}
        <ul
          aria-label="Example ceremonies for a fictional five-day wedding"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
        >
          {ceremonies.map((ceremony) => {
            const highlighted = ceremony.tone === 'highlight';
            return (
              <li
                key={ceremony.name}
                className={`relative flex flex-col justify-between overflow-hidden rounded-lg p-6 ${
                  highlighted
                    ? 'bg-primary text-on-primary shadow-lg'
                    : 'bg-surface-container-lowest transition-shadow hover:shadow-md'
                }`}
              >
                {highlighted ? (
                  <div
                    className="pointer-events-none absolute -right-6 -bottom-6 size-28 rounded-full bg-primary-container/40"
                    aria-hidden="true"
                  />
                ) : null}
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <span
                      className={`size-3 rounded-full ring-4 ${CEREMONY_TONE[ceremony.tone].dot} ${CEREMONY_TONE[ceremony.tone].ring}`}
                      aria-hidden="true"
                    />
                    <span
                      className={`text-label-sm font-semibold ${highlighted ? 'text-on-primary-container' : 'text-on-surface-variant'}`}
                    >
                      {ceremony.day}
                    </span>
                  </div>
                  <h3
                    className={`mb-1 font-serif text-headline-sm ${highlighted ? 'text-on-primary' : 'text-on-surface'}`}
                  >
                    {ceremony.name}
                  </h3>
                  <p
                    className={`mb-4 text-body-sm ${highlighted ? 'text-secondary-fixed' : 'text-secondary'}`}
                  >
                    {ceremony.when}
                  </p>
                  <dl
                    className={`mb-6 space-y-2 text-body-sm ${highlighted ? 'text-on-primary' : 'text-on-surface-variant'}`}
                  >
                    <div className="flex items-center gap-2">
                      <dt>
                        <Icon name="location-on" label="Venue" className="text-base" />
                      </dt>
                      <dd>{ceremony.venue}</dd>
                    </div>
                    <div className="flex items-center gap-2">
                      <dt>
                        <Icon name="groups" label="Invited" className="text-base" />
                      </dt>
                      <dd>{ceremony.invitedPeople} people invited</dd>
                    </div>
                  </dl>
                </div>
                <div
                  className={`relative z-10 flex flex-col gap-1.5 border-t pt-4 ${highlighted ? 'border-primary-container' : 'border-surface-container'}`}
                >
                  <span
                    className={`text-label-sm font-semibold ${highlighted ? 'text-secondary-fixed' : 'text-primary'}`}
                  >
                    {ceremony.tasksDone === ceremony.tasksTotal
                      ? 'All tasks done'
                      : `${ceremony.tasksDone} of ${ceremony.tasksTotal} tasks done`}
                  </span>
                  <span
                    className={`text-[12px] ${highlighted ? 'text-on-primary-container' : 'text-on-surface-variant'}`}
                  >
                    Managed by {ceremony.managedBy}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
