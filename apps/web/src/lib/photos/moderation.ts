import { api } from '@/lib/api/browser';
import { networkFailure, toFailure } from '@/lib/api/errors';

export type PhotoMove = 'approve' | 'reject' | 'hide' | 'restore' | 'remove';

/** One review change; the message to show when it fails. */
export async function movePhoto(
  weddingId: string,
  photoId: string,
  move: PhotoMove,
): Promise<string | null> {
  const params = { params: { path: { weddingId, photoId } } };
  try {
    const result =
      move === 'remove'
        ? await api.DELETE('/api/v1/weddings/{weddingId}/photos/{photoId}', params)
        : move === 'approve'
          ? await api.POST('/api/v1/weddings/{weddingId}/photos/{photoId}/approve', params)
          : move === 'reject'
            ? await api.POST('/api/v1/weddings/{weddingId}/photos/{photoId}/reject', params)
            : move === 'hide'
              ? await api.POST('/api/v1/weddings/{weddingId}/photos/{photoId}/hide', params)
              : await api.POST('/api/v1/weddings/{weddingId}/photos/{photoId}/restore', params);
    if (result.response.ok) return null;
    return toFailure(result.response.status, result.error).message;
  } catch {
    return networkFailure().message;
  }
}

/** Approves, rejects or deletes several photos; the message to show when it fails. */
export async function moveMany(
  weddingId: string,
  photoIds: readonly string[],
  action: 'approve' | 'reject' | 'remove',
): Promise<string | null> {
  try {
    for (let start = 0; start < photoIds.length; start += 100) {
      const { response, error } = await api.POST('/api/v1/weddings/{weddingId}/photos/moderation', {
        params: { path: { weddingId } },
        body: { action, photoIds: photoIds.slice(start, start + 100) },
      });
      if (!response.ok) return toFailure(response.status, error).message;
    }
    return null;
  } catch {
    return networkFailure().message;
  }
}

/** "18 mins ago", "2 hours ago", "3 days ago". */
export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const format = new Intl.RelativeTimeFormat('en-IN', { numeric: 'auto' });
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ];
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
  }
  return 'just now';
}
