import { Body, Controller, Get, HttpCode, Param, Post, StreamableFile } from '@nestjs/common';
import {
  ApiCookieAuth,
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
  CreateMediaExportDto,
  MediaExportDto,
  MediaExportListDto,
} from './dto/media-export.dto.js';
import { MediaExportsService } from './media-exports.service.js';

/** A file name for Content-Disposition: ASCII fallback and the UTF-8 original. */
function attachment(name: string): string {
  const ascii = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

/**
 * Downloads (PRD PHOTO-06), for a wedding's owners and managers; 404 to
 * anyone else. Files are streamed by the API, never linked to in storage.
 */
@ApiTags('Photos')
@ApiCookieAuth('mm_session')
@Controller('weddings/:weddingId')
export class MediaExportsController {
  constructor(private readonly exportsService: MediaExportsService) {}

  /** Starts a ZIP of approved or all photos, of the wedding or one album. */
  @Post('media-exports')
  @HttpCode(202)
  @ApiOperation({ summary: 'Start photo export job' })
  @ApiDataResponse(MediaExportDto, { status: 202 })
  @ApiNotFoundResponse({ description: 'WEDDING_NOT_FOUND or ALBUM_NOT_FOUND' })
  start(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Body() body: CreateMediaExportDto,
  ): Promise<MediaExportDto> {
    return this.exportsService.start(user, weddingId, body.scope, body.albumId);
  }

  @Get('media-exports')
  @ApiOperation({ summary: 'List recent photo exports' })
  @ApiDataResponse(MediaExportListDto)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
  ): Promise<MediaExportListDto> {
    return this.exportsService.list(user, weddingId);
  }

  @Get('media-exports/:exportId')
  @ApiOperation({ summary: 'Get export status and download address' })
  @ApiDataResponse(MediaExportDto)
  @ApiNotFoundResponse({ description: 'WEDDING_NOT_FOUND or EXPORT_NOT_FOUND' })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Param('exportId') exportId: string,
  ): Promise<MediaExportDto> {
    return this.exportsService.get(user, weddingId, exportId);
  }

  @Get('media-exports/:exportId/download')
  @ApiOperation({ summary: 'Download a ready export ZIP' })
  @ApiProduces('application/zip')
  @ApiOkResponse({ description: 'The ZIP.' })
  @ApiNotFoundResponse({ description: 'WEDDING_NOT_FOUND or EXPORT_NOT_FOUND' })
  async download(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Param('exportId') exportId: string,
  ): Promise<StreamableFile> {
    const { file, name } = await this.exportsService.download(user, weddingId, exportId);
    return new StreamableFile(file.body, {
      type: 'application/zip',
      length: file.bytes,
      disposition: attachment(name),
    });
  }

  /** One photo's original, as uploaded. */
  @Get('photos/:photoId/original')
  @ApiOperation({ summary: 'Download a photo’s original' })
  @ApiProduces('image/jpeg', 'image/png', 'image/webp')
  @ApiOkResponse({ description: 'The original file.' })
  @ApiNotFoundResponse({ description: 'WEDDING_NOT_FOUND or PHOTO_NOT_FOUND' })
  async original(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Param('photoId') photoId: string,
  ): Promise<StreamableFile> {
    const { file, name } = await this.exportsService.original(user, weddingId, photoId);
    return new StreamableFile(file.body, {
      type: file.contentType,
      length: file.bytes,
      disposition: attachment(name),
    });
  }
}
