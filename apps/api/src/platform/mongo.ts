import { Types } from 'mongoose';

/** What a duplicate-key error (E11000) says about the unique index that refused the write. */
export interface DuplicateKey {
  /** The indexed fields, e.g. `{ emailNormalized: 1 }`. */
  keyPattern: Record<string, unknown>;
  /** The server's message, which names the index. */
  message: string;
}

/**
 * The duplicate-key error behind `error`, or null if it is anything else.
 * Callers check which index refused the write: a transaction can hit more
 * than one unique index, and only the one they expect means what they think.
 */
export function duplicateKey(error: unknown): DuplicateKey | null {
  if (typeof error !== 'object' || error === null || !('code' in error) || error.code !== 11000) {
    return null;
  }
  const keyPattern =
    'keyPattern' in error && typeof error.keyPattern === 'object' && error.keyPattern !== null
      ? (error.keyPattern as Record<string, unknown>)
      : {};
  const message = 'message' in error ? String(error.message) : '';
  return { keyPattern, message };
}

/**
 * An ID from a URL as an ObjectId, or null when it is not one. Only the
 * 24-hex-character form is accepted: `new Types.ObjectId()` also takes any
 * 12-character string, which no ID of ours ever is.
 */
export function parseObjectId(id: string): Types.ObjectId | null {
  return /^[a-f0-9]{24}$/i.test(id) ? new Types.ObjectId(id) : null;
}
