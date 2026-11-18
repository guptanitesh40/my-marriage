import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';

interface RequestContext {
  requestId: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

/**
 * ID of the HTTP request being handled, or undefined outside one (startup,
 * worker jobs). Services use this for audit events and logs, so they never
 * need the request object passed down to them.
 */
export function currentRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}

/**
 * Assigns every request an ID, returned in the response header and in every
 * response body, so a user-reported failure can be matched to its log lines.
 * Inbound IDs are ignored: clients must not be able to forge log correlation.
 */
export function requestContext(_req: Request, res: Response, next: NextFunction): void {
  const requestId = `req_${randomUUID()}`;
  res.setHeader(REQUEST_ID_HEADER, requestId);
  storage.run({ requestId }, next);
}

/** Reads the ID from the response, which works even where the async context is gone. */
export function getRequestId(res: Response): string {
  return String(res.getHeader(REQUEST_ID_HEADER) ?? 'req_unknown');
}
