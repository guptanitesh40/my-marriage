import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import {
  TASK_PRIORITIES,
  TASK_STATES,
  type TaskPriority,
  type TaskState,
} from '../schemas/task.schema.js';
import { TASK_LIMITS } from '../task-policy.js';
import { PRIORITY_MESSAGE, STATE_MESSAGE } from './create-task.dto.js';
import { OptionalChoiceField, OptionalIdOrNoneField } from './fields.js';

export const TASK_VIEWS = ['all', 'mine', 'overdue', 'completed'] as const;
export type TaskView = (typeof TASK_VIEWS)[number];

export const TASK_SORTS = ['due', 'due_desc', 'priority', 'updated'] as const;
export type TaskSort = (typeof TASK_SORTS)[number];

/** What to list (PRD TASK-03). Every filter narrows the others. */
export class ListTasksQueryDto {
  /** `mine`: assigned to you. `overdue`: open and past due. `completed`. */
  @OptionalChoiceField(TASK_VIEWS, 'Choose all, mine, overdue or completed.')
  view?: TaskView;

  /** Words in the title, the description or the assignee's name. */
  @ApiProperty({ required: false, maxLength: TASK_LIMITS.search })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.normalize('NFC').trim().replace(/\s+/g, ' ') : value,
  )
  @IsString({ message: 'Enter words to search for.' })
  @MaxLength(TASK_LIMITS.search, { message: `Use ${TASK_LIMITS.search} characters or fewer.` })
  q?: string;

  /** An event's ID, or `none` for general tasks. */
  @OptionalIdOrNoneField('Choose one of this wedding’s events, or General.')
  eventId?: string;

  /** A member's user ID, or `none` for unassigned tasks. */
  @OptionalIdOrNoneField('Choose someone on this wedding’s team, or Unassigned.')
  assigneeId?: string;

  @OptionalChoiceField(TASK_STATES, STATE_MESSAGE)
  state?: TaskState;

  @OptionalChoiceField(TASK_PRIORITIES, PRIORITY_MESSAGE)
  priority?: TaskPriority;

  /** Due date (earliest first, the default), latest first, highest priority, or recently updated. */
  @OptionalChoiceField(TASK_SORTS, 'Choose how to sort.')
  sort?: TaskSort;
}
