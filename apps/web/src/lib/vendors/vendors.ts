import 'server-only';
import type { components } from '@my-marriage/contracts';
import { serverApi } from '@/lib/api/server';

export type VendorList = components['schemas']['VendorListDto'];

export type VendorsResult = ({ kind: 'ok' } & VendorList) | { kind: 'unavailable' };

/**
 * A wedding's vendors. Reads the request: call it inside <Suspense>. The
 * workspace layout has already answered "not found" for a wedding the
 * visitor does not belong to.
 */
export async function getVendors(weddingId: string): Promise<VendorsResult> {
  try {
    const api = await serverApi();
    const { data } = await api.GET('/api/v1/weddings/{weddingId}/vendors', {
      params: { path: { weddingId } },
    });
    return data ? { kind: 'ok', ...data.data } : { kind: 'unavailable' };
  } catch {
    return { kind: 'unavailable' };
  }
}
