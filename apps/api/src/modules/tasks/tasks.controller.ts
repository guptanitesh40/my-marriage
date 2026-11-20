import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiDataResponse } from '../../platform/response-envelope.js';
import { CurrentUser } from '../auth/auth.decorators.js';
import type { AuthenticatedUser } from '../auth/sessions.service.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { ListTasksQueryDto } from './dto/list-tasks.query.dto.js';
import { TaskDto, TaskListDto, TaskSummaryDto } from './dto/task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { TasksService } from './tasks.service.js';

/** For a wedding's owners and managers; 404 to anyone else, as for every wedding route. */
@ApiTags('Tasks')
@ApiCookieAuth('mm_session')
@Controller('weddings/:weddingId/tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  /** The wedding's tasks matching the filters, with how many fall in each view. */
  @Get()
  @ApiOperation({ summary: 'List tasks with filters' })
  @ApiDataResponse(TaskListDto)
  @ApiNotFoundResponse({ description: 'WEDDING_NOT_FOUND: not a wedding you belong to.' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Query() query: ListTasksQueryDto,
  ): Promise<TaskListDto> {
    return this.tasks.list(user, weddingId, query);
  }

  /** Task counts for each ceremony, for the Events page. Cancelled tasks are not counted. */
  @Get('summary')
  @ApiOperation({ summary: 'Task counts by event' })
  @ApiDataResponse(TaskSummaryDto)
  @ApiNotFoundResponse({ description: 'WEDDING_NOT_FOUND: not a wedding you belong to.' })
  summary(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
  ): Promise<TaskSummaryDto> {
    return this.tasks.summary(user, weddingId);
  }

  /**
   * Adds a task. Only `title` is required; `eventId` must be one of the
   * wedding's events and `assigneeId` one of its active owners or managers.
   */
  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create task and assign wedding member' })
  @ApiDataResponse(TaskDto, { status: 201 })
  @ApiNotFoundResponse({ description: 'WEDDING_NOT_FOUND: not a wedding you belong to.' })
  @ApiConflictResponse({ description: 'WEDDING_ARCHIVED: the wedding is read-only.' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Body() body: CreateTaskDto,
  ): Promise<TaskDto> {
    return this.tasks.create(user, weddingId, body);
  }

  /** Changes a task or its status. Fields left out stay; `null` clears an optional one. */
  @Patch(':taskId')
  @ApiOperation({ summary: 'Update task/status' })
  @ApiDataResponse(TaskDto)
  @ApiNotFoundResponse({
    description:
      'WEDDING_NOT_FOUND: not a wedding you belong to. TASK_NOT_FOUND: no such task in it.',
  })
  @ApiConflictResponse({ description: 'WEDDING_ARCHIVED: the wedding is read-only.' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Param('taskId') taskId: string,
    @Body() body: UpdateTaskDto,
  ): Promise<TaskDto> {
    return this.tasks.update(user, weddingId, taskId, body);
  }
}
