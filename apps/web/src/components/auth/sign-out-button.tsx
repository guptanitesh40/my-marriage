'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { api } from '@/lib/api/browser';
import { routes } from '@/lib/routes';
import { goTo } from './hooks';

/**
 * Ends the session through the browser client, so the API's response can
 * clear the HttpOnly cookie. Leaves for the homepage even if the request
 * fails: the session cookie is HttpOnly and the API ends it on its side.
 */
export function SignOutButton({ variant = 'button' }: { variant?: 'button' | 'link' }) {
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    try {
      await api.POST('/api/v1/auth/logout');
    } finally {
      goTo(routes.home);
    }
  }

  const style =
    variant === 'link'
      ? 'rounded-sm font-semibold text-primary underline-offset-4 hover:underline'
      : 'inline-flex items-center gap-2 rounded-md bg-surface-container px-4 py-2 text-label-md font-semibold text-on-surface transition-colors hover:bg-surface-container-high';

  return (
    <button
      type="button"
      onClick={() => void signOut()}
      disabled={pending}
      aria-busy={pending || undefined}
      className={`${style} disabled:cursor-wait`}
    >
      {variant === 'button' && <Icon name="logout" className="size-4" />}
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
