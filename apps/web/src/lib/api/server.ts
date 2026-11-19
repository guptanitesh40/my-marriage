import 'server-only';
import { headers } from 'next/headers';
import { apiClientAsVisitor } from './as-visitor';

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
  return apiClientAsVisitor(await headers());
}
