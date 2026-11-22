'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Icon } from '@/components/ui/icon';
import { api } from '@/lib/api/browser';
import { networkFailure, toFailure } from '@/lib/api/errors';
import { partOfDay } from '@/lib/events/format';
import type { GuestView } from '@/lib/guests/guests';
import { RSVP_SKINS, type RsvpSkin } from './rsvp-theme';

type ViewEvent = GuestView['events'][number];
type Choice = 'attending' | 'not_attending' | 'maybe';
type Theme = GuestView['templateId'];

// The designs' words (Stitch "Private Guest RSVP"): Decline and Tentative
// are the guest's words for "not attending" and "maybe".
const CHOICES: { value: Choice; label: string; icon: 'check-circle' | 'cancel' | 'help' }[] = [
  { value: 'attending', label: 'Attending', icon: 'check-circle' },
  { value: 'not_attending', label: 'Decline', icon: 'cancel' },
  { value: 'maybe', label: 'Tentative', icon: 'help' },
];

/** The saved answer, for the badge on each ceremony. */
function statusLabel(answer: Answer | undefined, partySize: number, theme: Theme): string {
  switch (answer?.status) {
    case 'attending':
      return theme === 'modern'
        ? `Attending · ${answer.count} of ${partySize}`
        : `Attending (${answer.count})`;
    case 'not_attending':
      return 'Declined';
    case 'maybe':
      return 'Tentative';
    default:
      return 'Awaiting reply';
  }
}

/** The small picture on a ceremony's tag, by the time of day it starts. */
function tagIcon(event: ViewEvent): 'wb-sunny' | 'local-fire-department' | 'celebration' {
  const part = partOfDay(event.startTime);
  if (part === 'Morning' || part === 'Afternoon') return 'wb-sunny';
  if (part) return 'local-fire-department';
  return 'celebration';
}

interface Answer {
  status: Choice | 'pending';
  count: number;
  version: number;
}

function answerOf(event: ViewEvent, partySize: number): Answer {
  return {
    status: event.rsvp.status,
    // A sensible start: their last count, or the whole family.
    count:
      event.rsvp.attendingCount && event.rsvp.attendingCount > 0
        ? event.rsvp.attendingCount
        : partySize,
    version: event.rsvp.responseVersion,
  };
}

type Notice =
  | { kind: 'saved' }
  | { kind: 'changed' }
  | { kind: 'failed'; message: string }
  | { kind: 'closed' };

/**
 * The guest's answers, one per invited ceremony (PRD INV-03, INV-04):
 * Attending with how many (1 to the party size), Not attending, or Maybe
 * (not counted as confirmed). Answers can change any time while the
 * wedding is active. A save that meets a newer answer stops and asks to
 * refresh; nothing is overwritten silently.
 */
