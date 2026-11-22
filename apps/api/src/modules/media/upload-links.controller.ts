import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiDataResponse } from '../../platform/response-envelope.js';
import { CurrentUser } from '../auth/auth.decorators.js';
import type { AuthenticatedUser } from '../auth/sessions.service.js';
import {
  CreateUploadLinkDto,
  EmailUploadLinkDto,
  EmailUploadLinkResultDto,
  PhotoInviteAudienceDto,
  UploadLinkDto,
  UploadLinksDto,
} from './dto/upload-link.dto.js';
import { UploadLinksService } from './upload-links.service.js';

/**
 * Guest upload links and their QR codes, for a wedding's owners and
 * managers; 404 to anyone else. Each URL is a bearer credential.
 */
@ApiTags('Albums')
@ApiCookieAuth('mm_session')
@Controller('weddings/:weddingId')
export class UploadLinksController {
  constructor(private readonly links: UploadLinksService) {}

  @Get('upload-links')
  @ApiOperation({ summary: 'List active upload links' })
  @ApiDataResponse(UploadLinksDto)
  @ApiNotFoundResponse({ description: 'WEDDING_NOT_FOUND' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
  ): Promise<UploadLinksDto> {
    return this.links.list(user, weddingId);
  }

  /** The general link, where guests choose the album; `replace` rotates it. */
  @Post('upload-links')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get or rotate the general upload link' })
  @ApiDataResponse(UploadLinkDto)
  @ApiNotFoundResponse({ description: 'WEDDING_NOT_FOUND' })
  @ApiConflictResponse({ description: 'WEDDING_ARCHIVED' })
  general(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Body() body: CreateUploadLinkDto,
  ): Promise<UploadLinkDto> {
    return this.links.general(user, weddingId, body.replace);
  }

  /** An album's link; `replace` rotates it, and the old one stops working. */
  @Post('albums/:albumId/upload-links')
  @HttpCode(200)
  @ApiOperation({ summary: 'Create or rotate an album’s QR/upload link' })
  @ApiDataResponse(UploadLinkDto)
  @ApiNotFoundResponse({ description: 'WEDDING_NOT_FOUND or ALBUM_NOT_FOUND' })
  @ApiConflictResponse({ description: 'WEDDING_ARCHIVED' })
  forAlbum(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Param('albumId') albumId: string,
    @Body() body: CreateUploadLinkDto,
  ): Promise<UploadLinkDto> {
    return this.links.forAlbum(user, weddingId, albumId, body.replace);
  }

  /** Turns a link off for good; photos already uploaded stay. */
  @Post('upload-links/:linkId/revoke')
  @HttpCode(204)
  @ApiOperation({ summary: 'Revoke QR/upload capability' })
  @ApiNoContentResponse({ description: 'The link no longer works.' })
  @ApiNotFoundResponse({ description: 'WEDDING_NOT_FOUND or UPLOAD_LINK_NOT_FOUND' })
  revoke(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Param('linkId') linkId: string,
  ): Promise<void> {
    return this.links.revoke(user, weddingId, linkId);
  }

  @Get('upload-links/email-audiences')
  @ApiOperation({ summary: 'Count guests each email choice would reach' })
  @ApiDataResponse(PhotoInviteAudienceDto)
  @ApiNotFoundResponse({ description: 'WEDDING_NOT_FOUND' })
  audiences(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
  ): Promise<PhotoInviteAudienceDto> {
    return this.links.audiences(user, weddingId);
  }

  /** Emails the general link to all guests with an address, or those attending. */
  @Post('upload-links/email')
  @HttpCode(200)
  @ApiOperation({ summary: 'Email the general upload link to guests' })
  @ApiDataResponse(EmailUploadLinkResultDto)
  @ApiNotFoundResponse({ description: 'WEDDING_NOT_FOUND' })
  @ApiConflictResponse({ description: 'WEDDING_ARCHIVED' })
  email(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Body() body: EmailUploadLinkDto,
  ): Promise<EmailUploadLinkResultDto> {
    return this.links.email(user, weddingId, body.audience);
  }
}
