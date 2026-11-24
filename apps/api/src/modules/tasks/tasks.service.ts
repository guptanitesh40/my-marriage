import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import {
  Types,
  type ClientSession,
  type Connection,
  type QueryFilter,
  type Model,
  type UpdateQuery,
} from 'mongoose';
import { parseObjectId } from '../../platform/mongo.js';
import { Traced } from '../../platform/tracing.js';
import { AccountsService } from '../auth/accounts.service.js';
import type { AuthenticatedUser } from '../auth/sessions.service.js';
import { todayIn, wallClock, zonedInstant } from '../events/event-time.js';
import { EventsService } from '../events/events.service.js';
import type { MemberDto } from '../weddings/dto/member.dto.js';
import { WeddingAccessService } from '../weddings/wedding-access.service.js';
import { weddingArchived } from '../weddings/wedding-errors.js';
import { WeddingsService } from '../weddings/weddings.service.js';
import type { CreateTaskDto } from './dto/create-task.dto.js';
import type { ListTasksQueryDto, TaskSort } from './dto/list-tasks.query.dto.js';
import type {
  EventTaskCountsDto,
  TaskCountsDto,
  TaskDto,
  TaskListDto,
  TaskSummaryDto,
} from './dto/task.dto.js';
import type { UpdateTaskDto } from './dto/update-task.dto.js';
import { WeddingTask, type TaskState } from './schemas/task.schema.js';
import { taskNotFound, timeWithoutDay, unknownAssignee, unknownEvent } from './task-errors.js';
import { DUE_SOON_DAYS, TASK_LIST_LIMIT, TASK_TIME_ZONE } from './task-policy.js';

type StoredTask = WeddingTask & { _id: Types.ObjectId };

/** What a list of tasks needs to show names instead of IDs. */
interface Context {
  members: Map<string, MemberDto>;
  events: Map<string, string>;
  /** Names of people who completed tasks but are no longer on the team. */
  others: Map<string, string>;
  now: Date;
}

const OPEN_STATES: TaskState[] = ['todo', 'in_progress'];

