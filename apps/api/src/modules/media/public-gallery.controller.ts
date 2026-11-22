import { Controller, Get, Header, Param, StreamableFile } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { ApiDataResponse } from '../../platform/response-envelope.js';
import { Public } from '../auth/auth.decorators.js';
import { PublicGalleryDto, PublicPhotoListDto } from './dto/public-gallery.dto.js';
import { PublicGalleryService } from './public-gallery.service.js';

/** The published website's gallery, for anyone: approved photos only. */
@ApiTags('Public website')
@Public()
@Controller('public/weddings/:slug')
export class PublicGalleryController {
  constructor(private readonly gallery: PublicGalleryService) {}

  @Get('albums')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'List publicly visible approved galleries' })
  @ApiDataResponse(PublicGalleryDto)
  albums(@Param('slug') slug: string): Promise<PublicGalleryDto> {
    return this.gallery.albumsOf(slug);
  }

  @Get('albums/:albumId/photos')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Browse approved public photos only' })
  @ApiDataResponse(PublicPhotoListDto)
  @ApiNotFoundResponse({ description: 'ALBUM_NOT_FOUND: no such album on a published site.' })
  photos(
    @Param('slug') slug: string,
    @Param('albumId') albumId: string,
  ): Promise<PublicPhotoListDto> {
    return this.gallery.photosOf(slug, albumId);
  }

  /** An approved photo's copy (`thumb` or `display`); not found once hidden or unpublished. */
  @Get('photos/:photoId/:size')
  @Header('Cache-Control', 'public, max-age=300')
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiOperation({ summary: 'Read an approved photo' })
  @ApiProduces('image/webp')
  @ApiOkResponse({ description: 'The image.' })
  @ApiNotFoundResponse({ description: 'PHOTO_NOT_FOUND' })
  async image(
    @Param('slug') slug: string,
    @Param('photoId') photoId: string,
    @Param('size') size: string,
  ): Promise<StreamableFile> {
    const file = await this.gallery.image(slug, photoId, size);
    return new StreamableFile(file.body, { type: file.contentType, length: file.bytes });
  }
}
