import 'server-only';
import type { components } from '@my-marriage/contracts';
import { serverApi } from '@/lib/api/server';

export type WeddingSettings = components['schemas']['WeddingSettingsDto'];

export type SettingsResult = ({ kind: 'ok' } & WeddingSettings) | { kind: 'unavailable' };

/**
 * The settings page's wedding, who last saved it and its archive and
 * deletion state. Reads the request: call it inside <Suspense>. The
 * workspace layout has already answered "not found" for a non-member.
 */
export async function getSettings(weddingId: string): Promise<SettingsResult> {
  try {
    const api = await serverApi();
    const { data } = await api.GET('/api/v1/weddings/{weddingId}/settings', {
      params: { path: { weddingId } },
    });
    return data ? { kind: 'ok', ...data.data } : { kind: 'unavailable' };
  } catch {
    return { kind: 'unavailable' };
  }
}
