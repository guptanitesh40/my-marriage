import 'server-only';
import type { components } from '@my-marriage/contracts';
import { cache } from 'react';
import { serverApi } from '@/lib/api/server';

export type Wedding = components['schemas']['WeddingDto'];

/**
 * The weddings the signed-in visitor owns or manages, asked of the API at
 * most once per request; null when there is no verified session or the API
 * cannot answer. Reads the request: call it inside <Suspense>.
 */
export const getMyWeddings = cache(async (): Promise<Wedding[] | null> => {
  try {
    const api = await serverApi();
    const { data } = await api.GET('/api/v1/weddings');
    return data?.data ?? null;
  } catch {
    return null;
  }
});

export type MemberInvite = components['schemas']['MemberInviteDto'];

/** A wedding's invitations, for one of its members; null if the API cannot answer. */
export async function getInvites(weddingId: string): Promise<MemberInvite[] | null> {
  try {
    const api = await serverApi();
    const { data } = await api.GET('/api/v1/weddings/{weddingId}/member-invites', {
      params: { path: { weddingId } },
    });
    return data?.data ?? null;
  } catch {
    return null;
  }
}

export type MyInvite = components['schemas']['MyInviteDto'];

/**
 * Pending invitations sent to the visitor's own verified address, newest
 * first; null if the API cannot answer. Reads the request: call it inside
 * <Suspense>.
 */
export const getMyInvites = cache(async (): Promise<MyInvite[] | null> => {
  try {
    const api = await serverApi();
    const { data } = await api.GET('/api/v1/member-invites/mine');
    return data?.data ?? null;
  } catch {
    return null;
  }
});
