import { OptionalDateField, TextLineField } from '../../weddings/dto/fields.js';
import { OptionalTextBlockField, OptionalTimeField } from '../../events/dto/fields.js';
import {
  TASK_PRIORITIES,
  TASK_STATES,
  type TaskPriority,
  type TaskState,
} from '../schemas/task.schema.js';
import { TASK_LIMITS } from '../task-policy.js';
import { PRIORITY_MESSAGE, STATE_MESSAGE } from './create-task.dto.js';
import { OptionalChoiceField, OptionalIdField } from './fields.js';

/**
 * Changes to a task (PRD TASK-01, TASK-02, TASK-04). Fields left out stay
 * as they are; `null` clears an optional one. Completing records when and
 * by whom; reopening clears that.
 */
export class UpdateTaskDto {
  @TextLineField({
    maxLength: TASK_LIMITS.title,
    empty: 'Enter what needs to be done.',
    example: 'Book Haldi decorator',
    optional: true,
  })
  title?: string;

  /** `null` removes it. */
  @OptionalTextBlockField({
    maxLength: TASK_LIMITS.description,
    example: 'Marigold strings and floral seating.',
    nullable: true,
  })
  description?: string | null;

  /** `null` makes it a general task. */
  @OptionalIdField({ message: 'Choose one of this wedding’s events, or General.', nullable: true })
  eventId?: string | null;

  /** `null` unassigns it. */
  @OptionalIdField({
    message: 'Choose someone on this wedding’s team, or leave it unassigned.',
    nullable: true,
  })
  assigneeId?: string | null;

  /** `null` removes the due day and the time with it. */
  @OptionalDateField({ nullable: true })
  dueDate?: string | null;

  /** `null` removes the time; needs a day. */
  @OptionalTimeField({ nullable: true })
  dueTime?: string | null;

  @OptionalChoiceField(TASK_PRIORITIES, PRIORITY_MESSAGE)
  priority?: TaskPriority;

  @OptionalChoiceField(TASK_STATES, STATE_MESSAGE)
  state?: TaskState;
}
