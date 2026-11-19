import 'server-only';
import type { components } from '@my-marriage/contracts';
import { serverApi } from '@/lib/api/server';

export type CurrentUser = components['schemas']['MeDto'];

/**
 * The signed-in visitor, or null when there is no valid session — asked of
 * the API on every call, never cached, so a sign-out or a revoked session
 * shows at once. This only decides what to render: the API checks the
 * session again on every request it serves.
 *
 * Reads the request cookie, so call it inside a <Suspense> boundary.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const api = await serverApi();
  const { data, response } = await api.GET('/api/v1/auth/me');
  if (response.status === 401) return null;
  if (!data) throw new Error(`Could not load the signed-in user (HTTP ${response.status})`);
  return data.data;
}
