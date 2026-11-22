/**
 * Photo and album rules shared by the DTOs and the services (decision 0019).
 */

export const ALBUM_LIMITS = {
  title: 80,
  /** Albums a wedding can add besides its automatic ones. */
  customAlbums: 50,
} as const;

/** The name of the album every wedding has for photos of no one ceremony. */
export const GENERAL_ALBUM_TITLE = 'General Collection';

/** The largest photo accepted: phone and camera originals fit (decision 0019). */
export const PHOTO_MAX_BYTES = 25_000_000;

/** Decoding limit: refuses decompression bombs and anything larger than a 50 MP camera. */
export const PHOTO_MAX_PIXELS = 50_000_000;

/**
 * Space set aside per upload, as a share of its size: the original plus
 * its display copies, which are much smaller. Settled to the real total
 * once processed.
 */
export const RESERVE_FACTOR = 1.3;

/** How long an upload form works. */
export const UPLOAD_FORM_SECONDS = 600;

/** After this, an upload never completed gives its space back (the form has long expired). */
export const UPLOAD_EXPIRY_SECONDS = 900;

/** Longest side of each display copy, in pixels. */
export const PHOTO_SIZES = { display: 2048, thumb: 480 } as const;
export type PhotoSize = keyof typeof PHOTO_SIZES;

/** The photos one album list returns, newest first. */
export const PHOTO_LIST_LIMIT = 500;

/** How often the worker gives back the space of abandoned uploads. */
export const SWEEP_MINUTES = 10;

export const UPLOAD_LIMITS = {
  fileName: 200,
  uploaderName: 60,
} as const;

/** How long opening an upload link lets a guest upload, before opening it again. */
export const UPLOAD_SESSION_HOURS = 2;

const minutes = (n: number) => n * 60;
const hours = (n: number) => n * 3600;

/** Guest upload limits (decision 0019). Links are unguessable; these stop floods. */
export const UPLOAD_LINK_LIMITS = {
  exchangePerIp: { name: 'upload-exchange-ip', limit: 30, windowSeconds: minutes(15) },
  uploadsPerSession: { name: 'upload-session-hour', limit: 100, windowSeconds: hours(1) },
  uploadsPerLink: { name: 'upload-link-day', limit: 1000, windowSeconds: hours(24) },
} as const;

/** Export ZIPs are kept this long, then removed (decision 0019). */
export const EXPORT_KEEP_DAYS = 7;

/** Exports one wedding can start in a day. */
export const EXPORTS_PER_DAY = {
  name: 'media-export-wedding-day',
  limit: 10,
  windowSeconds: 86_400,
};
