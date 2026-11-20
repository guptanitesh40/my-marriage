import { OptionalDateField, TextLineField } from '../../weddings/dto/fields.js';
import { OptionalTextBlockField, OptionalTimeField } from '../../events/dto/fields.js';
import {
  TASK_PRIORITIES,
  TASK_STATES,
  type TaskPriority,
  type TaskState,
} from '../schemas/task.schema.js';
import { TASK_LIMITS } from '../task-policy.js';
import { OptionalChoiceField, OptionalIdField } from './fields.js';

export const PRIORITY_MESSAGE = 'Choose low, medium or high.';
export const STATE_MESSAGE = 'Choose to do, in progress, completed or cancelled.';

/**
 * A new task (PRD TASK-01). Only the title is required: a task may be
 * general (no event), unassigned and without a due date. The due day and
 * time are in India time.
 */
export class CreateTaskDto {
  @TextLineField({
    maxLength: TASK_LIMITS.title,
    empty: 'Enter what needs to be done.',
    example: 'Book Haldi decorator',
  })
  title: string;

  @OptionalTextBlockField({
    maxLength: TASK_LIMITS.description,
    example: 'Marigold strings and floral seating.',
  })
  description?: string;

  /** One of this wedding's events; left out for a general task. */
  @OptionalIdField({ message: 'Choose one of this wedding’s events, or General.' })
  eventId?: string;

  /** An active owner or manager of this wedding; left out for an unassigned task. */
  @OptionalIdField({ message: 'Choose someone on this wedding’s team, or leave it unassigned.' })
  assigneeId?: string;

  /** The day it is due (`YYYY-MM-DD`), in India time. */
  @OptionalDateField()
  dueDate?: string;

  /** The time it is due on that day (`HH:mm`, India time); needs `dueDate`. */
  @OptionalTimeField()
  dueTime?: string;

  /** `normal` (shown as Medium) if left out. */
  @OptionalChoiceField(TASK_PRIORITIES, PRIORITY_MESSAGE)
  priority?: TaskPriority;

  /** `todo` if left out. */
  @OptionalChoiceField(TASK_STATES, STATE_MESSAGE)
  state?: TaskState;
}
