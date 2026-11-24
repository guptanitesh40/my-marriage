'use client';

import { ServerError } from '@/components/errors/server-error';

/**
 * Any page that fails to render (500). In production Next replaces a server
 * error's message with a generic one before it reaches the browser; this
 * page shows none of it either way, only the reference.
 */
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <ServerError
      error={error}
      retry={retry}
      heading={<title>Something went wrong · My Marriage</title>}
    />
  );
}
