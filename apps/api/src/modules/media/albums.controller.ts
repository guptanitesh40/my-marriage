import { Body, Controller, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiDataResponse } from '../../platform/response-envelope.js';
import { CurrentUser } from '../auth/auth.decorators.js';
import type { AuthenticatedUser } from '../auth/sessions.service.js';
import { AlbumsService } from './albums.service.js';
import { CreateAlbumDto, UpdateAlbumDto } from './dto/album-input.dto.js';
import { AlbumDto, AlbumListDto } from './dto/album.dto.js';
import { QuotaDto } from './dto/quota.dto.js';
import { QuotaService } from './quota.service.js';

const NOT_FOUND =
  'WEDDING_NOT_FOUND: not a wedding you belong to. ALBUM_NOT_FOUND: no such album in it.';

/**
 * For a wedding's owners and managers; 404 to anyone else, as for every
 * wedding route. Albums here include their private settings.
 */
@ApiTags('Albums')
@ApiCookieAuth('mm_session')
@Controller('weddings/:weddingId')
export class AlbumsController {
  constructor(
    private readonly albums: AlbumsService,
    private readonly quota: QuotaService,
  ) {}

  /** Every ceremony's album, the general album and the couple's own, made as needed. */
  @Get('albums')
  @ApiOperation({ summary: 'List albums' })
  @ApiDataResponse(AlbumListDto)
  @ApiNotFoundResponse({ description: 'WEDDING_NOT_FOUND: not a wedding you belong to.' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
  ): Promise<AlbumListDto> {
    return this.albums.list(user, weddingId);
  }

  @Post('albums')
  @HttpCode(201)
  @ApiOperation({ summary: 'Create custom album' })
  @ApiDataResponse(AlbumDto, { status: 201 })
  @ApiNotFoundResponse({ description: 'WEDDING_NOT_FOUND: not a wedding you belong to.' })
  @ApiConflictResponse({
    description: 'WEDDING_ARCHIVED: the wedding is read-only. ALBUM_LIMIT: too many albums.',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Body() body: CreateAlbumDto,
  ): Promise<AlbumDto> {
    return this.albums.create(user, weddingId, body);
  }

  /** Renames an album (not an event album) or pauses its upload links. */
  @Patch('albums/:albumId')
  @ApiOperation({ summary: 'Edit album settings' })
  @ApiDataResponse(AlbumDto)
  @ApiBadRequestResponse({
    description: 'VALIDATION_ERROR: an event album keeps its ceremony’s name.',
  })
  @ApiNotFoundResponse({ description: NOT_FOUND })
  @ApiConflictResponse({ description: 'WEDDING_ARCHIVED: the wedding is read-only.' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Param('albumId') albumId: string,
    @Body() body: UpdateAlbumDto,
  ): Promise<AlbumDto> {
    return this.albums.update(user, weddingId, albumId, body);
  }

  @Get('quota')
  @ApiOperation({ summary: 'Read current 5 GB photo storage' })
  @ApiDataResponse(QuotaDto)
  @ApiNotFoundResponse({ description: 'WEDDING_NOT_FOUND: not a wedding you belong to.' })
  getQuota(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
  ): Promise<QuotaDto> {
    return this.quota.get(user, weddingId);
  }
}
