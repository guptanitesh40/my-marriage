import { Body, Controller, Get, HttpCode, Ip, Param, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiConflictResponse,
  ApiCookieAuth,
  ApiGoneResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import type { Env } from '../../config/env.js';
import { ApiDataResponse } from '../../platform/response-envelope.js';
import { Public } from '../auth/auth.decorators.js';
import { GuestUploadDto } from './dto/upload-access.dto.js';
import { ExchangeUploadTokenDto } from './dto/upload-link.dto.js';
import { CreateUploadDto, UploadDto } from './dto/upload.dto.js';
import { UploadAccessService } from './upload-access.service.js';
import { readUploadCookie, setUploadCookie } from './upload-cookie.js';

/**
 * Guests uploading through a QR code or link: no account and no RSVP
 * session (PRD GUEST-07). The link is exchanged for an upload session
 * cookie, which these routes alone accept.
 */
@ApiTags('Guest uploads')
@Public()
@Controller('upload-access')
export class UploadAccessController {
  private readonly secureCookie: boolean;

  constructor(
    private readonly access: UploadAccessService,
    config: ConfigService<Env, true>,
  ) {
    this.secureCookie = config.get('NODE_ENV', { infer: true }) === 'production';
  }

  @Post('exchange')
  @HttpCode(200)
  @ApiOperation({ summary: 'Exchange QR upload token for scoped upload cookie' })
  @ApiDataResponse(GuestUploadDto)
  @ApiGoneResponse({ description: 'UPLOAD_LINK_UNAVAILABLE: unknown, revoked or expired.' })
  async exchange(
    @Body() body: ExchangeUploadTokenDto,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<GuestUploadDto> {
    const { cookie, view } = await this.access.exchange(body.token, { ip });
    setUploadCookie(res, cookie.value, cookie.expiresAt, this.secureCookie);
    return view;
  }

  @Get('current')
  @ApiCookieAuth('mm_upload_session')
  @ApiOperation({ summary: 'What the guest upload page shows' })
  @ApiDataResponse(GuestUploadDto)
  @ApiUnauthorizedResponse({ description: 'UPLOAD_SESSION_REQUIRED: open the link again.' })
  @ApiGoneResponse({ description: 'UPLOAD_LINK_UNAVAILABLE' })
  current(@Req() req: Request): Promise<GuestUploadDto> {
    return this.access.current(readUploadCookie(req));
  }

  @Post('uploads')
  @HttpCode(201)
  @ApiCookieAuth('mm_upload_session')
  @ApiOperation({ summary: 'Reserve storage and get an upload form, as a guest' })
  @ApiDataResponse(UploadDto, { status: 201 })
  @ApiUnauthorizedResponse({ description: 'UPLOAD_SESSION_REQUIRED' })
  @ApiGoneResponse({ description: 'UPLOAD_LINK_UNAVAILABLE' })
  @ApiConflictResponse({ description: 'ALBUM_CLOSED, STORAGE_FULL or WEDDING_ARCHIVED.' })
  initiate(@Req() req: Request, @Body() body: CreateUploadDto): Promise<UploadDto> {
    return this.access.initiate(readUploadCookie(req), body);
  }

  @Post('uploads/:uploadId/complete')
  @HttpCode(200)
  @ApiCookieAuth('mm_upload_session')
  @ApiOperation({ summary: 'Verify a guest’s uploaded file and queue processing' })
  @ApiDataResponse(UploadDto)
  @ApiUnauthorizedResponse({ description: 'UPLOAD_SESSION_REQUIRED' })
  complete(@Req() req: Request, @Param('uploadId') uploadId: string): Promise<UploadDto> {
    return this.access.complete(readUploadCookie(req), uploadId);
  }
}
