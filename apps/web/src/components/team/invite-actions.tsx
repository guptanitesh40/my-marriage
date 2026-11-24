'use client';

import type { components } from '@my-marriage/contracts';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { api } from '@/lib/api/browser';
import { networkFailure, toFailure, waitMessage } from '@/lib/api/errors';
import { DANGER_BUTTON, PLAIN_BUTTON, Sheet } from '@/components/ui/sheet';

type Invite = components['schemas']['MemberInviteDto'];

/**
 * Resend and revoke for a waiting invitation (Stitch "Revoke invitation
 * link?"). Revoking stops its link at once; the person can be invited
 * again later.
 */
export function InviteActions({ weddingId, invite }: { weddingId: string; invite: Invite }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState<'resend' | 'revoke' | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const path = { params: { path: { weddingId, inviteId: invite.id } } };

  async function run(action: 'resend' | 'revoke') {
    setBusy(action);
    setMessage(null);
    try {
      const { data, error, response } =
        action === 'resend'
          ? await api.POST('/api/v1/weddings/{weddingId}/member-invites/{inviteId}/resend', path)
          : await api.POST('/api/v1/weddings/{weddingId}/member-invites/{inviteId}/revoke', path);
      if (data) {
        setConfirming(false);
        if (action === 'resend') setMessage({ tone: 'ok', text: 'Sent again with a new link.' });
        router.refresh();
      } else {
        const failure = toFailure(response.status, error);
        setMessage({
          tone: 'error',
          text: failure.code === 'RATE_LIMITED' ? waitMessage(failure) : failure.message,
        });
        setConfirming(false);
      }
    } catch {
      setMessage({ tone: 'error', text: networkFailure().message });
    }
    setBusy(null);
  }

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void run('resend')}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-label-md font-semibold text-primary hover:bg-surface-container disabled:opacity-60"
        >
          <Icon name="forward-to-inbox" className="size-4.5" />
          {busy === 'resend' ? 'Sending…' : 'Resend'}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => setConfirming(true)}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-label-md font-semibold text-error hover:bg-error-container/40 disabled:opacity-60"
        >
          <Icon name="link-off" className="size-4.5" />
          Revoke<span className="sr-only"> the invitation to {invite.email}</span>
        </button>
      </div>
      {message && (
        <p
          role={message.tone === 'error' ? 'alert' : 'status'}
          className={`text-body-sm ${message.tone === 'error' ? 'text-error' : 'text-on-surface-variant'}`}
        >
          {message.text}
        </p>
      )}
      <Sheet
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Revoke invitation link?"
        description={`The invitation sent to ${invite.email} stops working at once, including any link already opened. You can invite them again later.`}
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => setConfirming(false)} className={PLAIN_BUTTON}>
            Keep invitation
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void run('revoke')}
            className={DANGER_BUTTON}
          >
            <Icon name="link-off" className="size-5" />
            {busy === 'revoke' ? 'Revoking…' : 'Revoke link'}
          </button>
        </div>
      </Sheet>
    </div>
  );
}