/** Text searched for as typed, not as a pattern. */
function literal(text: string): RegExp {
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

/** Sort keys for the list; tasks without a due day always come last. */
const SORTS: Record<TaskSort, Record<string, 1 | -1>> = {
  due: { noDue: 1, dueDate: 1, noTime: 1, dueAt: 1, createdAt: 1 },
  due_desc: { noDue: 1, dueDate: -1, noTime: 1, dueAt: -1, createdAt: -1 },
  priority: { rank: 1, noDue: 1, dueDate: 1, noTime: 1, dueAt: 1, createdAt: 1 },
  updated: { updatedAt: -1, _id: -1 },
};

/**
 * A wedding's tasks (PRD TASK-01 to TASK-05), for its owners and managers.
 * Every query is scoped to the wedding the access check returned. Linked
 * events must be the wedding's own, and assignees its active members.
 */
@Traced()
@Injectable()
export class TasksService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(WeddingTask.name) private readonly tasks: Model<WeddingTask>,
    private readonly access: WeddingAccessService,
    private readonly weddings: WeddingsService,
    private readonly events: EventsService,
    private readonly accounts: AccountsService,
  ) {}

  /**
   * The tasks matching every filter given, sorted, at most TASK_LIST_LIMIT,
   * with how many of the wedding's tasks fall in each view. Archived
   * weddings stay readable.
   */
  async list(
    user: AuthenticatedUser,
    weddingId: string,
    query: ListTasksQueryDto,
  ): Promise<TaskListDto> {
    const { wedding, userId } = await this.access.require(user, weddingId);
    const now = new Date();
    const members = await this.weddings.memberDirectory(wedding._id);
    const match: QueryFilter<WeddingTask> = { weddingId: wedding._id };
    const filters = this.filtersOf(query, userId, members, now);
    if (filters.length > 0) match.$and = filters;

    const [found, counts] = await Promise.all([
      this.tasks.aggregate<StoredTask>([
        { $match: match },
        {
          $addFields: {
            noDue: { $cond: [{ $ifNull: ['$dueDate', false] }, 0, 1] },
            noTime: { $cond: [{ $ifNull: ['$dueAt', false] }, 0, 1] },
            rank: {
              $switch: {
                branches: [
                  { case: { $eq: ['$priority', 'high'] }, then: 0 },
                  { case: { $eq: ['$priority', 'normal'] }, then: 1 },
                ],
                default: 2,
              },
            },
          },
        },
        { $sort: SORTS[query.sort ?? 'due'] },
        { $limit: TASK_LIST_LIMIT + 1 },
        { $project: { noDue: 0, noTime: 0, rank: 0 } },
      ]),
      this.counts(wedding._id, userId, now),
    ]);
    const shown = found.slice(0, TASK_LIST_LIMIT);
    const context = await this.contextOf(wedding._id, members, shown, now);
    return {
      tasks: shown.map((task) => this.toDto(task, context)),
      truncated: found.length > TASK_LIST_LIMIT,
      counts,
    };
  }

  /**
   * How many tasks each ceremony has, how many are completed and how many
   * overdue, for the Events page. Cancelled tasks are left out, as are
   * deleted events.
   */
  async summary(user: AuthenticatedUser, weddingId: string): Promise<TaskSummaryDto> {
    const { wedding } = await this.access.require(user, weddingId);
    const now = new Date();
    const today = new Date(`${todayIn(TASK_TIME_ZONE, now)}T00:00:00Z`);
    const open = { $in: ['$state', OPEN_STATES] };
    const pastDue = {
      $or: [
        { $and: [{ $ifNull: ['$dueAt', false] }, { $lt: ['$dueAt', now] }] },
        {
          $and: [
            { $not: [{ $ifNull: ['$dueAt', false] }] },
            { $ifNull: ['$dueDate', false] },
            { $lt: ['$dueDate', today] },
          ],
        },
      ],
    };
    const [groups, events] = await Promise.all([
      this.tasks.aggregate<{
        _id: Types.ObjectId;
        total: number;
        completed: number;
        overdue: number;
      }>([
        {
          $match: {
            weddingId: wedding._id,
            eventId: { $ne: null },
            state: { $ne: 'cancelled' },
          },
        },
        {
          $group: {
            _id: '$eventId',
            total: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ['$state', 'completed'] }, 1, 0] } },
            overdue: { $sum: { $cond: [{ $and: [open, pastDue] }, 1, 0] } },
          },
        },
      ]),
      this.events.titles(wedding._id),
    ]);
    const counts: EventTaskCountsDto[] = groups
      .filter((group) => events.has(group._id.toHexString()))
      .map((group) => ({
        eventId: group._id.toHexString(),
        total: group.total,
        completed: group.completed,
        overdue: group.overdue,
      }));
    return { events: counts };
  }

  /**
   * Adds a task to an active wedding. The event and the assignee are
   * checked, and the task written, in one transaction with the archive
   * write fence.
   */
  async create(user: AuthenticatedUser, weddingId: string, input: CreateTaskDto): Promise<TaskDto> {
    const { wedding, userId } = await this.access.require(user, weddingId);
    if (wedding.status !== 'active') throw weddingArchived();
    if (input.dueTime && !input.dueDate) throw timeWithoutDay();
    const eventId = input.eventId ? new Types.ObjectId(input.eventId) : undefined;
    const assigneeId = input.assigneeId ? new Types.ObjectId(input.assigneeId) : undefined;
    const state = input.state ?? 'todo';
    const now = new Date();

    const record: Omit<WeddingTask, 'createdAt' | 'updatedAt'> = {
      weddingId: wedding._id,
      title: input.title,
      ...(input.description ? { description: input.description } : {}),
      ...(eventId ? { eventId } : {}),
      ...(assigneeId ? { assigneeId } : {}),
      ...(input.dueDate ? { dueDate: new Date(`${input.dueDate}T00:00:00Z`) } : {}),
      ...(input.dueDate && input.dueTime
        ? { dueAt: zonedInstant(input.dueDate, input.dueTime, TASK_TIME_ZONE) }
        : {}),
      priority: input.priority ?? 'normal',
      state,
      ...(state === 'completed' ? { completedAt: now, completedBy: userId } : {}),
      createdBy: userId,
    };

    const created = await this.connection.transaction(async (session) => {
      if (eventId && !(await this.events.exists(wedding._id, eventId, session))) {
        throw unknownEvent();
      }
      if (assigneeId && !(await this.access.isActiveMember(wedding._id, assigneeId, session))) {
        throw unknownAssignee();
      }
      await this.access.raiseWriteFence(wedding._id, session);
      const [task] = await this.tasks.create([record], { session });
      return task;
    });
    if (!created) throw new Error('The task was not created');
    return this.present(wedding._id, created.toObject());
  }

  /**
   * Changes a task of an active wedding. It is read and written in one
   * transaction with the write fence, so two changes at once cannot both
   * work from the same old version. Completing records when and by whom;
   * reopening clears it.
   */
  async update(
    user: AuthenticatedUser,
    weddingId: string,
    taskId: string,
    input: UpdateTaskDto,
  ): Promise<TaskDto> {
    const { wedding, userId } = await this.access.require(user, weddingId);
    if (wedding.status !== 'active') throw weddingArchived();
    const id = parseObjectId(taskId);
    if (!id) throw taskNotFound();
    const filter = { _id: id, weddingId: wedding._id };

    const updated = await this.connection.transaction(async (session) => {
      const task = await this.tasks.findOne(filter).session(session).lean();
      if (!task) throw taskNotFound();
      if (input.eventId) {
        const eventId = new Types.ObjectId(input.eventId);
        if (!(await this.events.exists(wedding._id, eventId, session))) throw unknownEvent();
      }
      if (input.assigneeId) {
        const assigneeId = new Types.ObjectId(input.assigneeId);
        if (!(await this.access.isActiveMember(wedding._id, assigneeId, session))) {
          throw unknownAssignee();
        }
      }
      const change = this.changeOf(task, input, userId);
      await this.access.raiseWriteFence(wedding._id, session);
      return this.tasks
        .findOneAndUpdate(filter, change, { returnDocument: 'after', session })
        .lean();
    });
    if (!updated) throw taskNotFound();
    return this.present(wedding._id, updated);
  }

  /** The list filters, each narrowing the others. */
  private filtersOf(
    query: ListTasksQueryDto,
    userId: Types.ObjectId,
    members: MemberDto[],
    now: Date,
  ): QueryFilter<WeddingTask>[] {
    const filters: QueryFilter<WeddingTask>[] = [];
    if (query.view === 'mine') filters.push({ assigneeId: userId });
    if (query.view === 'overdue') filters.push(this.overdue(now));
    if (query.view === 'completed') filters.push({ state: 'completed' });
    if (query.state) filters.push({ state: query.state });
    if (query.priority) filters.push({ priority: query.priority });
    if (query.eventId) {
      filters.push({
        eventId: query.eventId === 'none' ? null : new Types.ObjectId(query.eventId),
      });
    }
    if (query.assigneeId) {
      filters.push({
        assigneeId: query.assigneeId === 'none' ? null : new Types.ObjectId(query.assigneeId),
      });
    }
    if (query.q) {
      const words = literal(query.q);
      const named = members
        .filter((member) => words.test(member.displayName))
        .map((member) => new Types.ObjectId(member.userId));
      filters.push({
        $or: [
          { title: words },
          { description: words },
          ...(named.length > 0 ? [{ assigneeId: { $in: named } }] : []),
        ],
      });
    }
    return filters;
  }

  /**
   * Open and past due: past its time, or, with only a day, past that day
   * in India.
   */
  private overdue(now: Date): QueryFilter<WeddingTask> {
    const today = new Date(`${todayIn(TASK_TIME_ZONE, now)}T00:00:00Z`);
    return {
      state: { $in: OPEN_STATES },
      $or: [{ dueAt: { $lt: now } }, { dueAt: null, dueDate: { $lt: today } }],
    };
  }

  private async counts(
    weddingId: Types.ObjectId,
    userId: Types.ObjectId,
    now: Date,
  ): Promise<TaskCountsDto> {
    const [all, mine, overdue, inProgress, completed] = await Promise.all([
      this.tasks.countDocuments({ weddingId }),
      this.tasks.countDocuments({ weddingId, assigneeId: userId }),
      this.tasks.countDocuments({ weddingId, ...this.overdue(now) }),
      this.tasks.countDocuments({ weddingId, state: 'in_progress' }),
      this.tasks.countDocuments({ weddingId, state: 'completed' }),
    ]);
    return { all, mine, overdue, inProgress, completed };
  }

  /** The update that applies `input` to `task`. */
  private changeOf(
    task: StoredTask,
    input: UpdateTaskDto,
    userId: Types.ObjectId,
  ): UpdateQuery<WeddingTask> {
    const storedDay = task.dueDate?.toISOString().slice(0, 10);
    const storedTime = task.dueAt ? wallClock(task.dueAt, TASK_TIME_ZONE).time : undefined;
    const day = input.dueDate === undefined ? storedDay : (input.dueDate ?? undefined);
    // Removing the day removes the time, which means nothing without it.
    const time =
      input.dueTime !== undefined
        ? (input.dueTime ?? undefined)
        : input.dueDate === null
          ? undefined
          : storedTime;
    if (time && !day) throw timeWithoutDay();
    const state = input.state ?? task.state;

    const set: Partial<WeddingTask> = { state };
    const unset: Record<string, 1> = {};
    if (input.title !== undefined) set.title = input.title;
    if (input.priority !== undefined) set.priority = input.priority;
    if (input.description !== undefined) {
      if (input.description) set.description = input.description;
      else unset.description = 1;
    }
    if (input.eventId !== undefined) {
      if (input.eventId) set.eventId = new Types.ObjectId(input.eventId);
      else unset.eventId = 1;
    }
    if (input.assigneeId !== undefined) {
      if (input.assigneeId) set.assigneeId = new Types.ObjectId(input.assigneeId);
      else unset.assigneeId = 1;
    }
    if (day) set.dueDate = new Date(`${day}T00:00:00Z`);
    else unset.dueDate = 1;
    if (day && time) set.dueAt = zonedInstant(day, time, TASK_TIME_ZONE);
    else unset.dueAt = 1;
    if (state === 'completed' && task.state !== 'completed') {
      set.completedAt = new Date();
      set.completedBy = userId;
    }
    if (state !== 'completed' && task.state === 'completed') {
      unset.completedAt = 1;
      unset.completedBy = 1;
    }
    return { $set: set, ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}) };
  }

  /** One task as its DTO, after a change. */
  private async present(weddingId: Types.ObjectId, task: StoredTask): Promise<TaskDto> {
    const members = await this.weddings.memberDirectory(weddingId);
    const context = await this.contextOf(weddingId, members, [task], new Date());
    return this.toDto(task, context);
  }

  private async contextOf(
    weddingId: Types.ObjectId,
    members: MemberDto[],
    tasks: StoredTask[],
    now: Date,
  ): Promise<Context> {
    const byId = new Map(members.map((member) => [member.userId, member]));
    const formerIds = [
      ...new Set(
        tasks.flatMap((task) =>
          task.completedBy && !byId.has(task.completedBy.toHexString())
            ? [task.completedBy.toHexString()]
            : [],
        ),
      ),
    ].map((id) => new Types.ObjectId(id));
    const [events, others] = await Promise.all([
      this.events.titles(weddingId),
      this.accounts.displayNames(formerIds),
    ]);
    return { members: byId, events, others, now };
  }

  private toDto(task: StoredTask, context: Context): TaskDto {
    const eventId = task.eventId?.toHexString();
    const eventTitle = eventId ? context.events.get(eventId) : undefined;
    // Someone no longer on the team keeps no assignment (PRD TASK-04).
    const assignee = task.assigneeId
      ? context.members.get(task.assigneeId.toHexString())
      : undefined;
    const today = todayIn(TASK_TIME_ZONE, context.now);
    const dueDate = task.dueDate?.toISOString().slice(0, 10);
    const open = OPEN_STATES.includes(task.state);
    const overdue =
      open &&
      (task.dueAt
        ? task.dueAt.getTime() < context.now.getTime()
        : dueDate !== undefined && dueDate < today);
    const completedBy = task.completedBy?.toHexString();
    const completedName = completedBy
      ? (context.members.get(completedBy)?.displayName ?? context.others.get(completedBy))
      : undefined;

    return {
      id: task._id.toHexString(),
      title: task.title,
      ...(task.description ? { description: task.description } : {}),
      ...(eventId && eventTitle ? { event: { id: eventId, title: eventTitle } } : {}),
      ...(assignee ? { assignee } : {}),
      ...(dueDate ? { dueDate } : {}),
      ...(task.dueAt
        ? { dueTime: wallClock(task.dueAt, TASK_TIME_ZONE).time, dueAt: task.dueAt }
        : {}),
      overdue,
      priority: task.priority,
      state: task.state,
      ...(task.completedAt ? { completedAt: task.completedAt } : {}),
      ...(completedBy
        ? {
            completedBy: {
              userId: completedBy,
              ...(completedName ? { displayName: completedName } : {}),
            },
          }
        : {}),
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  /**
   * The wedding's open work, for the overview (PRD DASH-01): how many tasks
   * are open, overdue, and due in the next DUE_SOON_DAYS days without being
   * overdue yet, and the first few needing attention. Overdue ones come
   * first because they are the earliest due; tasks without a day come last.
   * The caller has checked access.
   */
  async attention(
    weddingId: Types.ObjectId,
    now: Date,
    limit: number,
  ): Promise<{ open: number; overdue: number; dueSoon: number; tasks: TaskDto[] }> {
    const today = new Date(`${todayIn(TASK_TIME_ZONE, now)}T00:00:00Z`);
    const horizon = new Date(today.getTime() + DUE_SOON_DAYS * 24 * 60 * 60 * 1000);
    const open = { weddingId, state: { $in: OPEN_STATES } };
    const [openCount, overdue, dueSoon, found, members] = await Promise.all([
      this.tasks.countDocuments(open),
      this.tasks.countDocuments({ weddingId, ...this.overdue(now) }),
      this.tasks.countDocuments({
        ...open,
        dueDate: { $gte: today, $lte: horizon },
        $or: [{ dueAt: null }, { dueAt: { $gte: now } }],
      }),
      this.tasks.aggregate<StoredTask>([
        { $match: open },
        {
          $addFields: {
            noDue: { $cond: [{ $ifNull: ['$dueDate', false] }, 0, 1] },
            noTime: { $cond: [{ $ifNull: ['$dueAt', false] }, 0, 1] },
            rank: {
              $switch: {
                branches: [
                  { case: { $eq: ['$priority', 'high'] }, then: 0 },
                  { case: { $eq: ['$priority', 'normal'] }, then: 1 },
                ],
                default: 2,
              },
            },
          },
        },
        { $sort: { noDue: 1, dueDate: 1, noTime: 1, dueAt: 1, rank: 1, createdAt: -1, _id: 1 } },
        { $limit: limit },
        { $project: { noDue: 0, noTime: 0, rank: 0 } },
      ]),
      this.weddings.memberDirectory(weddingId),
    ]);
    const context = await this.contextOf(weddingId, members, found, now);
    return {
      open: openCount,
      overdue,
      dueSoon,
      tasks: found.map((task) => this.toDto(task, context)),
    };
  }

  /**
   * Open tasks per assignee, for the team page: user ID to count. Only
   * open ones: a finished task is no longer someone's work.
   */
  async openCounts(weddingId: Types.ObjectId): Promise<Map<string, number>> {
    const rows = await this.tasks
      .aggregate<{ _id: Types.ObjectId; count: number }>([
        { $match: { weddingId, state: { $in: OPEN_STATES }, assigneeId: { $exists: true } } },
        { $group: { _id: '$assigneeId', count: { $sum: 1 } } },
      ])
      .exec();
    return new Map(rows.map((row) => [row._id.toHexString(), row.count]));
  }

  /**
   * Leaves every task of someone removed from the team unassigned, in the
   * removal's transaction (decision 0020); who completed a task is kept.
   * Returns how many tasks changed.
   */
  async unassignMember(
    weddingId: Types.ObjectId,
    userId: Types.ObjectId,
    session: ClientSession,
  ): Promise<number> {
    const changed = await this.tasks.updateMany(
      { weddingId, assigneeId: userId },
      { $unset: { assigneeId: 1 } },
      { session },
    );
    return changed.modifiedCount;
  }
}
