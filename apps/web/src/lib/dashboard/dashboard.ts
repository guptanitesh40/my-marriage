import 'server-only';
import type { components } from '@my-marriage/contracts';
import { serverApi } from '@/lib/api/server';

export type Dashboard = components['schemas']['DashboardDto'];
export type DashboardCeremony = components['schemas']['DashboardCeremonyDto'];

export type DashboardResult = ({ kind: 'ok' } & Dashboard) | { kind: 'unavailable' };

/**
 * The overview's numbers, read fresh for this request and never kept for
 * another visitor. Reads the request: call it inside <Suspense>. The
 * workspace layout has already answered "not found" for a non-member.
 */
export async function getDashboard(weddingId: string): Promise<DashboardResult> {
  try {
    const api = await serverApi();
    const { data } = await api.GET('/api/v1/weddings/{weddingId}/dashboard', {
      params: { path: { weddingId } },
    });
    return data ? { kind: 'ok', ...data.data } : { kind: 'unavailable' };
  } catch {
    return { kind: 'unavailable' };
  }
}
