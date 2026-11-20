import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { ApiDataResponse } from '../../platform/response-envelope.js';
import { CurrentUser } from '../auth/auth.decorators.js';
import type { AuthenticatedUser } from '../auth/sessions.service.js';
import {
  CreateGuestDto,
  CreateLinkDto,
  ImportCommitDto,
  ImportPreviewDto,
  InvitationSelectionDto,
  UpdateGuestDto,
} from './dto/guest-input.dto.js';
import {
  GuestDetailDto,
  GuestLinkDto,
  GuestListDto,
  ImportCommitResultDto,
  ImportPreviewResultDto,
} from './dto/guest.dto.js';
import {
  ReminderPreviewDto,
  ReminderResultDto,
  ReminderScopeDto,
  SendReminderDto,
} from './dto/reminder.dto.js';
import { GuestRemindersService } from './guest-reminders.service.js';
import { GuestsService } from './guests.service.js';

const WEDDING_NOT_FOUND = 'WEDDING_NOT_FOUND: not a wedding you belong to.';
const NOT_FOUND = `${WEDDING_NOT_FOUND} GUEST_NOT_FOUND: no such guest in it.`;
const ARCHIVED = 'WEDDING_ARCHIVED: the wedding is read-only.';

/**
 * For a wedding's owners and managers; 404 to anyone else, as for every
 * wedding route. Guest details, links and RSVPs are private and never public.
 */
@ApiTags('Guests')
@ApiCookieAuth('mm_session')
@Controller('weddings/:weddingId/guests')
export class GuestsController {
  constructor(
    private readonly guests: GuestsService,
    private readonly reminders: GuestRemindersService,
  ) {}

  /** Who a reminder to everyone invited would reach, and who is left out and why. */
  @Post('reminders/preview')
  @HttpCode(200)
  @ApiOperation({ summary: 'Preview a reminder to everyone invited' })
  @ApiDataResponse(ReminderPreviewDto)
  @ApiNotFoundResponse({ description: WEDDING_NOT_FOUND })
  @ApiConflictResponse({ description: ARCHIVED })
  previewReminders(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Body() body: ReminderScopeDto,
  ): Promise<ReminderPreviewDto> {
    return this.reminders.preview(user, weddingId, body);
  }

  /** Queues one reminder email per guest invited (to one ceremony, if given). */
  @Post('reminders')
  @HttpCode(202)
  @ApiOperation({ summary: 'Remind everyone invited' })
  @ApiDataResponse(ReminderResultDto, { status: 202 })
  @ApiNotFoundResponse({ description: WEDDING_NOT_FOUND })
  @ApiConflictResponse({ description: ARCHIVED })
  @ApiTooManyRequestsResponse({ description: 'EMAIL_DAILY_LIMIT: says how many are left today.' })
  remindAll(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Body() body: SendReminderDto,
  ): Promise<ReminderResultDto> {
    return this.reminders.remindAll(user, weddingId, body);
  }

