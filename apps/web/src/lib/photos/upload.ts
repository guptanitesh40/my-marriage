import { api } from '@/lib/api/browser';
import { networkFailure, toFailure } from '@/lib/api/errors';

/** As the API accepts them (decision 0019). */
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const PHOTO_MAX_BYTES = 25_000_000;
/** Photos chosen at once (Stitch guest upload: "Up to 30 photos"). */
export const PHOTO_BATCH = 30;

export type PhotoType = (typeof PHOTO_TYPES)[number];

/** Why a file can't be uploaded, before anything is sent; null when it can. */
export function photoProblem(file: Pick<File, 'type' | 'size'>): string | null {
  if (!PHOTO_TYPES.includes(file.type as PhotoType)) {
    return 'This file type isn’t supported. Choose a JPG, PNG or WebP photo.';
  }
  if (file.size === 0) return 'This file is empty.';
  if (file.size > PHOTO_MAX_BYTES) return 'This photo is larger than 25 MB.';
  return null;
}

export type UploadOutcome =
  { ok: true } | { ok: false; message: string; code: string; retry: boolean };

/** Codes after which trying the same file again can't help. */
const FINAL = new Set([
  'UPLOAD_NOT_IMAGE',
  'UPLOAD_TOO_LARGE',
  'VALIDATION_ERROR',
  'ALBUM_NOT_FOUND',
]);

/**
 * Uploads one photo (architecture §5.3): the API sets space aside and
 * gives a short-lived form, the file goes straight to storage with
 * progress, then the API checks it. The form is never logged or kept.
 */
export async function uploadPhoto(
  albumId: string,
  file: File,
  onProgress: (fraction: number) => void,
  options: { guest?: boolean; uploaderName?: string } = {},
): Promise<UploadOutcome> {
  try {
    const body = {
      albumId,
      fileName: file.name || 'photo',
      contentType: file.type as PhotoType,
      declaredBytes: file.size,
      ...(options.uploaderName ? { uploaderName: options.uploaderName } : {}),
    };
    // A guest uploads with the upload link's session; a member with their own.
    const started = options.guest
      ? await api.POST('/api/v1/upload-access/uploads', { body })
      : await api.POST('/api/v1/media/uploads/initiate', { body });
    if (!started.data) return failed(started.response.status, started.error);
    const { id, upload } = started.data.data;
    if (!upload)
      return { ok: false, code: 'UNKNOWN', message: 'The upload didn’t start.', retry: true };

    const sent = await send(upload.url, upload.fields, file, onProgress);
    if (!sent) {
      return {
        ok: false,
        code: 'NETWORK',
        message: 'The photo didn’t finish uploading. Check your connection and try again.',
        retry: true,
      };
    }

    // The file can take a moment to be visible after it is sent: one more try.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const params = { params: { path: { uploadId: id } } };
      const done = options.guest
        ? await api.POST('/api/v1/upload-access/uploads/{uploadId}/complete', params)
        : await api.POST('/api/v1/media/uploads/{uploadId}/complete', params);
      if (done.data) return { ok: true };
      const failure = toFailure(done.response.status, done.error);
      if (failure.code !== 'UPLOAD_NOT_RECEIVED' || attempt === 1) {
        return failed(done.response.status, done.error);
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    return { ok: false, code: 'UNKNOWN', message: 'The upload didn’t finish.', retry: true };
  } catch {
    const failure = networkFailure();
    return { ok: false, code: failure.code, message: failure.message, retry: true };
  }
}

function failed(status: number, error: Parameters<typeof toFailure>[1]): UploadOutcome {
  const failure = toFailure(status, error);
  return {
    ok: false,
    code: failure.code,
    message: failure.fields.declaredBytes ?? failure.fields.contentType ?? failure.message,
    retry: !FINAL.has(failure.code) && failure.code !== 'STORAGE_FULL',
  };
}

/** Posts the form with the file, reporting progress; true when storage took it. */
function send(
  url: string,
  fields: Record<string, string>,
  file: File,
  onProgress: (fraction: number) => void,
): Promise<boolean> {
  return new Promise((resolve) => {
    const body = new FormData();
    for (const [key, value] of Object.entries(fields)) body.append(key, value);
    body.append('file', file, file.name || 'photo');
    const request = new XMLHttpRequest();
    request.open('POST', url);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    request.onload = () => resolve(request.status >= 200 && request.status < 300);
    request.onerror = () => resolve(false);
    request.onabort = () => resolve(false);
    request.send(body);
  });
}
