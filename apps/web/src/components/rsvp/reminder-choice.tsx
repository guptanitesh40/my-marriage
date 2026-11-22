'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { api } from '@/lib/api/browser';
import { networkFailure, toFailure } from '@/lib/api/errors';
import type { RsvpSkin } from './rsvp-theme';

/**
 * The guest's own choice about reminder emails (PRD §5.10 consent). Turning
 * them off changes nothing else: the invitation and answers stay. Reached
 * from "Turn them off" in a reminder email, which scrolls here.
 */
export function ReminderChoice({
  initial,
  focus,
  skin,
}: {
  initial: 'on' | 'off';
  /** Opened from a reminder's "turn them off" link. */
  focus: boolean;
  /** The page's design. */
  skin: Pick<RsvpSkin, 'card' | 'cardHeading' | 'body' | 'stepperButton'>;
}) {
  const section = useRef<HTMLElement>(null);
  const [choice, setChoice] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (focus) section.current?.scrollIntoView({ block: 'center' });
  }, [focus]);

  async function change(next: 'on' | 'off') {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const { data, error, response } = await api.POST(
        next === 'off'
          ? '/api/v1/guest-access/reminders/opt-out'
          : '/api/v1/guest-access/reminders/opt-in',
      );
      if (data) {
        setChoice(data.data.reminderEmails);
        setMessage({
          tone: 'ok',
          text:
            data.data.reminderEmails === 'off'
              ? 'Done. You won’t get reminder emails any more.'
              : 'Done. Reminder emails are back on.',
        });
      } else setMessage({ tone: 'error', text: toFailure(response.status, error).message });
    } catch {
      setMessage({ tone: 'error', text: networkFailure().message });
    }
    setBusy(false);
  }

  return (
    <section
      ref={section}
      aria-labelledby="reminder-choice-title"
      className={`flex flex-col gap-3 ${skin.card} ${focus ? 'ring-2 ring-secondary' : ''}`}
    >
      <h2 id="reminder-choice-title" className={`flex items-center gap-2 ${skin.cardHeading}`}>
        <Icon
          name={choice === 'on' ? 'notifications' : 'notifications-off'}
          className="size-5 text-secondary"
        />
        Reminder emails
      </h2>
      <p className={skin.body}>
        {choice === 'on'
          ? 'The couple may email you a reminder before each celebration.'
          : 'Reminder emails are off. Your invitation and your answers stay as they are.'}
      </p>
      <button
        type="button"
        onClick={() => change(choice === 'on' ? 'off' : 'on')}
        disabled={busy}
        className="self-start rounded-lg bg-surface-container px-4 py-2.5 text-label-md font-semibold text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-60"
      >
        {busy
          ? 'Saving…'
          : choice === 'on'
            ? 'Stop reminder emails'
            : 'Turn reminder emails back on'}
      </button>
      {message && (
        <p
          role={message.tone === 'error' ? 'alert' : 'status'}
          className={`text-body-sm ${message.tone === 'error' ? 'text-error' : 'text-on-surface'}`}
        >
          {message.text}
        </p>
      )}
    </section>
  );
}
