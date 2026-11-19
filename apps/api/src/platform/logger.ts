import { ConsoleLogger } from '@nestjs/common';
import { currentRequestId } from './request-context.js';

/** JSON lines in production, for the log service; readable text elsewhere. */
export const JSON_LOGS = process.env.NODE_ENV === 'production';

/**
 * The one logger for the API, the worker and the migration runner: JSON lines
 * in production, readable text otherwise. Pass structured fields as a second
 * argument — `logger.log('message', { weddingId })` — rather than building them
 * into the message string.
 */
export class AppLogger extends ConsoleLogger {
  constructor() {
    super({
      // Read directly: the logger has to exist before the config module loads.
      json: JSON_LOGS,
      flattenParams: true,
      // A safety net, not the control: never pass a secret to the logger at all.
      redact: [
        'password',
        'currentPassword',
        'newPassword',
        'token',
        'secret',
        'cookie',
        'set-cookie',
        'authorization',
      ],
    });
  }

  /** Stamps every production log line written while handling a request with its ID. */
  protected override getJsonLogObject(
    ...args: Parameters<ConsoleLogger['getJsonLogObject']>
  ): ReturnType<ConsoleLogger['getJsonLogObject']> {
    const record = super.getJsonLogObject(...args);
    const requestId = currentRequestId();
    return requestId ? { ...record, requestId } : record;
  }
}
