import 'server-only';
import { cache } from 'react';
import { serverApi } from '@/lib/api/server';
import { getCurrentUser } from '@/lib/auth/current-user';
import type { Wedding } from './my-weddings';

export type WorkspaceWedding =
  | { kind: 'ok'; wedding: Wedding }
  /** Not a member, or no such wedding: the API does not say which. */
  | { kind: 'not-found' }
  | { kind: 'unavailable' };

/**
 * One wedding as the signed-in visitor sees it, asked of the API at most
 * once per request, so the workspace layout and its page share one call.
 * Reads the request: call it inside <Suspense>.
 */
export const getWedding = cache(async (weddingId: string): Promise<WorkspaceWedding> => {
  try {
    const api = await serverApi();
    const { data, response } = await api.GET('/api/v1/weddings/{weddingId}', {
      params: { path: { weddingId } },
    });
    if (data) return { kind: 'ok', wedding: data.data };
    if (response.status === 404) return { kind: 'not-found' };
    return { kind: 'unavailable' };
  } catch {
    return { kind: 'unavailable' };
  }
});

/**
 * The signed-in visitor, asked once per request for the layout and its
 * page together. Still never kept beyond the request.
 */
export const getWorkspaceUser = cache(getCurrentUser);
