import { ApiProperty } from '@nestjs/swagger';
import {
  MEMBERSHIP_ROLES,
  type MembershipRole,
} from '../../weddings/schemas/wedding-membership.schema.js';
import {
  TASK_PRIORITIES,
  TASK_STATES,
  type TaskPriority,
  type TaskState,
} from '../schemas/task.schema.js';

export class TaskEventDto {
  id: string;

  title: string;
}

export class TaskAssigneeDto {
  userId: string;

  displayName: string;

  @ApiProperty({ enum: MEMBERSHIP_ROLES })
  role: MembershipRole;
}

export class TaskPersonDto {
  userId: string;

  /** Missing if the account no longer exists. */
  displayName?: string;
}

/** A task as the wedding's owners and managers see it. */
export class TaskDto {
  /** Task ID. */
  id: string;

  title: string;

  description?: string;

  /** Its ceremony; missing for a general task. */
  event?: TaskEventDto;

  /** Missing when unassigned, or when the assignee is no longer on the team. */
  assignee?: TaskAssigneeDto;

  /** The day it is due (`YYYY-MM-DD`, India time). */
  @ApiProperty({ required: false, format: 'date', example: '2027-12-08' })
  dueDate?: string;

  /** The time it is due (`HH:mm`, India time). */
  @ApiProperty({ required: false, example: '14:00' })
  dueTime?: string;

  /** The instant it is due, when the time is known. */
  dueAt?: Date;

  /** Open (to do or in progress) and past its due day or time. */
  overdue: boolean;

  @ApiProperty({ enum: TASK_PRIORITIES })
  priority: TaskPriority;

  @ApiProperty({ enum: TASK_STATES })
  state: TaskState;

  completedAt?: Date;

  completedBy?: TaskPersonDto;

  createdAt: Date;

  updatedAt: Date;
}

/** How many of the wedding's tasks fall in each view, whatever the filters. */
export class TaskCountsDto {
  all: number;

  /** Assigned to you. */
  mine: number;

  overdue: number;

  inProgress: number;

  completed: number;
}

/** One ceremony's tasks, not counting cancelled ones. */
export class EventTaskCountsDto {
  eventId: string;

  total: number;

  completed: number;

  /** Open and past due. */
  overdue: number;
}

/** Task counts for each of the wedding's events that has tasks. */
export class TaskSummaryDto {
  events: EventTaskCountsDto[];
}

export class TaskListDto {
  tasks: TaskDto[];

  /** True when more tasks match than the list returns. */
  truncated: boolean;

  counts: TaskCountsDto;
}
