import { NotFoundException } from '@nestjs/common';

/**
 * Also for an event of another wedding, or one that was deleted: isolation
 * never says which.
 */
export function eventNotFound(): NotFoundException {
  return new NotFoundException({ code: 'EVENT_NOT_FOUND', message: 'Event not found.' });
}
