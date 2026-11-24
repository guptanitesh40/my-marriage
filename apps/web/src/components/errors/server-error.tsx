'use client';

import type { ReactNode } from 'react';
import { ButtonLink } from '@/components/ui/button-link';
import { Icon } from '@/components/ui/icon';
import { routes } from '@/lib/routes';
import { ErrorPage } from './error-page';

/**
 * The reference to quote for an error: Next's digest, a hash that matches
 * the server's log entry and says nothing about what failed. Errors thrown
 * in the browser have none, and their message is never shown.
 */
export function referenceOf(error: unknown): string | undefined {
  if (!(error instanceof Error) || !('digest' in error)) return undefined;
  return typeof error.digest === 'string' && error.digest !== '' ? error.digest : undefined;
}

/**
 * "Something went wrong" (500), for the error boundaries: try again, or go
 * home. What failed stays on the server; only its reference is shown.
 */
export function ServerError({
  error,
  retry,
  heading,
}: {
  error: unknown;
  retry: () => void;
  /** A `<title>`, since error boundaries can't export metadata. */
  heading?: ReactNode;
}) {
  return (
    <>
      {heading}
      <ErrorPage
        status="500"
        icon="sync"
        eyebrow="Something went wrong"
        title="We couldn’t load this page"
        body="Something went wrong on our side, not yours. Your wedding plans are safe. Please try again in a moment."
        reference={referenceOf(error)}
        year={new Date().getFullYear()}
        actions={
          <>
            <button
              type="button"
              onClick={() => retry()}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-primary px-6 text-label-md font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container"
            >
              <Icon name="sync" className="size-4.5" />
              Try again
            </button>
            <ButtonLink href={routes.home} variant="secondary">
              Back to home
            </ButtonLink>
          </>
        }
      />
    </>
  );
}
