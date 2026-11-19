import type { components } from '@my-marriage/contracts';

type ApiError = components['schemas']['ApiErrorDto'];

/** A failed API call, reduced to what a form needs to show. */
export interface Failure {
  /** HTTP status; 0 when the request never got an answer (offline). */
  status: number;
  /** The API's error code, e.g. INVALID_CREDENTIALS; NETWORK when offline. */
  code: string;
  /** Safe to show. */
  message: string;
  /** First message for each invalid field, keyed by field name. */
  fields: Record<string, string>;
  /** Seconds to wait, for RATE_LIMITED. */
  retryAfterSeconds?: number;
}

const GENERIC = 'Something went wrong on our side. Please try again in a moment.';

/** Turns the error envelope of a failed response into a `Failure`. */
export function toFailure(status: number, body: ApiError | undefined): Failure {
  const error = body?.error;
  const fields: Record<string, string> = {};
  let retryAfterSeconds: number | undefined;

  if (Array.isArray(error?.details)) {
    for (const detail of error.details) {
      const first = detail.messages[0];
      if (first && !(detail.field in fields)) fields[detail.field] = first;
    }
  } else if (error?.details && typeof error.details.retryAfterSeconds === 'number') {
    retryAfterSeconds = error.details.retryAfterSeconds;
  }

  return {
    status,
    code: error?.code ?? 'UNKNOWN',
    // A 5xx message is ours too, but never more useful than the generic one.
    message: status >= 500 || !error?.message ? GENERIC : error.message,
    fields,
    ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
  };
}

/** For a request that threw: no connection, or the server did not answer. */
export function networkFailure(): Failure {
  return {
    status: 0,
    code: 'NETWORK',
    message: 'We could not reach My Marriage. Check your connection and try again.',
    fields: {},
  };
}

/** "Please wait 3 minutes and try again." */
export function waitMessage(failure: Failure): string {
  const minutes = Math.max(1, Math.ceil((failure.retryAfterSeconds ?? 60) / 60));
  return `Too many attempts. Please wait ${minutes === 1 ? 'a minute' : `${minutes} minutes`} and try again.`;
}
