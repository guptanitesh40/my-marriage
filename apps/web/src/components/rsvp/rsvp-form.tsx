'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Icon } from '@/components/ui/icon';
import { api } from '@/lib/api/browser';
import { networkFailure, toFailure } from '@/lib/api/errors';
import type { GuestView } from '@/lib/guests/guests';

type ViewEvent = GuestView['events'][number];
type Choice = 'attending' | 'not_attending' | 'maybe';

const CHOICES: { value: Choice; label: string }[] = [
  { value: 'attending', label: 'Attending' },
  { value: 'not_attending', label: 'Not attending' },
  { value: 'maybe', label: 'Maybe' },
];

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

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      {!writable && (
        <p
          role="status"
          className="rounded-xl bg-secondary-container/50 px-4 py-3 text-body-sm text-on-secondary-container"
        >
          RSVPs for this wedding are closed. Your answers are shown below.
        </p>
      )}
      {notice?.kind === 'saved' && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-xl bg-primary-fixed/60 px-4 py-3 text-body-sm text-on-primary-fixed"
        >
          <Icon name="check-circle" className="mt-0.5 size-4.5 shrink-0" />
          Your responses have been saved. You can change them any time before the wedding.
        </p>
      )}
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

      {open.length > 1 && (
        <section
          aria-labelledby="rsvp-all-title"
          className="flex flex-col gap-4 rounded-2xl border border-primary/25 bg-primary-fixed/20 p-5"
        >
          <div>
            <p id="rsvp-all-title" className="font-serif text-headline-sm text-on-surface">
              All celebrations
            </p>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              Answer once for all {open.length} celebrations. You can still change any one of them
              below.
            </p>
          </div>
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 text-title-sm text-on-surface">
              Will you attend all celebrations?
            </legend>
            <ChoiceGroup
              name="rsvp-all"
              value={allStatus}
              onChange={(status) => setAll({ status })}
            />
            {allStatus === 'attending' && (
              <Counter
                id="rsvp-all-count"
                question="How many people will attend each?"
                count={sameCount ? allCount : undefined}
                partySize={view.partySize}
                onChange={(count) => setAll({ count })}
                base={allCount}
              />
            )}
            {!shared && openAnswers.some((answer) => answer.status !== 'pending') && (
              <p className="text-body-sm text-on-surface-variant">
                Your answers are different for some celebrations. Choosing here changes all of them.
              </p>
            )}
          </fieldset>
        </section>
      )}

      {view.events.map((event) => {
        const answer = answers[event.invitationId];
        if (!answer) return null;
        const error = errors[event.invitationId];
        const groupId = `rsvp-${event.invitationId}`;
        const closed = event.cancelled || !writable;
        return (
          <section
            key={event.invitationId}
            aria-labelledby={`${groupId}-title`}
            className="flex flex-col gap-4 rounded-2xl bg-surface-container-lowest p-5 shadow-xs"
          >
            <div>
              <h2 id={`${groupId}-title`} className="font-serif text-headline-md text-on-surface">
                {event.title}
              </h2>
              <p className="mt-1 flex items-center gap-1.5 text-body-sm text-on-surface-variant">
                <Icon name="calendar-month" className="size-4" />
                {when(event) ?? 'Date to be announced'}
              </p>
              <p className="flex items-center gap-1.5 text-body-sm text-on-surface-variant">
                <Icon name="location-on" className="size-4" />
                {[event.venueName, event.venueAddress].filter(Boolean).join(', ') ||
                  'Venue to be announced'}
              </p>
            </div>

            {event.cancelled ? (
              <p className="rounded-lg bg-surface-container-low px-4 py-3 text-body-sm text-on-surface-variant">
                This celebration has been cancelled. RSVP is closed.
              </p>
            ) : (
              <fieldset disabled={closed} className="flex flex-col gap-3">
                <legend className="mb-2 text-title-sm text-on-surface">
                  Will you attend {event.title}?
                </legend>
                <ChoiceGroup
                  name={groupId}
                  value={answer.status}
                  onChange={(status) => set(event.invitationId, { status })}
                />
                {answer.status === 'attending' && (
                  <Counter
                    id={`${groupId}-count`}
                    question="How many people will attend?"
                    count={answer.count}
                    partySize={view.partySize}
                    onChange={(count) => set(event.invitationId, { count })}
                    base={answer.count}
                  />
                )}
                {answer.status === 'not_attending' && (
                  <p className="text-body-sm text-on-surface-variant">
                    No one from your family will attend.
                  </p>
                )}
                {answer.status === 'maybe' && (
                  <p className="text-body-sm text-on-surface-variant">
                    Maybe isn’t counted as confirmed. You can update it once you know.
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

      {writable && (
        <div className="fixed inset-x-0 bottom-0 border-t border-surface-container-high bg-surface/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto max-w-xl">
            <button
              type="submit"
              disabled={pending || changed.length === 0}
              aria-busy={pending || undefined}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-4 text-title-sm text-on-primary shadow-md transition-colors hover:bg-primary-container disabled:opacity-60"
            >
              {pending
                ? 'Saving…'
                : changed.length > 0
                  ? answeredAll
                    ? 'Update RSVP'
                    : 'Save my RSVP'
                  : answeredAll
                    ? 'Your RSVP is saved'
                    : 'Choose your answers above'}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

function ChoiceGroup({
  name,
  value,
  onChange,
}: {
  name: string;
  value: Answer['status'] | undefined;
  onChange: (status: Choice) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-container-low p-1">
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
          <span className="flex min-h-12 items-center justify-center rounded-lg px-2 py-2 text-center text-label-md font-semibold text-on-surface-variant transition-colors peer-checked:bg-primary peer-checked:text-on-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary-container">
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
  question,
  count,
  base,
  partySize,
  onChange,
}: {
  id: string;
  question: string;
  count: number | undefined;
  base: number;
  partySize: number;
  onChange: (count: number) => void;
}) {
  const people = partySize === 1 ? 'person' : 'people';
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-container-low px-4 py-3">
      <div>
        <p id={`${id}-label`} className="text-title-sm text-on-surface">
          {question}
        </p>
        <p aria-live="polite" className="text-body-sm text-on-surface-variant">
          {count === undefined
            ? 'Different for each celebration'
            : `${count} of ${partySize} ${people}${count === partySize && partySize > 1 ? ' (everyone)' : ''}`}
        </p>
      </div>
      <div role="group" aria-labelledby={`${id}-label`} className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, base - 1))}
          disabled={base <= 1}
          className="flex size-12 items-center justify-center rounded-full bg-surface-container-lowest text-title-md text-on-surface shadow-xs disabled:opacity-40"
        >
          <span aria-hidden="true">−</span>
          <span className="sr-only">One fewer</span>
        </button>
        <span className="w-6 text-center font-serif text-headline-sm text-on-surface tabular-nums">
          {count ?? '–'}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(partySize, base + 1))}
          disabled={base >= partySize}
          className="flex size-12 items-center justify-center rounded-full bg-surface-container-lowest text-title-md text-on-surface shadow-xs disabled:opacity-40"
        >
          <span aria-hidden="true">+</span>
          <span className="sr-only">One more</span>
        </button>
      </div>
    </div>
  );
}