  /** The guest contacts by name, with totals that keep contacts, people and answers apart. */
  @Get()
  @ApiOperation({ summary: 'List guest contacts' })
  @ApiDataResponse(GuestListDto)
  @ApiNotFoundResponse({ description: WEDDING_NOT_FOUND })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
  ): Promise<GuestListDto> {
    return this.guests.list(user, weddingId);
  }

  /** Adds a guest contact, optionally invited to `eventIds` at once. */
  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create primary guest contact' })
  @ApiDataResponse(GuestDetailDto, { status: 201 })
  @ApiNotFoundResponse({ description: WEDDING_NOT_FOUND })
  @ApiConflictResponse({ description: ARCHIVED })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Body() body: CreateGuestDto,
  ): Promise<GuestDetailDto> {
    return this.guests.create(user, weddingId, body);
  }

  /** Checks rows read from a file; nothing is written. */
  @Post('import/preview')
  @HttpCode(200)
  @ApiOperation({ summary: 'Validate CSV/XLSX guest import before commit' })
  @ApiDataResponse(ImportPreviewResultDto)
  @ApiNotFoundResponse({ description: WEDDING_NOT_FOUND })
  previewImport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Body() body: ImportPreviewDto,
  ): Promise<ImportPreviewResultDto> {
    return this.guests.previewImport(user, weddingId, body);
  }

  /** Imports the rows that pass, all together or none. */
  @Post('import/commit')
  @HttpCode(201)
  @ApiOperation({ summary: 'Commit previously validated import selection' })
  @ApiDataResponse(ImportCommitResultDto, { status: 201 })
  @ApiNotFoundResponse({ description: WEDDING_NOT_FOUND })
  @ApiConflictResponse({ description: ARCHIVED })
  commitImport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Body() body: ImportCommitDto,
  ): Promise<ImportCommitResultDto> {
    return this.guests.commitImport(user, weddingId, body);
  }

  /** A guest with their private link and each answer's history. */
  @Get(':guestId')
  @ApiOperation({ summary: 'Read guest contact' })
  @ApiDataResponse(GuestDetailDto)
  @ApiNotFoundResponse({ description: NOT_FOUND })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Param('guestId') guestId: string,
  ): Promise<GuestDetailDto> {
    return this.guests.get(user, weddingId, guestId);
  }

  /** Changes a guest; a party size below an answer already given is refused (409). */
  @Patch(':guestId')
  @ApiOperation({ summary: 'Update party size and private contact info' })
  @ApiDataResponse(GuestDetailDto)
  @ApiNotFoundResponse({ description: NOT_FOUND })
  @ApiConflictResponse({ description: `${ARCHIVED} PARTY_SIZE_CONFLICT: answers above it.` })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Param('guestId') guestId: string,
    @Body() body: UpdateGuestDto,
  ): Promise<GuestDetailDto> {
    return this.guests.update(user, weddingId, guestId, body);
  }

  /** Removes a guest (owners only); their links stop working. The record is kept. */
  @Delete(':guestId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove guest and revoke invitation capabilities' })
  @ApiNoContentResponse({ description: 'The guest is removed.' })
  @ApiForbiddenResponse({ description: 'OWNER_REQUIRED: managers cannot remove guests.' })
  @ApiNotFoundResponse({ description: NOT_FOUND })
  @ApiConflictResponse({ description: ARCHIVED })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Param('guestId') guestId: string,
  ): Promise<void> {
    return this.guests.remove(user, weddingId, guestId);
  }

  @Get(':guestId/invitations')
  @ApiOperation({ summary: 'List event invitations for guest' })
  @ApiDataResponse(GuestDetailDto)
  @ApiNotFoundResponse({ description: NOT_FOUND })
  invitations(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Param('guestId') guestId: string,
  ): Promise<GuestDetailDto> {
    return this.guests.get(user, weddingId, guestId);
  }

  /** Replaces the ceremonies a guest is invited to; answers to unselected ones are kept, hidden. */
  @Put(':guestId/invitations')
  @ApiOperation({ summary: 'Set selected events for guest' })
  @ApiDataResponse(GuestDetailDto)
  @ApiNotFoundResponse({ description: NOT_FOUND })
  @ApiConflictResponse({ description: ARCHIVED })
  setInvitations(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Param('guestId') guestId: string,
    @Body() body: InvitationSelectionDto,
  ): Promise<GuestDetailDto> {
    return this.guests.setInvitations(user, weddingId, guestId, body);
  }

  /** The private link, created if there is none; `reissue` replaces it, revoking the old one. */
  @Post(':guestId/invitation-links')
  @HttpCode(201)
  @ApiOperation({ summary: 'Generate/reissue private guest link' })
  @ApiDataResponse(GuestLinkDto, { status: 201 })
  @ApiNotFoundResponse({ description: NOT_FOUND })
  @ApiConflictResponse({ description: ARCHIVED })
  createLink(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Param('guestId') guestId: string,
    @Body() body: CreateLinkDto,
  ): Promise<GuestLinkDto> {
    return this.guests.createLink(user, weddingId, guestId, body.reissue === true);
  }

  @Post(':guestId/invitation-links/revoke')
  @HttpCode(200)
  @ApiOperation({ summary: 'Revoke all active guest invitation links/sessions' })
  @ApiDataResponse(GuestLinkDto)
  @ApiNotFoundResponse({ description: NOT_FOUND })
  @ApiConflictResponse({ description: ARCHIVED })
  revokeLink(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Param('guestId') guestId: string,
  ): Promise<GuestLinkDto> {
    return this.guests.revokeLink(user, weddingId, guestId);
  }

  /** Queues a reminder to one guest; says why not if they cannot be reminded. */
  @Post(':guestId/reminder')
  @HttpCode(202)
  @ApiOperation({ summary: 'Remind one guest' })
  @ApiDataResponse(ReminderResultDto, { status: 202 })
  @ApiNotFoundResponse({ description: NOT_FOUND })
  @ApiConflictResponse({
    description: `${ARCHIVED} INVITATION_NOT_SHARED, INVITATION_LINK_OFF or GUEST_REMINDERS_OFF.`,
  })
  @ApiTooManyRequestsResponse({ description: 'EMAIL_DAILY_LIMIT' })
  remindOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Param('guestId') guestId: string,
    @Body() body: SendReminderDto,
  ): Promise<ReminderResultDto> {
    return this.reminders.remindOne(user, weddingId, guestId, body);
  }

  /** Queues the invitation email; needs an email address and an open ceremony. */
  @Post(':guestId/invitation-email')
  @HttpCode(202)
  @ApiOperation({ summary: 'Queue guest invitation email' })
  @ApiDataResponse(GuestDetailDto, { status: 202 })
  @ApiNotFoundResponse({ description: NOT_FOUND })
  @ApiConflictResponse({ description: ARCHIVED })
  sendEmail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Param('guestId') guestId: string,
  ): Promise<GuestDetailDto> {
    return this.guests.sendEmail(user, weddingId, guestId);
  }
}
