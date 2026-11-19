import { Body, Controller, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
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
import { CreateWeddingDto } from './dto/create-wedding.dto.js';
import { UpdateWeddingDto } from './dto/update-wedding.dto.js';
import { WeddingDto } from './dto/wedding.dto.js';
import { WeddingsService } from './weddings.service.js';

/** Every route needs a signed-in user with a verified email (the default guard). */
@ApiTags('Weddings')
@ApiCookieAuth('mm_session')
@Controller('weddings')
export class WeddingsController {
  constructor(private readonly weddings: WeddingsService) {}

  /** The weddings you own or manage, newest first. */
  @Get()
  @ApiOperation({ summary: 'List weddings visible to the account' })
  @ApiDataResponse(WeddingDto, { isArray: true })
  list(@CurrentUser() user: AuthenticatedUser): Promise<WeddingDto[]> {
    return this.weddings.listFor(user);
  }

  /**
   * Creates an active wedding with you as its first owner. Its website starts
   * unpublished. 409 OWNER_ACTIVE_LIMIT if you already own an active wedding
   * — including when this request is a repeat of one that succeeded.
   */
  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create active wedding with first owner' })
  @ApiDataResponse(WeddingDto, { status: 201 })
  @ApiConflictResponse({ description: 'OWNER_ACTIVE_LIMIT: you already own an active wedding.' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateWeddingDto,
  ): Promise<WeddingDto> {
    return this.weddings.create(user, body);
  }

  /**
   * Changes the wedding's details, for its owners and managers. Fields left
   * out stay as they are; `weddingDate: null` removes the date. 404 for a
   * wedding you are not a member of; 409 WEDDING_ARCHIVED once archived.
   */
  @Patch(':weddingId')
  @ApiOperation({ summary: 'Update active wedding details' })
  @ApiDataResponse(WeddingDto)
  @ApiNotFoundResponse({ description: 'WEDDING_NOT_FOUND: not a wedding you belong to.' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Body() body: UpdateWeddingDto,
  ): Promise<WeddingDto> {
    return this.weddings.update(user, weddingId, body);
  }
}
