import { Body, Controller, Get, Header, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ApiDataResponse } from '../../platform/response-envelope.js';
import { CurrentUser } from '../auth/auth.decorators.js';
import type { AuthenticatedUser } from '../auth/sessions.service.js';
import { PublicWebsiteDto } from './dto/public-website.dto.js';
import { PublishWebsiteDto, UpdateWebsiteDto } from './dto/website-input.dto.js';
import { SlugAvailabilityDto, WebsiteDto } from './dto/website.dto.js';
import { WebsiteService } from './website.service.js';

const NOT_FOUND = 'WEDDING_NOT_FOUND: not a wedding you belong to.';
const CHANGED = 'WEBSITE_VERSION_CONFLICT: changed elsewhere; reload. WEDDING_ARCHIVED: read-only.';

/**
 * The wedding website editor, for a wedding's owners and managers; 404 to
 * anyone else, as for every wedding route (decision 0017).
 */
@ApiTags('Website')
@ApiCookieAuth('mm_session')
@Controller('weddings/:weddingId/website')
export class WebsiteController {
  constructor(private readonly website: WebsiteService) {}

  @Get()
  @ApiOperation({ summary: 'Read wedding website editor configuration' })
  @ApiDataResponse(WebsiteDto)
  @ApiNotFoundResponse({ description: NOT_FOUND })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
  ): Promise<WebsiteDto> {
    return this.website.get(user, weddingId);
  }

  /** Saves the draft; the public site changes only when it is published. */
  @Patch()
  @ApiOperation({ summary: 'Edit template and site content' })
  @ApiDataResponse(WebsiteDto)
  @ApiNotFoundResponse({ description: NOT_FOUND })
  @ApiConflictResponse({ description: CHANGED })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Body() body: UpdateWebsiteDto,
  ): Promise<WebsiteDto> {
    return this.website.update(user, weddingId, body);
  }

  /** The draft as the public would see it; members only, never cached. */
  @Get('preview')
  @Header('Cache-Control', 'no-store')
  @Header('X-Robots-Tag', 'noindex, nofollow')
  @ApiOperation({ summary: 'Preview unpublished content (noncacheable)' })
  @ApiDataResponse(PublicWebsiteDto)
  @ApiNotFoundResponse({ description: NOT_FOUND })
  preview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
  ): Promise<PublicWebsiteDto> {
    return this.website.preview(user, weddingId);
  }

  @Post('publish')
  @HttpCode(200)
  @ApiOperation({ summary: 'Publish wedding public website' })
  @ApiDataResponse(WebsiteDto)
  @ApiNotFoundResponse({ description: NOT_FOUND })
  @ApiConflictResponse({ description: CHANGED })
  @ApiUnprocessableEntityResponse({ description: 'WEBSITE_NOT_READY: says what is missing.' })
  publish(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Body() body: PublishWebsiteDto,
  ): Promise<WebsiteDto> {
    return this.website.publish(user, weddingId, body);
  }

  @Post('unpublish')
  @HttpCode(200)
  @ApiOperation({ summary: 'Unpublish site (owner safety exception after archive)' })
  @ApiDataResponse(WebsiteDto)
  @ApiNotFoundResponse({ description: NOT_FOUND })
  @ApiForbiddenResponse({ description: 'OWNER_REQUIRED: archived weddings, owners only.' })
  unpublish(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
  ): Promise<WebsiteDto> {
    return this.website.unpublish(user, weddingId);
  }

  /** Whether an address is free for this wedding; changing it is `PATCH /weddings/{id}`. */
  @Get('address')
  @ApiOperation({ summary: 'Check a wedding website address' })
  @ApiQuery({ name: 'slug', example: 'ananya-arjun' })
  @ApiDataResponse(SlugAvailabilityDto)
  @ApiNotFoundResponse({ description: NOT_FOUND })
  address(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Query('slug') slug = '',
  ): Promise<SlugAvailabilityDto> {
    return this.website.slugAvailability(user, weddingId, String(slug));
  }
}
