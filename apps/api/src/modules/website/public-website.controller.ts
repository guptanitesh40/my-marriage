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
import { PublicEventListDto, PublicWebsiteDto } from './dto/public-website.dto.js';
import { PublicWebsiteService } from './public-website.service.js';

const NOT_FOUND = 'WEBSITE_NOT_FOUND: missing, unpublished or unpublished again — never which.';

/**
 * Published wedding websites, for anyone (PRD SITE-05). No session is read.
 * Not cached, so unpublishing takes effect on the next request.
 */
@ApiTags('Public website')
@Public()
@Controller('public/weddings')
export class PublicWebsiteController {
  constructor(private readonly site: PublicWebsiteService) {}

  @Get(':slug')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Read published sanitized public wedding' })
  @ApiDataResponse(PublicWebsiteDto)
  @ApiNotFoundResponse({ description: NOT_FOUND })
  wedding(@Param('slug') slug: string): Promise<PublicWebsiteDto> {
    return this.site.site(slug);
  }

  @Get(':slug/events')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'List published event information' })
  @ApiDataResponse(PublicEventListDto)
  @ApiNotFoundResponse({ description: NOT_FOUND })
  events(@Param('slug') slug: string): Promise<PublicEventListDto> {
    return this.site.eventList(slug);
  }

  /**
   * The published site's cover photo. Its address carries the photo's ID
   * (`?v=`), so a new photo is a new address and this one may be cached.
   */
  @Get(':slug/cover')
  @Header('Cache-Control', 'public, max-age=300')
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiOperation({ summary: 'Read the published cover photo' })
  @ApiProduces('image/jpeg', 'image/png', 'image/webp')
  @ApiOkResponse({ description: 'The photo.' })
  @ApiNotFoundResponse({ description: 'WEBSITE_NOT_FOUND or IMAGE_NOT_FOUND.' })
  async cover(@Param('slug') slug: string): Promise<StreamableFile> {
    const file = await this.site.cover(slug);
    return new StreamableFile(file.body, { type: file.contentType, length: file.bytes });
  }
}
