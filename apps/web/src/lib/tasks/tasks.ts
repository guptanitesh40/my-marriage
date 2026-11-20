import 'server-only';
import type { components } from '@my-marriage/contracts';
import { serverApi } from '@/lib/api/server';
import type { TaskFilters } from './filters';

export type TaskList = components['schemas']['TaskListDto'];
export type Member = components['schemas']['MemberDto'];

export type TasksResult = ({ kind: 'ok' } & TaskList) | { kind: 'unavailable' };

/**
 * A wedding's tasks matching the filters. Reads the request: call it inside
 * <Suspense>. The workspace layout has already answered "not found" for a
 * wedding the visitor does not belong to.
 */
export async function getTasks(weddingId: string, filters: TaskFilters): Promise<TasksResult> {
  try {
    const api = await serverApi();
    const { data } = await api.GET('/api/v1/weddings/{weddingId}/tasks', {
      params: {
        path: { weddingId },
        query: {
          ...(filters.view !== 'all' ? { view: filters.view } : {}),
          ...(filters.q ? { q: filters.q } : {}),
          ...(filters.eventId ? { eventId: filters.eventId } : {}),
          ...(filters.assigneeId ? { assigneeId: filters.assigneeId } : {}),
          ...(filters.state ? { state: filters.state } : {}),
          ...(filters.priority ? { priority: filters.priority } : {}),
          ...(filters.sort !== 'due' ? { sort: filters.sort } : {}),
        },
      },
    });
    return data ? { kind: 'ok', ...data.data } : { kind: 'unavailable' };
  } catch {
    return { kind: 'unavailable' };
  }
}

/** Who tasks can be assigned to: the wedding's active owners and managers. */
export async function getMembers(weddingId: string): Promise<Member[] | null> {
  try {
    const api = await serverApi();
    const { data } = await api.GET('/api/v1/weddings/{weddingId}/members', {
      params: { path: { weddingId } },
    });
    return data ? data.data.members : null;
  } catch {
    return null;
  }
}

export type EventTaskCounts = components['schemas']['EventTaskCountsDto'];

/** Each ceremony's task counts, by event ID; null when they could not be loaded. */
export async function getTaskSummary(
  weddingId: string,
): Promise<Map<string, EventTaskCounts> | null> {
  try {
    const api = await serverApi();
    const { data } = await api.GET('/api/v1/weddings/{weddingId}/tasks/summary', {
      params: { path: { weddingId } },
    });
    return data ? new Map(data.data.events.map((counts) => [counts.eventId, counts])) : null;
  } catch {
    return null;
  }
}
