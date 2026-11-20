import { Body, Controller, Get, Param, Put } from '@nestjs/common';
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
import { ReminderSettingsDto, UpdateReminderSettingsDto } from './dto/reminder.dto.js';
import { GuestRemindersService } from './guest-reminders.service.js';

/** A wedding's automatic reminders (API "Configure wedding reminders"), for its organizers. */
@ApiTags('Guests')
@ApiCookieAuth('mm_session')
@Controller('weddings/:weddingId/reminder-settings')
export class ReminderSettingsController {
  constructor(private readonly reminders: GuestRemindersService) {}

  @Get()
  @ApiOperation({ summary: 'Read reminder scheduling settings' })
  @ApiDataResponse(ReminderSettingsDto)
  @ApiNotFoundResponse({ description: 'WEDDING_NOT_FOUND: not a wedding you belong to.' })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
  ): Promise<ReminderSettingsDto> {
    return this.reminders.getSettings(user, weddingId);
  }

  @Put()
  @ApiOperation({ summary: 'Configure reminder offsets (30/7/3)' })
  @ApiDataResponse(ReminderSettingsDto)
  @ApiNotFoundResponse({ description: 'WEDDING_NOT_FOUND: not a wedding you belong to.' })
  @ApiConflictResponse({ description: 'WEDDING_ARCHIVED: the wedding is read-only.' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Body() body: UpdateReminderSettingsDto,
  ): Promise<ReminderSettingsDto> {
    return this.reminders.updateSettings(user, weddingId, body);
  }
}
