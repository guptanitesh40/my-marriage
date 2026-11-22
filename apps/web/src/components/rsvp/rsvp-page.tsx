'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { Icon } from '@/components/ui/icon';
import { api } from '@/lib/api/browser';
import { networkFailure } from '@/lib/api/errors';
import { eventWhen } from '@/lib/events/format';
import type { GuestView } from '@/lib/guests/guests';
import { invitationPath } from '@/lib/routes';
import { ReminderChoice } from './reminder-choice';
import { RsvpForm } from './rsvp-form';
import { RsvpHeader, RsvpHero } from './rsvp-chrome';
import { RSVP_SKINS, type RsvpSkin } from './rsvp-theme';

/**
 * The page around the invitation: no organizer navigation, no sign-in. In
 * the wedding website's design once the invitation is known; the brand
 * until then.
 */
function Shell({
  children,
  view,
}: {
  children: React.ReactNode;
  view?: Pick<GuestView, 'coupleName' | 'templateId' | 'events'>;
}) {
  const theme = view?.templateId ?? 'traditional';
  return (
    <div
      data-rsvp-theme={theme}
      className={`flex flex-1 flex-col font-sans antialiased ${RSVP_SKINS[theme].page}`}
    >
      <RsvpHeader {...(view ? { view } : {})} />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 pt-3 pb-10">
        {children}
      </main>
    </div>
  );
}

/** Shown while the invitation opens. */
export function RsvpOpening() {
  return (
    <Shell>
      <p role="status" className="py-16 text-center text-body-md text-on-surface-variant">
        Opening your invitation…
      </p>
    </Shell>
  );
}

function Unavailable() {
  return (
    <Shell>
      <section className="flex flex-col items-center gap-3 rounded-2xl bg-surface-container-lowest px-6 py-14 text-center shadow-xs">
        <span
          aria-hidden="true"
          className="flex size-14 items-center justify-center rounded-full bg-surface-container text-on-surface-variant"
        >
          <Icon name="link-off" className="size-7" />
        </span>
        <h1 className="font-serif text-headline-md text-on-surface">
          This invitation link is no longer available
        </h1>
        <p className="max-w-sm text-body-md text-on-surface-variant">
          Please ask the couple for a new one. If they sent it by email or WhatsApp, open the latest
          message from them.
        </p>
      </section>
    </Shell>
  );
}

type Phase = 'ready' | 'opening' | 'gone' | 'failed';

/**
 * The guest's private RSVP page (Stitch "Guest RSVP"). The secret arrives
 * after `#t=`, which browsers never send to a server; it is removed from
 * the address at once and exchanged for a guest cookie, then the page
 * shows the invitation the server reads with that cookie.
 */
export function RsvpPage({ view, unreachable }: { view: GuestView | null; unreachable: boolean }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('opening');
  const [, startTransition] = useTransition();
  // Opened from "turn reminders off" in a reminder email.
  const [toReminders, setToReminders] = useState(false);
  const token = useRef<string | null>(null);

  const exchange = useCallback(async () => {
    if (!token.current) return;
    try {
      const { response } = await api.POST('/api/v1/guest-access/exchange', {
        body: { token: token.current },
      });
      if (response.ok) {
        token.current = null;
        // Shown only together with the invitation read with the new cookie:
        // a browser that had another guest's invitation open must never
        // show it, or keep that guest's answers, under this link.
        startTransition(() => {
          router.refresh();
          setPhase('ready');
        });
      } else setPhase(response.status === 404 || response.status === 400 ? 'gone' : 'failed');
    } catch {
      setPhase('failed');
    }
  }, [router]);

  useEffect(() => {
    /** Takes a link's secret from the address, if any; true when it found one. */
    function fromAddress(): boolean {
      const hash = window.location.hash;
      if (/(?:^#|&)reminders(?:&|$)/.test(hash)) queueMicrotask(() => setToReminders(true));
      const match = /(?:^#|&)t=([A-Za-z0-9_-]{20,100})/.exec(hash);
      if (!match?.[1]) return false;
      token.current = match[1];
      // Out of the address bar and history before anything else.
      window.history.replaceState(null, '', invitationPath);
      return true;
    }
    // Another link pasted into this open tab changes only the part after #.
    function linkChanged() {
      if (!fromAddress()) return;
      setPhase('opening');
      void exchange();
    }
    window.addEventListener('hashchange', linkChanged);
    if (fromAddress()) queueMicrotask(() => void exchange());
    // Arrived without a link: show what the server found with the cookie.
    else if (!token.current) {
      queueMicrotask(() => setPhase(view ? 'ready' : unreachable ? 'failed' : 'gone'));
    }
    return () => window.removeEventListener('hashchange', linkChanged);
  }, [exchange, view, unreachable]);

  if (phase === 'ready' && view) {
    return (
      <Shell view={view}>
        {/* A different guest's invitation starts afresh, answers and all. */}
        <Invitation key={invitationKey(view)} view={view} toReminders={toReminders} />
      </Shell>
    );
  }
  if (phase === 'gone') return <Unavailable />;
  if (phase === 'failed') {
    return (
      <Shell>
        <section className="flex flex-col items-center gap-3 rounded-2xl bg-surface-container-lowest px-6 py-12 text-center shadow-xs">
          <h1 className="font-serif text-headline-sm text-on-surface">
            We couldn’t open your invitation
          </h1>
          <p className="text-body-md text-on-surface-variant">{networkFailure().message}</p>
          <button
            type="button"
            onClick={() => {
              setPhase('opening');
              if (token.current) void exchange();
              else router.refresh();
            }}
            className="rounded-lg bg-primary px-5 py-3 text-title-sm text-on-primary"
          >
            Try again
          </button>
        </section>
      </Shell>
    );
  }
  return <RsvpOpening />;
}

/** Which invitation this is: the guest and their ceremonies. */
function invitationKey(view: GuestView): string {
  return [view.guestName, ...view.events.map((event) => event.invitationId)].join('|');
}

function Invitation({ view, toReminders }: { view: GuestView; toReminders: boolean }) {
  const skin = RSVP_SKINS[view.templateId];
  return (
    <>
      <RsvpHero view={view} />
      {view.events.length === 0 ? (
        <p className={`${skin.card} ${skin.body}`}>
          There are no celebrations on your invitation right now. The couple may add some soon.
        </p>
      ) : (
        <RsvpForm view={view} when={(event) => eventWhen(event)} />
      )}
      {view.reminderEmails && (
        <ReminderChoice initial={view.reminderEmails} focus={toReminders} skin={skin} />
      )}
      {(view.events.length === 0 || !view.writable) && <PrivateNote skin={skin} />}
    </>
  );
}

/** Why the link must stay in the family. */
export function PrivateNote({ skin }: { skin: RsvpSkin }) {
  return (
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
  );
}
