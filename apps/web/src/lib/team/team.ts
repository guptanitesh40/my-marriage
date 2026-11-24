import 'server-only';
import type { components } from '@my-marriage/contracts';
import { serverApi } from '@/lib/api/server';

export type Team = components['schemas']['TeamDto'];
export type TeamMember = components['schemas']['TeamMemberDto'];
export type TeamInvite = components['schemas']['MemberInviteDto'];

export type TeamResult = ({ kind: 'ok' } & Team) | { kind: 'forbidden' } | { kind: 'unavailable' };

/**
 * The team page's members and invitations, for owners and admins.
 * `forbidden` for a manager, who never manages the team (decision 0020).
 * Reads the request: call it inside <Suspense>.
 */
export async function getTeam(weddingId: string): Promise<TeamResult> {
  try {
    const api = await serverApi();
    const { data, response } = await api.GET('/api/v1/weddings/{weddingId}/team', {
      params: { path: { weddingId } },
    });
    if (data) return { kind: 'ok', ...data.data };
    return response.status === 403 ? { kind: 'forbidden' } : { kind: 'unavailable' };
  } catch {
    return { kind: 'unavailable' };
  }
}
