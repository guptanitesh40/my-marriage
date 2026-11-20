import { NotFoundException } from '@nestjs/common';
import { fieldError } from '../weddings/wedding-errors.js';

/** Also for a task of another wedding: isolation never says which. */
export function taskNotFound(): NotFoundException {
  return new NotFoundException({ code: 'TASK_NOT_FOUND', message: 'Task not found.' });
}

/** An event that is not one of this wedding's (or was deleted). */
export function unknownEvent() {
  return fieldError('eventId', 'Choose one of this wedding’s events, or General.');
}

/** Someone who is not an active owner or manager of this wedding (PRD TASK-05). */
export function unknownAssignee() {
  return fieldError('assigneeId', 'Choose someone on this wedding’s team, or leave it unassigned.');
}

export function timeWithoutDay() {
  return fieldError('dueTime', 'Choose the day first, then the time.');
}
