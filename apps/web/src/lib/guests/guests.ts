import 'server-only';
import type { components } from '@my-marriage/contracts';
import { serverApi } from '@/lib/api/server';

export type GuestList = components['schemas']['GuestListDto'];
export type GuestView = components['schemas']['GuestViewDto'];

export type GuestsResult = ({ kind: 'ok' } & GuestList) | { kind: 'unavailable' };

/**
 * A wedding's guests with their totals. Reads the request: call it inside
 * <Suspense>. The workspace layout has already answered "not found" for a
 * wedding the visitor does not belong to.
 */
export async function getGuests(weddingId: string): Promise<GuestsResult> {
  try {
    const api = await serverApi();
    const { data } = await api.GET('/api/v1/weddings/{weddingId}/guests', {
      params: { path: { weddingId } },
    });
    return data ? { kind: 'ok', ...data.data } : { kind: 'unavailable' };
  } catch {
    return { kind: 'unavailable' };
  }
}

export type InvitationResult =
  { kind: 'ok'; view: GuestView } | { kind: 'none' } | { kind: 'unavailable' };

/**
 * The guest's own invitation, through their guest cookie. `none` when this
 * browser has no live guest session (the page then opens the link, if it
 * has one); `unavailable` when the server could not be reached.
 */
export async function getInvitation(): Promise<InvitationResult> {
  try {
    const api = await serverApi();
    const { data, response } = await api.GET('/api/v1/guest-access/invitation');
    if (data) return { kind: 'ok', view: data.data };
    return response.status === 401 ? { kind: 'none' } : { kind: 'unavailable' };
  } catch {
    return { kind: 'unavailable' };
  }
}

export type ReminderSettings = components['schemas']['ReminderSettingsDto'];

/** The wedding's automatic reminders; null if they could not be read. */
export async function getReminderSettings(weddingId: string): Promise<ReminderSettings | null> {
  try {
    const api = await serverApi();
    const { data } = await api.GET('/api/v1/weddings/{weddingId}/reminder-settings', {
      params: { path: { weddingId } },
    });
    return data?.data ?? null;
  } catch {
    return null;
  }
}
