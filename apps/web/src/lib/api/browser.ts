import type { paths } from '@my-marriage/contracts';
import createClient from 'openapi-fetch';

// Typed API client for Client Components. Paths, parameters and response
// bodies come from the generated contract, so a breaking API change fails
// `pnpm typecheck`.
//
// The base URL is empty on purpose: the browser only ever calls its own
// origin, which forwards /api/v1/* to the API. That is what lets the HttpOnly
// session cookies work, so anything that sets or clears a cookie (login,
// logout) must go through this client, from the browser.
//
// For Server Components use `serverApi()` from ./server instead.
export const api = createClient<paths>({ baseUrl: '' });
