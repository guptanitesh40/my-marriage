import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { getRequestId } from './request-context.js';
import { logTrace, startTrace, traceMode } from './tracing.js';

const logger = new Logger('HTTP');

/**
 * One line per request. The path is logged without its query string, and
 * headers and bodies are never logged: any of them can carry a bearer token.
 *
 * With tracing on (LOG_TRACE), the line also carries the request's trace:
 * every function it went through, for every request (`full`) or only for
 * failed ones (`errors`). Tracing masks secrets in the values it records.
 */
export function accessLog(req: Request, res: Response, next: NextFunction): void {
  const startedAt = performance.now();
  const path = req.originalUrl.split('?', 1)[0] ?? '';
  startTrace(`${req.method} ${path}`, (trace) => {
    res.on('finish', () => {
      // Probes arrive every few seconds; only a failing one is worth a line.
      if (res.statusCode < 400 && /\/health\/(live|ready)$/.test(path)) return;
      const fields = {
        requestId: getRequestId(res),
        method: req.method,
        path,
        status: res.statusCode,
        durationMs: Math.round(performance.now() - startedAt),
      };
      if (trace && (traceMode() === 'full' || res.statusCode >= 400)) {
        logTrace(logger, trace, {
          message: 'request',
          summary: `${req.method} ${path} → ${res.statusCode} in ${fields.durationMs}ms  ${fields.requestId}`,
          fields,
          failed: res.statusCode >= 500,
        });
      } else {
        logger.log('request', fields);
      }
    });
    next();
  });
}

/**
 * Safe defaults for every response. Nothing is cacheable unless a handler
 * opts in, so private data cannot be stored by a browser or a CDN by accident;
 * public routes set their own Cache-Control.
 */
export function defaultHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
}
