import { Body, Controller, HttpCode, Param, Post } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCookieAuth,
  ApiGoneResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ApiDataResponse } from '../../platform/response-envelope.js';
import { CurrentUser } from '../auth/auth.decorators.js';
import type { AuthenticatedUser } from '../auth/sessions.service.js';
import { CreateUploadDto, UploadDto } from './dto/upload.dto.js';
import { UploadsService } from './uploads.service.js';

/**
 * Direct photo uploads (architecture §5.3): set space aside and get a form,
 * send the file to it, then say it is done.
 */
@ApiTags('Media')
@ApiCookieAuth('mm_session')
@Controller('media/uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  /**
   * Sets aside space for one photo and returns a short-lived form to upload
   * it to. The form is a bearer credential: never logged or stored.
   */
  @Post('initiate')
  @HttpCode(201)
  @ApiOperation({ summary: 'Reserve storage and get a short-lived upload form' })
  @ApiDataResponse(UploadDto, { status: 201 })
  @ApiNotFoundResponse({ description: 'ALBUM_NOT_FOUND: not an album of a wedding you belong to.' })
  @ApiConflictResponse({
    description: 'STORAGE_FULL: the 5 GB are used. WEDDING_ARCHIVED: the wedding is read-only.',
  })
  initiate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateUploadDto,
  ): Promise<UploadDto> {
    return this.uploads.initiateAsMember(user, body);
  }

  /** Checks the file arrived and is a photo, then queues it for processing. */
  @Post(':uploadId/complete')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify the uploaded file and queue processing' })
  @ApiDataResponse(UploadDto)
  @ApiNotFoundResponse({ description: 'UPLOAD_NOT_FOUND' })
  @ApiConflictResponse({ description: 'UPLOAD_NOT_RECEIVED: try again once the file is sent.' })
  @ApiGoneResponse({ description: 'UPLOAD_EXPIRED: start again.' })
  @ApiPayloadTooLargeResponse({ description: 'UPLOAD_TOO_LARGE' })
  @ApiUnprocessableEntityResponse({ description: 'UPLOAD_NOT_IMAGE: not the photo type it said.' })
  complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('uploadId') uploadId: string,
  ): Promise<UploadDto> {
    return this.uploads.completeAsMember(user, uploadId);
  }
}
