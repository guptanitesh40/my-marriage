import { Body, Controller, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiDataResponse } from '../../platform/response-envelope.js';
import { CurrentUser } from '../auth/auth.decorators.js';
import type { AuthenticatedUser } from '../auth/sessions.service.js';
import { CreateWeddingDto } from './dto/create-wedding.dto.js';
import { MemberListDto } from './dto/member.dto.js';
import { UpdateWeddingDto } from './dto/update-wedding.dto.js';
import { WeddingDto, WeddingSettingsDto } from './dto/wedding.dto.js';
import { WeddingLifecycleService } from './wedding-lifecycle.service.js';
import { WeddingsService } from './weddings.service.js';

/** Every route needs a signed-in user with a verified email (the default guard). */
@ApiTags('Weddings')
@ApiCookieAuth('mm_session')
@Controller('weddings')
export class WeddingsController {
  constructor(
    private readonly weddings: WeddingsService,
    private readonly lifecycle: WeddingLifecycleService,
  ) {}

  /** The weddings you own or manage, newest first. */
  @Get()
  @ApiOperation({ summary: 'List weddings visible to the account' })
  @ApiDataResponse(WeddingDto, { isArray: true })
  list(@CurrentUser() user: AuthenticatedUser): Promise<WeddingDto[]> {
    return this.weddings.listFor(user);
  }

  /**
   * Creates an active wedding with you as its first owner. Its website starts
   * unpublished. You may own several (decision 0020).
   */
  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create active wedding with first owner' })
  @ApiDataResponse(WeddingDto, { status: 201 })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateWeddingDto,
  ): Promise<WeddingDto> {
    return this.weddings.create(user, body);
  }

  /**
   * One wedding you own or manage, with your role, whatever its status.
   * 404 for a wedding you are not a member of, the same as for one that
   * does not exist.
   */
  @Get(':weddingId')
  @ApiOperation({ summary: 'Get wedding private details' })
  @ApiDataResponse(WeddingDto)
  @ApiNotFoundResponse({ description: 'WEDDING_NOT_FOUND: not a wedding you belong to.' })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
  ): Promise<WeddingDto> {
    return this.weddings.get(user, weddingId);
  }

  /** The wedding's active owners and managers, for any of them: who tasks can be assigned to. */
  @Get(':weddingId/members')
  @ApiOperation({ summary: 'List wedding owners/managers' })
  @ApiDataResponse(MemberListDto)
  @ApiNotFoundResponse({ description: 'WEDDING_NOT_FOUND: not a wedding you belong to.' })
  members(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
  ): Promise<MemberListDto> {
    return this.weddings.members(user, weddingId);
  }

  /**
   * Changes the wedding's details, for any member. Fields left out stay as
   * they are; `null` removes an optional one (date, main venue,
   * description). 404 for a wedding you are not a member of; 409
   * WEDDING_ARCHIVED once archived, WEDDING_DELETION_PENDING while deletion
   * is requested.
   */
  @Patch(':weddingId')
  @ApiOperation({ summary: 'Update active wedding details' })
  @ApiDataResponse(WeddingDto)
  @ApiNotFoundResponse({ description: 'WEDDING_NOT_FOUND: not a wedding you belong to.' })
  @ApiConflictResponse({ description: 'WEDDING_ARCHIVED or WEDDING_DELETION_PENDING.' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Body() body: UpdateWeddingDto,
  ): Promise<WeddingDto> {
    return this.weddings.update(user, weddingId, body);
  }

  /**
   * The settings page, for any member: the wedding, who last saved its
   * details, and whether it is archived or waiting for deletion.
   */
  @Get(':weddingId/settings')
  @ApiOperation({ summary: 'Get wedding settings and lifecycle state' })
  @ApiDataResponse(WeddingSettingsDto)
  @ApiNotFoundResponse({ description: 'WEDDING_NOT_FOUND: not a wedding you belong to.' })
  settings(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
  ): Promise<WeddingSettingsDto> {
    return this.lifecycle.settings(user, weddingId);
  }

  /**
   * Archives the wedding (owners only): read-only for everyone from then
   * on; the published website and approved photos stay up. Archiving an
   * archived wedding answers with it unchanged.
   */
  @Post(':weddingId/archive')
  @HttpCode(200)
  @ApiOperation({ summary: 'Archive active wedding (owner only)' })
  @ApiDataResponse(WeddingDto)
  @ApiForbiddenResponse({ description: 'OWNER_REQUIRED: admins and managers cannot archive.' })
  @ApiConflictResponse({ description: 'WEDDING_DELETION_PENDING: deletion is requested.' })
  archive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
  ): Promise<WeddingDto> {
    return this.lifecycle.archive(user, weddingId);
  }

  /**
   * Requests deletion (owners only), a soft delete: the wedding becomes
   * read-only and its public pages go offline; nothing is erased, and an
   * owner can cancel while it waits. Repeating it answers with the request
   * already made.
   */
  @Post(':weddingId/deletion-requests')
  @HttpCode(201)
  @ApiOperation({ summary: 'Request wedding deletion (owner only)' })
  @ApiDataResponse(WeddingSettingsDto, { status: 201 })
  @ApiForbiddenResponse({ description: 'OWNER_REQUIRED: admins and managers cannot delete.' })
  requestDeletion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
  ): Promise<WeddingSettingsDto> {
    return this.lifecycle.requestDeletion(user, weddingId);
  }

  /**
   * Cancels a waiting deletion request (owners only): the wedding returns
   * to active or archived, as it was. Without one, answers with the
   * wedding as it is.
   */
  @Post(':weddingId/deletion-requests/cancel')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cancel a waiting deletion request (owner only)' })
  @ApiDataResponse(WeddingSettingsDto)
  @ApiForbiddenResponse({ description: 'OWNER_REQUIRED: admins and managers cannot cancel.' })
  cancelDeletion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
  ): Promise<WeddingSettingsDto> {
    return this.lifecycle.cancelDeletion(user, weddingId);
  }
}
