import { Controller, Get, Header, Param } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
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
}
