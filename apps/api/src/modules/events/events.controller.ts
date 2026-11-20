import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiDataResponse } from '../../platform/response-envelope.js';
import { CurrentUser } from '../auth/auth.decorators.js';
import type { AuthenticatedUser } from '../auth/sessions.service.js';
import { CreateEventDto } from './dto/create-event.dto.js';
import { EventDto, EventListDto } from './dto/event.dto.js';
import { UpdateEventDto } from './dto/update-event.dto.js';
import { EventsService } from './events.service.js';

/** For a wedding's owners and managers; 404 to anyone else, as for every wedding route. */
@ApiTags('Events')
@ApiCookieAuth('mm_session')
@Controller('weddings/:weddingId/events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  /** The wedding's ceremonies, by date; those without a date last. */
  @Get()
  @ApiOperation({ summary: 'List ceremonies' })
  @ApiDataResponse(EventListDto)
  @ApiNotFoundResponse({ description: 'WEDDING_NOT_FOUND: not a wedding you belong to.' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
  ): Promise<EventListDto> {
    return this.events.list(user, weddingId);
  }

  /**
   * Adds a ceremony. Only `title` is required. `startDate` and `startTime`
   * are as clocks show them in `timeZone` (default Asia/Kolkata).
   */
  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create ceremony' })
  @ApiDataResponse(EventDto, { status: 201 })
  @ApiNotFoundResponse({ description: 'WEDDING_NOT_FOUND: not a wedding you belong to.' })
  @ApiConflictResponse({ description: 'WEDDING_ARCHIVED: the wedding is read-only.' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Body() body: CreateEventDto,
  ): Promise<EventDto> {
    return this.events.create(user, weddingId, body);
  }

  /**
   * Changes a ceremony. Fields left out stay as they are; `null` clears an
   * optional one. Removing `startDate` removes the time too.
   */
  @Patch(':eventId')
  @ApiOperation({ summary: 'Update or cancel ceremony' })
  @ApiDataResponse(EventDto)
  @ApiNotFoundResponse({
    description:
      'WEDDING_NOT_FOUND: not a wedding you belong to. EVENT_NOT_FOUND: no such event in it.',
  })
  @ApiConflictResponse({ description: 'WEDDING_ARCHIVED: the wedding is read-only.' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Param('eventId') eventId: string,
    @Body() body: UpdateEventDto,
  ): Promise<EventDto> {
    return this.events.update(user, weddingId, eventId, body);
  }

  /**
   * Deletes a ceremony (owners only). The record is kept, marked as
   * deleted, and no longer listed.
   */
  @Delete(':eventId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete ceremony (owners only)' })
  @ApiNoContentResponse({ description: 'The event is deleted.' })
  @ApiForbiddenResponse({ description: 'OWNER_REQUIRED: managers cannot delete events.' })
  @ApiNotFoundResponse({
    description:
      'WEDDING_NOT_FOUND: not a wedding you belong to. EVENT_NOT_FOUND: no such event in it.',
  })
  @ApiConflictResponse({ description: 'WEDDING_ARCHIVED: the wedding is read-only.' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Param('eventId') eventId: string,
  ): Promise<void> {
    return this.events.remove(user, weddingId, eventId);
  }
}
