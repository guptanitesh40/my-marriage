import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ApiDataResponse } from '../../platform/response-envelope.js';
import { CurrentUser } from '../auth/auth.decorators.js';
import type { AuthenticatedUser } from '../auth/sessions.service.js';
import { PublicWebsiteDto } from './dto/public-website.dto.js';
import {
  CoverUploadRequestDto,
  PublishWebsiteDto,
  UpdateWebsiteDto,
} from './dto/website-input.dto.js';
import { CoverUploadDto, SlugAvailabilityDto, WebsiteDto } from './dto/website.dto.js';
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

  /** A form to upload a new cover photo to; then `…/complete`. */
  @Post('cover-uploads')
  @HttpCode(201)
  @ApiOperation({ summary: 'Start a cover photo upload' })
  @ApiDataResponse(CoverUploadDto)
  @ApiNotFoundResponse({ description: NOT_FOUND })
  @ApiConflictResponse({ description: 'WEDDING_ARCHIVED: read-only.' })
  requestCoverUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Body() body: CoverUploadRequestDto,
  ): Promise<CoverUploadDto> {
    return this.website.requestCoverUpload(user, weddingId, body);
  }

  /** Checks the uploaded photo and makes it the draft's cover. */
  @Post('cover-uploads/:uploadId/complete')
  @HttpCode(200)
  @ApiOperation({ summary: 'Finish a cover photo upload' })
  @ApiDataResponse(WebsiteDto)
  @ApiNotFoundResponse({ description: NOT_FOUND })
  @ApiConflictResponse({ description: CHANGED })
  @ApiUnprocessableEntityResponse({
    description: 'UPLOAD_NOT_FOUND, UPLOAD_TOO_LARGE or UPLOAD_NOT_IMAGE.',
  })
  completeCoverUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Param('uploadId') uploadId: string,
    @Body() body: PublishWebsiteDto,
  ): Promise<WebsiteDto> {
    return this.website.completeCoverUpload(user, weddingId, uploadId, body);
  }

  /** A photo of the draft website, for the wedding's members; not cached by others. */
  @Get('images/:imageId')
  @Header('Cache-Control', 'private, max-age=300')
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiOperation({ summary: 'Read a website photo (members only)' })
  @ApiProduces('image/jpeg', 'image/png', 'image/webp')
  @ApiOkResponse({ description: 'The photo.' })
  @ApiNotFoundResponse({ description: 'IMAGE_NOT_FOUND or WEDDING_NOT_FOUND.' })
  async image(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Param('imageId') imageId: string,
  ): Promise<StreamableFile> {
    const file = await this.website.image(user, weddingId, imageId);
    return new StreamableFile(file.body, { type: file.contentType, length: file.bytes });
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
