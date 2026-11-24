'use client';

import { ServerError } from '@/components/errors/server-error';
import { fontClasses } from './fonts';
import './globals.css';

/**
 * When even the root layout fails: the same 500 page, in a document of its
 * own (it replaces the root layout), with the site's fonts and styles.
 */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en" className={`${fontClasses} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <ServerError
          error={error}
          retry={retry}
          heading={<title>Something went wrong · My Marriage</title>}
        />
      </body>
    </html>
  );
}
