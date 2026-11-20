import 'server-only';
import type { components } from '@my-marriage/contracts';
import { serverApi } from '@/lib/api/server';

export type Website = components['schemas']['WebsiteDto'];

export type WebsiteResult = ({ kind: 'ok' } & Website) | { kind: 'unavailable' };

/**
 * The wedding's website as its organizers edit it. Reads the request: call
 * it inside <Suspense>. The workspace layout has already answered "not
 * found" for a wedding the visitor does not belong to.
 */
export async function getWebsite(weddingId: string): Promise<WebsiteResult> {
  try {
    const api = await serverApi();
    const { data } = await api.GET('/api/v1/weddings/{weddingId}/website', {
      params: { path: { weddingId } },
    });
    return data ? { kind: 'ok', ...data.data } : { kind: 'unavailable' };
  } catch {
    return { kind: 'unavailable' };
  }
}
