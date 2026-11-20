import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, type HydratedDocument } from 'mongoose';

export const TASK_PRIORITIES = ['low', 'normal', 'high'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_STATES = ['todo', 'in_progress', 'completed', 'cancelled'] as const;
export type TaskState = (typeof TASK_STATES)[number];

/**
 * A wedding task (schema document §4.09, PRD TASK-01 to TASK-05). Named
 * WeddingTask to keep it apart from other things called tasks. Never
 * returned from a controller; see TaskDto.
 *
 * `dueDate` is an addition to the schema document (decision 0012), as for
 * events: a task is often due on a day before it is due at a time.
 * `dueAt` is set only when the time is known too.
 */
@Schema({ collection: 'tasks', timestamps: true })
export class WeddingTask {
  @Prop({ type: Types.ObjectId, required: true })
  weddingId: Types.ObjectId;

  /** The ceremony it belongs to; none for a general task. */
  @Prop({ type: Types.ObjectId })
  eventId?: Types.ObjectId;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String })
  description?: string;

  /** An active owner or manager of the wedding when assigned (PRD TASK-05). */
  @Prop({ type: Types.ObjectId })
  assigneeId?: Types.ObjectId;

  /** The day it is due, in India time, stored as midnight UTC. */
  @Prop({ type: Date })
  dueDate?: Date;

  /** The instant it is due, when the time is known too. */
  @Prop({ type: Date })
  dueAt?: Date;

  @Prop({ type: String, enum: TASK_PRIORITIES, required: true, default: 'normal' })
  priority: TaskPriority;

  @Prop({ type: String, enum: TASK_STATES, required: true })
  state: TaskState;

  /** When and by whom it was completed; cleared if it is reopened (PRD TASK-02). */
  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ type: Types.ObjectId })
  completedBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  createdBy: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export type WeddingTaskDocument = HydratedDocument<WeddingTask>;
export const WeddingTaskSchema = SchemaFactory.createForClass(WeddingTask);

// Schema document §4.09: My Tasks, by event, and by state, each by due time.
WeddingTaskSchema.index({ weddingId: 1, assigneeId: 1, state: 1, dueAt: 1 });
WeddingTaskSchema.index({ weddingId: 1, eventId: 1, dueAt: 1 });
WeddingTaskSchema.index({ weddingId: 1, state: 1, dueAt: 1 });
