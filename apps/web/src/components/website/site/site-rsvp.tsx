'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ReminderChoice } from '@/components/rsvp/reminder-choice';
import { RsvpForm } from '@/components/rsvp/rsvp-form';
import { RSVP_SKINS } from '@/components/rsvp/rsvp-theme';
import { Icon } from '@/components/ui/icon';
import { api } from '@/lib/api/browser';
import { networkFailure } from '@/lib/api/errors';
import { eventWhen } from '@/lib/events/format';
import type { GuestView } from '@/lib/guests/guests';
import type { Site } from '@/lib/website/site';

type State =
  | { kind: 'checking' }
  /** No invitation for this wedding in this browser. */
  | { kind: 'none' }
  /** The link was revoked or reissued. */
  | { kind: 'gone' }
  | { kind: 'failed' }
  | { kind: 'mine'; view: GuestView; toReminders: boolean };

/**
 * RSVP on the wedding website. A guest's private link opens the website
 * with its secret after `#t=`; it is taken out of the address at once and
 * exchanged for the guest cookie, as on the RSVP page, and their own
 * ceremonies appear here to answer. Anyone else is told to use their link:
 * there is no public lookup, so the guest list stays private (decision 0017).
 */
export function SiteRsvp({ site }: { site: Site }) {
  const [state, setState] = useState<State>({ kind: 'checking' });
  const section = useRef<HTMLDivElement>(null);

  const load = useCallback(
    async (opened: boolean, toReminders: boolean) => {
      try {
        const { data } = await api.GET('/api/v1/guest-access/invitation');
        const view = data?.data;
        if (view && view.slug === site.slug) {
          setState({ kind: 'mine', view, toReminders });
          if (opened) section.current?.scrollIntoView({ block: 'start' });
        } else setState({ kind: opened ? 'gone' : 'none' });
      } catch {
        setState({ kind: 'failed' });
      }
    },
    [site.slug],
  );

  const open = useCallback(
    async (token: string, toReminders: boolean) => {
      try {
        const { response } = await api.POST('/api/v1/guest-access/exchange', { body: { token } });
        if (response.ok) await load(true, toReminders);
        else
          setState({
            kind: response.status === 404 || response.status === 400 ? 'gone' : 'failed',
          });
      } catch {
        setState({ kind: 'failed' });
      }
    },
    [load],
  );

  useEffect(() => {
    if (site.preview) return;
    /** Takes a link's secret out of the address; the secret, if there was one. */
    function fromAddress(): { token: string; toReminders: boolean } | null {
      const hash = window.location.hash;
      const match = /(?:^#|&)t=([A-Za-z0-9_-]{20,100})/.exec(hash);
      if (!match?.[1]) return null;
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      return { token: match[1], toReminders: /(?:^#|&)reminders(?:&|$)/.test(hash) };
    }
    function linkChanged() {
      const link = fromAddress();
      if (link) void open(link.token, link.toReminders);
    }
    const link = fromAddress();
    queueMicrotask(() => void (link ? open(link.token, link.toReminders) : load(false, false)));
    window.addEventListener('hashchange', linkChanged);
    return () => window.removeEventListener('hashchange', linkChanged);
  }, [site.preview, open, load]);

  const skin = RSVP_SKINS[site.templateId];

  if (site.preview) {
    return (
      <Note skin={skin.card} title="Guests answer here">
        Each guest opens this website from their private invitation link, by email or WhatsApp, and
        sees only their own celebrations to answer. Visitors without a link see this note instead.
      </Note>
    );
  }
  if (state.kind === 'mine') {
    const { view } = state;
    const viewSkin = RSVP_SKINS[view.templateId];
    return (
      <div
        ref={section}
        data-rsvp-theme={view.templateId}
        className="flex scroll-mt-24 flex-col gap-4 text-left font-sans"
      >
        <p className={`flex items-center gap-2 ${viewSkin.card} ${viewSkin.body}`}>
          <Icon name="favorite" className="size-5 shrink-0 text-secondary" />
          <span>
            <b className="text-on-surface">Namaste, {view.guestName}.</b> This invitation is for up
            to {view.partySize === 1 ? '1 person' : `${view.partySize} people`} in your family.
            Please let us know who’s coming to each celebration.
          </span>
        </p>
        {view.events.length === 0 ? (
          <p className={`${viewSkin.card} ${viewSkin.body}`}>
            There are no celebrations on your invitation right now. The couple may add some soon.
          </p>
        ) : (
          <RsvpForm view={view} when={(event) => eventWhen(event)} />
        )}
        {view.reminderEmails && (
          <ReminderChoice initial={view.reminderEmails} focus={state.toReminders} skin={viewSkin} />
        )}
      </div>
    );
  }
  return (
    <div ref={section} className="scroll-mt-24">
      {state.kind === 'checking' ? (
        <p role="status" className="text-center text-body-md text-on-surface-variant">
          Looking for your invitation…
        </p>
      ) : state.kind === 'gone' ? (
        <Note skin={skin.card} title="This invitation link is no longer available">
          Please ask the couple for a new one. If they sent it by email or WhatsApp, open the latest
          message from them.
        </Note>
      ) : state.kind === 'failed' ? (
        <Note skin={skin.card} title="We couldn’t open your invitation">
          {networkFailure().message}
        </Note>
      ) : (
        <Note skin={skin.card} title="Invited? Open your private invitation link">
          The couple sent each family a private link by email or WhatsApp. Open it, and your
          celebrations will appear right here to answer.
        </Note>
      )}
    </div>
  );
}

function Note({
  skin,
  title,
  children,
}: {
  skin: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex items-start gap-3 text-left ${skin}`}>
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-container text-primary"
      >
        <Icon name="lock" className="size-5" />
      </span>
      <div>
        <p className="text-title-sm font-semibold text-on-surface">{title}</p>
        <p className="mt-1 text-body-sm text-on-surface-variant">{children}</p>
      </div>
    </div>
  );
}
