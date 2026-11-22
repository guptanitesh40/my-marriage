import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { ApiDataResponse } from '../../platform/response-envelope.js';
import { CurrentUser } from '../auth/auth.decorators.js';
import type { AuthenticatedUser } from '../auth/sessions.service.js';
import {
  BulkModerationDto,
  BulkModerationResultDto,
  PhotoDto,
  PhotoListDto,
  ReviewQueueDto,
} from './dto/photo.dto.js';
import { ModerationService } from './moderation.service.js';
import { PhotosService } from './photos.service.js';

/** A wedding's photos, for its owners and managers; 404 to anyone else. */
@ApiTags('Photos')
@ApiCookieAuth('mm_session')
@Controller('weddings/:weddingId')
export class PhotosController {
  constructor(
    private readonly photos: PhotosService,
    private readonly moderation: ModerationService,
  ) {}

  /** Every kept photo of an album, newest first, whatever its review state. */
  @Get('albums/:albumId/photos')
  @ApiOperation({ summary: 'List all photos for moderation' })
  @ApiDataResponse(PhotoListDto)
  @ApiNotFoundResponse({ description: 'WEDDING_NOT_FOUND or ALBUM_NOT_FOUND.' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Param('albumId') albumId: string,
  ): Promise<PhotoListDto> {
    return this.photos.list(user, weddingId, albumId);
  }

  /** A photo's display copy (`thumb` or `display`), streamed; private to the wedding. */
  @Get('photos/:photoId/image/:size')
  @Header('Cache-Control', 'private, max-age=300')
  @ApiOperation({ summary: 'Read a photo’s display copy' })
  @ApiProduces('image/webp')
  @ApiOkResponse({ description: 'The image.' })
  @ApiNotFoundResponse({ description: 'WEDDING_NOT_FOUND or PHOTO_NOT_FOUND.' })
  async image(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Param('photoId') photoId: string,
    @Param('size') size: string,
  ): Promise<StreamableFile> {
    const file = await this.photos.image(user, weddingId, photoId, size);
    return new StreamableFile(file.body, { type: file.contentType, length: file.bytes });
  }

  /** Photos waiting for review across every album, oldest first. */
  @Get('photos/review')
  @ApiOperation({ summary: 'List photos pending review' })
  @ApiDataResponse(ReviewQueueDto)
  @ApiNotFoundResponse({ description: 'WEDDING_NOT_FOUND' })
  queue(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
  ): Promise<ReviewQueueDto> {
    return this.moderation.queue(user, weddingId);
  }

  /**
   * Approves, rejects or deletes up to 100 photos; those a change does not
   * apply to (already reviewed, already gone) are left as they are.
   */
  @Post('photos/moderation')
  @HttpCode(200)
  @ApiOperation({ summary: 'Approve, reject or delete several photos' })
  @ApiDataResponse(BulkModerationResultDto)
  @ApiNotFoundResponse({ description: 'WEDDING_NOT_FOUND' })
  @ApiConflictResponse({ description: 'WEDDING_ARCHIVED' })
  bulk(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Body() body: BulkModerationDto,
  ): Promise<BulkModerationResultDto> {
    return this.moderation.bulk(user, weddingId, body.photoIds, body.action);
  }

  /** Approves a pending or hidden photo: it may now appear on the published website. */
  @Post('photos/:photoId/approve')
  @HttpCode(200)
  @ApiOperation({ summary: 'Approve photo for public display' })
  @ApiDataResponse(PhotoDto)
  @ApiNotFoundResponse({ description: 'WEDDING_NOT_FOUND or PHOTO_NOT_FOUND' })
  @ApiConflictResponse({ description: 'WEDDING_ARCHIVED' })
  approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Param('photoId') photoId: string,
  ): Promise<PhotoDto> {
    return this.moderation.change(user, weddingId, photoId, 'approve');
  }

  /** Rejects a pending photo: its files are removed and its space freed. */
  @Post('photos/:photoId/reject')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reject pending photo' })
  @ApiDataResponse(PhotoDto)
  @ApiNotFoundResponse({ description: 'WEDDING_NOT_FOUND or PHOTO_NOT_FOUND' })
  @ApiConflictResponse({ description: 'WEDDING_ARCHIVED' })
  reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Param('photoId') photoId: string,
  ): Promise<PhotoDto> {
    return this.moderation.change(user, weddingId, photoId, 'reject');
  }

  /** Takes an approved photo off the website; owners can still do this once archived. */
  @Post('photos/:photoId/hide')
  @HttpCode(200)
  @ApiOperation({ summary: 'Hide public photo (owner safety exception after archive)' })
  @ApiDataResponse(PhotoDto)
  @ApiForbiddenResponse({ description: 'OWNER_REQUIRED: only owners, once archived.' })
  @ApiNotFoundResponse({ description: 'WEDDING_NOT_FOUND or PHOTO_NOT_FOUND' })
  hide(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Param('photoId') photoId: string,
  ): Promise<PhotoDto> {
    return this.moderation.change(user, weddingId, photoId, 'hide');
  }

  /** Puts a hidden photo back on the website. */
  @Post('photos/:photoId/restore')
  @HttpCode(200)
  @ApiOperation({ summary: 'Show a hidden photo again' })
  @ApiDataResponse(PhotoDto)
  @ApiNotFoundResponse({ description: 'WEDDING_NOT_FOUND or PHOTO_NOT_FOUND' })
  @ApiConflictResponse({ description: 'WEDDING_ARCHIVED' })
  restore(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Param('photoId') photoId: string,
  ): Promise<PhotoDto> {
    return this.moderation.change(user, weddingId, photoId, 'restore');
  }

  /** Deletes a photo for good; owners can still do this once archived. */
  @Delete('photos/:photoId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete photo' })
  @ApiNoContentResponse({ description: 'The photo and its files are gone.' })
  @ApiForbiddenResponse({ description: 'OWNER_REQUIRED: only owners, once archived.' })
  @ApiNotFoundResponse({ description: 'WEDDING_NOT_FOUND or PHOTO_NOT_FOUND' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Param('photoId') photoId: string,
  ): Promise<void> {
    await this.moderation.change(user, weddingId, photoId, 'remove');
  }
}