export function RsvpForm({
  view,
  when,
}: {
  view: GuestView;
  when: (event: ViewEvent) => string | undefined;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, Answer>>(() =>
    Object.fromEntries(
      view.events.map((event) => [event.invitationId, answerOf(event, view.partySize)]),
    ),
  );
  const [saved, setSaved] = useState<Record<string, Answer>>(answers);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const [pending, setPending] = useState(false);
  const writable = view.writable;
  const theme = view.templateId;
  const skin = RSVP_SKINS[theme];
  const firstName = view.guestName.trim().split(/\s+/)[0] ?? view.guestName;

  function set(id: string, change: Partial<Answer>) {
    setAnswers((current) => {
      const before = current[id];
      return before ? { ...current, [id]: { ...before, ...change } } : current;
    });
    setErrors((current) =>
      Object.fromEntries(Object.entries(current).filter(([key]) => key !== id)),
    );
    if (notice?.kind === 'saved') setNotice(null);
  }

  // Ceremonies that can still be answered; "All celebrations" acts on these.
  const open = writable ? view.events.filter((event) => !event.cancelled) : [];
  const openAnswers = open
    .map((event) => answers[event.invitationId])
    .filter((answer): answer is Answer => Boolean(answer));
  const shared = new Set(openAnswers.map((answer) => answer.status)).size === 1;
  const allStatus = shared ? openAnswers[0]?.status : undefined;
  const sameCount = new Set(openAnswers.map((answer) => answer.count)).size === 1;
  const allCount = Math.max(0, ...openAnswers.map((answer) => answer.count));

  function setAll(change: Partial<Answer>) {
    setAnswers((current) => {
      const next = { ...current };
      for (const event of open) {
        const before = next[event.invitationId];
        if (before) next[event.invitationId] = { ...before, ...change };
      }
      return next;
    });
    setErrors({});
    if (notice?.kind === 'saved') setNotice(null);
  }

  const changed = view.events.filter((event) => {
    const now = answers[event.invitationId];
    const was = saved[event.invitationId];
    return (
      !event.cancelled &&
      now &&
      was &&
      now.status !== 'pending' &&
      (now.status !== was.status || (now.status === 'attending' && now.count !== was.count))
    );
  });
  const answeredAll = view.events.every(
    (event) => event.cancelled || saved[event.invitationId]?.status !== 'pending',
  );

  async function submit(submitted: FormEvent<HTMLFormElement>) {
    submitted.preventDefault();
    if (pending || changed.length === 0) return;
    const problems: Record<string, string> = {};
    for (const event of changed) {
      const answer = answers[event.invitationId];
      if (answer?.status === 'attending' && (answer.count < 1 || answer.count > view.partySize)) {
        problems[event.invitationId] =
          `Choose how many people will attend (1 to ${view.partySize}).`;
      }
    }
    setErrors(problems);
    if (Object.keys(problems).length > 0) return;

    setPending(true);
    setNotice(null);
    try {
      // One ceremony at a time; each is its own answer.
      for (const event of changed) {
        const answer = answers[event.invitationId];
        if (!answer || answer.status === 'pending') continue;
        const { data, error, response } = await api.PATCH(
          '/api/v1/guest-access/events/{invitationId}/rsvp',
          {
            params: { path: { invitationId: event.invitationId } },
            body: {
              status: answer.status,
              ...(answer.status === 'attending' ? { attendingCount: answer.count } : {}),
              responseVersion: saved[event.invitationId]?.version ?? answer.version,
            },
          },
        );
        if (data) {
          const next = { ...answer, version: data.data.rsvp.responseVersion };
          setSaved((current) => ({ ...current, [event.invitationId]: next }));
          setAnswers((current) => ({ ...current, [event.invitationId]: next }));
          continue;
        }
        const failure = toFailure(response.status, error);
        if (failure.code === 'RSVP_VERSION_CONFLICT') setNotice({ kind: 'changed' });
        else if (failure.code === 'WEDDING_ARCHIVED' || failure.code === 'RSVP_CLOSED') {
          setNotice({ kind: 'closed' });
          router.refresh();
        } else if (response.status === 401 || response.status === 404) {
          router.refresh();
          setNotice({ kind: 'failed', message: failure.message });
        } else if (failure.fields.attendingCount) {
          setErrors({ [event.invitationId]: failure.fields.attendingCount });
        } else
          setNotice({ kind: 'failed', message: 'We couldn’t save your RSVP. Please try again.' });
        setPending(false);
        return;
      }
      setNotice({ kind: 'saved' });
    } catch {
      setNotice({ kind: 'failed', message: networkFailure().message });
    }
    setPending(false);
  }

  const counter = (
    id: string,
    answer: Pick<Answer, 'count'>,
    onChange: (n: number) => void,
    uniform = true,
  ) => (
    <Counter
      id={id}
      count={uniform ? answer.count : undefined}
      base={answer.count}
      partySize={view.partySize}
      firstName={firstName}
      onChange={onChange}
      skin={skin}
      theme={theme}
    />
  );

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      {!writable && (
        <p role="status" className={`${skin.note} not-italic`}>
          RSVPs for this wedding are closed. Your answers are shown below.
        </p>
      )}

      {open.length > 1 && (
        <section aria-labelledby="rsvp-all-title" className={`flex flex-col gap-3 ${skin.card}`}>
          <div className={theme === 'modern' ? 'border-b border-minimal-line-soft pb-2.5' : ''}>
            <p className={skin.tag}>
              <Icon name="done-all" className={skin.tagIcon} />
              {theme === 'modern' ? '00 / All celebrations' : 'Every celebration'}
            </p>
          </div>
          <div>
            <h2 id="rsvp-all-title" className={skin.title}>
              All celebrations
            </h2>
            <p className={`mt-1 ${skin.body}`}>
              Answer once for all {open.length} celebrations. You can still change any one of them
              below.
            </p>
          </div>
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1.5">
              <span aria-hidden="true" className={skin.question}>
                {theme === 'modern' ? 'Attendance confirmation' : 'Will your family join?'}
              </span>
              <span className="sr-only">Will you attend all celebrations?</span>
            </legend>
            <ChoiceGroup
              name="rsvp-all"
              value={allStatus}
              onChange={(status) => setAll({ status })}
              skin={skin}
            />
            {allStatus === 'attending' &&
              counter(
                'rsvp-all-count',
                { count: allCount },
                (count) => setAll({ count }),
                sameCount,
              )}
            {!shared && openAnswers.some((answer) => answer.status !== 'pending') && (
              <p className={skin.body}>
                Your answers are different for some celebrations. Choosing here changes all of them.
              </p>
            )}
          </fieldset>
        </section>
      )}

      {view.events.map((event, index) => {
        const answer = answers[event.invitationId];
        if (!answer) return null;
        const error = errors[event.invitationId];
        const groupId = `rsvp-${event.invitationId}`;
        const closed = event.cancelled || !writable;
        const venue = [event.venueName, event.venueAddress].filter(Boolean).join(', ');
        const time = when(event) ?? 'Date to be announced';
        const place = venue || 'Venue to be announced';
        const status = event.cancelled
          ? 'Cancelled'
          : statusLabel(saved[event.invitationId], view.partySize, theme);
        return (
          <section
            key={event.invitationId}
            aria-labelledby={`${groupId}-title`}
            className={`text-left ${skin.card}`}
          >
            {theme === 'modern' ? (
              <>
                <div className="mb-3 flex items-baseline justify-between gap-2 border-b border-minimal-line-soft pb-2.5">
                  <p className="flex min-w-0 items-center gap-2">
                    <span className={`truncate ${skin.tag}`}>
                      {String(index + 1).padStart(2, '0')} / {event.title}
                    </span>
                    {partOfDay(event.startTime) && (
                      <>
                        <span aria-hidden="true" className="text-minimal-line">
                          •
                        </span>
                        <span className="shrink-0 font-mono text-[10px] text-minimal-muted uppercase">
                          {partOfDay(event.startTime)} function
                        </span>
                      </>
                    )}
                  </p>
                  <p className={skin.status}>{status}</p>
                </div>
                <h2 id={`${groupId}-title`} className={`wrap-break-word ${skin.title}`}>
                  {event.title}
                </h2>
                <dl className={`mt-2.5 mb-4 ${skin.details}`}>
                  {[
                    ['When', time, true],
                    ['Where', place, false],
                    ...(event.dressCode ? [['Attire', event.dressCode, false] as const] : []),
                  ].map(([label, text, strong]) => (
                    <div key={String(label)} className="flex items-start gap-2">
                      <dt className="mt-0.5 w-14 shrink-0 font-mono text-[10px] text-minimal-muted uppercase">
                        {label}
                      </dt>
                      <dd className={strong ? skin.detailStrong : skin.detailText}>{text}</dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : (
              <>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={`mb-1.5 ${skin.tag}`}>
                      <Icon name={tagIcon(event)} className={skin.tagIcon} />
                      Function {index + 1} of {view.events.length}
                    </p>
                    <h2 id={`${groupId}-title`} className={`wrap-break-word ${skin.title}`}>
                      {event.title}
                    </h2>
                  </div>
                  <p className={skin.status}>{status}</p>
                </div>
                <dl className={`mb-4 ${skin.details}`}>
                  <div className="flex items-start gap-2">
                    <dt>
                      <Icon name="schedule" className={`mt-0.5 shrink-0 ${skin.detailIcon}`} />
                      <span className="sr-only">When</span>
                    </dt>
                    <dd className={skin.detailStrong}>{time}</dd>
                  </div>
                  <div className="flex items-start gap-2">
                    <dt>
                      <Icon name="location-on" className={`mt-0.5 shrink-0 ${skin.detailIcon}`} />
                      <span className="sr-only">Where</span>
                    </dt>
                    <dd className={skin.detailText}>
                      {place}
                      {event.dressCode ? ` · Attire: ${event.dressCode}` : ''}
                    </dd>
                  </div>
                </dl>
              </>
            )}

            {event.cancelled ? (
              <p className={`${skin.note} not-italic`}>
                This celebration has been cancelled. RSVP is closed.
              </p>
            ) : (
              <fieldset disabled={closed} className="flex flex-col gap-3">
                <legend className="mb-1.5">
                  <span aria-hidden="true" className={skin.question}>
                    {theme === 'modern' ? 'Attendance confirmation' : 'Will your family join?'}
                  </span>
                  <span className="sr-only">Will you attend {event.title}?</span>
                </legend>
                <ChoiceGroup
                  name={groupId}
                  value={answer.status}
                  onChange={(status) => set(event.invitationId, { status })}
                  skin={skin}
                />
                {answer.status === 'attending' &&
                  counter(`${groupId}-count`, answer, (count) =>
                    set(event.invitationId, { count }),
                  )}
                {answer.status === 'not_attending' && (
                  <p className={`flex items-center gap-1.5 ${skin.note}`}>
                    <Icon name="favorite" className="size-4 shrink-0" />
                    We will miss you at the {event.title}. No one from your family will attend.
                  </p>
                )}
                {answer.status === 'maybe' && (
                  <p className={skin.note}>
                    Tentative isn’t counted as confirmed. You can update it once you know.
                  </p>
                )}
                {error && (
                  <p role="alert" className="text-body-sm text-error">
                    {error}
                  </p>
                )}
              </fieldset>
            )}
          </section>
        );
      })}

      {notice?.kind === 'changed' && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-xl bg-secondary-container/60 px-4 py-3 text-body-sm text-on-secondary-container"
        >
          <p>
            These responses have changed since you opened this page. Refresh to review the latest
            version.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="self-start rounded-lg bg-surface-container-lowest px-4 py-2 text-label-md font-semibold text-on-surface"
          >
            Refresh
          </button>
        </div>
      )}
      {notice?.kind === 'closed' && (
        <p
          role="alert"
          className="rounded-xl bg-secondary-container/60 px-4 py-3 text-body-sm text-on-secondary-container"
        >
          This RSVP can no longer be changed.
        </p>
      )}
      {notice?.kind === 'failed' && (
        <p
          role="alert"
          className="rounded-xl bg-error-container px-4 py-3 text-body-sm text-on-error-container"
        >
          {notice.message} Your choices are still here.
        </p>
      )}

      {writable && (
        <div className="flex flex-col gap-2.5 pt-2">
          {notice?.kind === 'saved' ? (
            <p role="status" className={skin.saved}>
              <SavedMark skin={skin} theme={theme} />
              Your responses have been saved. You can change them any time before the wedding.
            </p>
          ) : (
            changed.length === 0 &&
            answeredAll && (
              <p className={skin.saved}>
                <SavedMark skin={skin} theme={theme} />
                Your responses are currently saved
              </p>
            )
          )}
          <button
            type="submit"
            disabled={pending || changed.length === 0}
            aria-busy={pending || undefined}
            className={skin.submit}
          >
            <Icon name={theme === 'modern' ? 'done' : 'task-alt'} className={skin.submitIcon} />
            {pending
              ? 'Saving…'
              : changed.length > 0
                ? answeredAll
                  ? 'Update my RSVP'
                  : 'Save my RSVP'
                : answeredAll
                  ? 'Your RSVP is saved'
                  : 'Choose your answers above'}
          </button>
          <div className="px-2 pt-3 text-center">
            <p className={`flex items-center justify-center gap-1.5 ${skin.privacy}`}>
              <Icon name="lock" className={skin.privacyIcon} />
              Private invitation link
            </p>
            <p className={`mt-1 ${skin.body}`}>
              Anyone with this private link can update your family’s answers. Please don’t share it
              outside your immediate family.
            </p>
          </div>
        </div>
      )}
    </form>
  );
}

function SavedMark({ skin, theme }: { skin: RsvpSkin; theme: Theme }) {
  return theme === 'modern' ? (
    <span aria-hidden="true" className={skin.savedIcon} />
  ) : (
    <Icon name={theme === 'royal' ? 'verified' : 'check-circle'} className={skin.savedIcon} />
  );
}

function ChoiceGroup({
  name,
  value,
  onChange,
  skin,
}: {
  name: string;
  value: Answer['status'] | undefined;
  onChange: (status: Choice) => void;
  skin: RsvpSkin;
}) {
  return (
    <div className={skin.choices}>
      {CHOICES.map((choice) => (
        <label key={choice.value} className="cursor-pointer">
          <input
            type="radio"
            name={name}
            value={choice.value}
            checked={value === choice.value}
            onChange={() => onChange(choice.value)}
            className="peer sr-only"
          />
          <span
            className={`flex min-h-10 items-center justify-center gap-1 px-1 py-2 text-center transition-all peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary-container ${skin.choice} ${skin.choiceOn}`}
          >
            <Icon name={choice.icon} className={`shrink-0 ${skin.choiceIcon}`} />
            {choice.label}
          </span>
        </label>
      ))}
    </div>
  );
}

/** How many will attend, 1 to the party size; `count` is absent when the ceremonies differ. */
function Counter({
  id,
  count,
  base,
  partySize,
  firstName,
  onChange,
  skin,
  theme,
}: {
  id: string;
  count: number | undefined;
  base: number;
  partySize: number;
  /** The guest's first name, for "Rajesh + 2 guests". */
  firstName: string;
  onChange: (count: number) => void;
  skin: RsvpSkin;
  theme: Theme;
}) {
  const everyone = count === partySize && partySize > 1;
  const who =
    count === undefined
      ? 'Different for each celebration'
      : count === 1
        ? `Just ${firstName}`
        : everyone
          ? `All ${partySize} members attending`
          : `${firstName} + ${count - 1} ${count - 1 === 1 ? 'guest' : 'guests'}`;
  const confirmed = `${count ?? '–'} of ${partySize} confirmed`;
  return (
    <div className={skin.counter}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <p id={`${id}-label`} className={skin.counterQuestion}>
              {theme === 'modern' ? 'Reserved headcount' : 'How many people will attend?'}
            </p>
            {everyone && <span className={skin.fullFamily}>Full family</span>}
          </div>
          <p className={skin.counterWho}>{who}</p>
        </div>
        <div role="group" aria-labelledby={`${id}-label`} className={`shrink-0 ${skin.stepper}`}>
          <button
            type="button"
            onClick={() => onChange(Math.max(1, base - 1))}
            disabled={base <= 1}
            className={skin.stepperButton}
          >
            <Icon name="remove" className="size-4.5" />
            <span className="sr-only">One fewer</span>
          </button>
          <span className={skin.stepperCount}>{count ?? '–'}</span>
          <button
            type="button"
            onClick={() => onChange(Math.min(partySize, base + 1))}
            disabled={base >= partySize}
            className={skin.stepperButton}
          >
            <Icon name="add" className="size-4.5" />
            <span className="sr-only">One more</span>
          </button>
        </div>
      </div>
      <p className={skin.counterFoot}>
        <span>
          {theme === 'modern'
            ? `Max allocation: ${String(partySize).padStart(2, '0')}`
            : `Up to ${partySize} ${partySize === 1 ? 'person' : 'people'} in your family`}
        </span>
        <span aria-live="polite" className={skin.counterFootStrong}>
          {confirmed}
        </span>
      </p>
    </div>
  );
}
