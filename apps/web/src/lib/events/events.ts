import 'server-only';
import type { components } from '@my-marriage/contracts';
import { serverApi } from '@/lib/api/server';

export type WeddingEvent = components['schemas']['EventDto'];

export type EventsResult =
  { kind: 'ok'; events: WeddingEvent[]; truncated: boolean } | { kind: 'unavailable' };

/**
 * A wedding's events as the visitor may see them. Reads the request: call it
 * inside <Suspense>. The workspace layout has already answered "not found"
 * for a wedding the visitor does not belong to.
 */
export async function getEvents(weddingId: string): Promise<EventsResult> {
  try {
    const api = await serverApi();
    const { data } = await api.GET('/api/v1/weddings/{weddingId}/events', {
      params: { path: { weddingId } },
    });
    return data ? { kind: 'ok', ...data.data } : { kind: 'unavailable' };
  } catch {
    return { kind: 'unavailable' };
  }
}
