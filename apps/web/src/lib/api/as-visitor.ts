import type { paths } from '@my-marriage/contracts';
import createClient from 'openapi-fetch';

// The only request headers passed on to the API. `cookie` carries the
// visitor's session, so the API — never this app — decides what they may see.
// `x-forwarded-for` carries their address, so the API's rate limits apply to
// the visitor rather than to this server.
const FORWARDED_HEADERS = ['cookie', 'x-forwarded-for'];

/**
 * Typed API client acting as the visitor who sent `incoming` — the one place
 * that decides which of their headers reach the API, and where it is.
 * Server-side only: it calls the API origin directly, which the browser
 * must never do. Server Components use `serverApi()`, which wraps this.
 */
export function apiClientAsVisitor(incoming: Pick<Headers, 'get'>) {
  const forwarded: Record<string, string> = {};
  for (const name of FORWARDED_HEADERS) {
    const value = incoming.get(name);
    if (value) forwarded[name] = value;
  }
  return createClient<paths>({
    baseUrl: process.env.API_ORIGIN ?? 'http://localhost:4000',
    headers: forwarded,
  });
}
