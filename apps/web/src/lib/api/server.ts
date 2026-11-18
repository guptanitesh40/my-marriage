import 'server-only';
import type { paths } from '@my-marriage/contracts';
import { headers } from 'next/headers';
import createClient from 'openapi-fetch';

// The only request headers passed on to the API. `cookie` carries the
// visitor's session, so the API — never this app — decides what they may see.
// `x-forwarded-for` carries their address, so the API's rate limits apply to
// the visitor rather than to this server.
const FORWARDED_HEADERS = ['cookie', 'x-forwarded-for'];

/**
 * Typed API client for Server Components, acting as the current visitor.
 *
 * It reads the incoming request, so it must be created per request (never
 * stored in a module variable) and never called inside `'use cache'`: a
 * response fetched with one visitor's cookie must not be cached for another.
 *
 * A Set-Cookie sent back by the API does not reach the browser from here.
 * Calls that set or clear a cookie belong in the browser client.
 */
export async function serverApi() {
  const incoming = await headers();
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
