import 'server-only';
import type { components } from '@my-marriage/contracts';
import { serverApi } from '@/lib/api/server';

export type Album = components['schemas']['AlbumDto'];
export type Quota = components['schemas']['QuotaDto'];
export type Photo = components['schemas']['PhotoDto'];
export type PhotoList = components['schemas']['PhotoListDto'];
export type UploadLink = components['schemas']['UploadLinkDto'];
export type UploadLinks = components['schemas']['UploadLinksDto'];
export type ReviewQueue = components['schemas']['ReviewQueueDto'];

export type AlbumsResult = { kind: 'ok'; albums: Album[] } | { kind: 'unavailable' };
export type QuotaResult = ({ kind: 'ok' } & Quota) | { kind: 'unavailable' };

/**
 * A wedding's albums; the API makes each ceremony's album and the general
 * one as needed. Reads the request: call it inside <Suspense>. The
 * workspace layout has already answered "not found" for a wedding the
 * visitor does not belong to.
 */
export async function getAlbums(weddingId: string): Promise<AlbumsResult> {
  try {
    const api = await serverApi();
    const { data } = await api.GET('/api/v1/weddings/{weddingId}/albums', {
      params: { path: { weddingId } },
    });
    return data ? { kind: 'ok', albums: data.data.albums } : { kind: 'unavailable' };
  } catch {
    return { kind: 'unavailable' };
  }
}

/** The wedding's photo storage. */
export async function getQuota(weddingId: string): Promise<QuotaResult> {
  try {
    const api = await serverApi();
    const { data } = await api.GET('/api/v1/weddings/{weddingId}/quota', {
      params: { path: { weddingId } },
    });
    return data ? { kind: 'ok', ...data.data } : { kind: 'unavailable' };
  } catch {
    return { kind: 'unavailable' };
  }
}

export type PhotosResult = ({ kind: 'ok' } & PhotoList) | { kind: 'unavailable' };

/** An album's photos, newest first, and how many are still being processed. */
export async function getPhotos(weddingId: string, albumId: string): Promise<PhotosResult> {
  try {
    const api = await serverApi();
    const { data } = await api.GET('/api/v1/weddings/{weddingId}/albums/{albumId}/photos', {
      params: { path: { weddingId, albumId } },
    });
    return data ? { kind: 'ok', ...data.data } : { kind: 'unavailable' };
  } catch {
    return { kind: 'unavailable' };
  }
}

export type UploadLinksResult = ({ kind: 'ok' } & UploadLinks) | { kind: 'unavailable' };

/** The wedding's active guest upload links. */
export async function getUploadLinks(weddingId: string): Promise<UploadLinksResult> {
  try {
    const api = await serverApi();
    const { data } = await api.GET('/api/v1/weddings/{weddingId}/upload-links', {
      params: { path: { weddingId } },
    });
    return data ? { kind: 'ok', ...data.data } : { kind: 'unavailable' };
  } catch {
    return { kind: 'unavailable' };
  }
}

export type ReviewQueueResult = ({ kind: 'ok' } & ReviewQueue) | { kind: 'unavailable' };

/** Photos waiting for review across every album. */
export async function getReviewQueue(weddingId: string): Promise<ReviewQueueResult> {
  try {
    const api = await serverApi();
    const { data } = await api.GET('/api/v1/weddings/{weddingId}/photos/review', {
      params: { path: { weddingId } },
    });
    return data ? { kind: 'ok', ...data.data } : { kind: 'unavailable' };
  } catch {
    return { kind: 'unavailable' };
  }
}
