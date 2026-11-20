import {
  Body,
  Controller,
  createParamDecorator,
  Get,
  HttpCode,
  Ip,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
  type ExecutionContext,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiConflictResponse,
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import type { Env } from '../../config/env.js';
import { ApiDataResponse } from '../../platform/response-envelope.js';
import { Public } from '../auth/auth.decorators.js';
import { ExchangeTokenDto, RsvpPatchDto } from './dto/guest-access-input.dto.js';
import { GuestReminderChoiceDto, GuestViewDto, GuestViewEventDto } from './dto/guest-view.dto.js';
import { GuestAccessService, type GuestContext } from './guest-access.service.js';
import { clearGuestCookie, readGuestCookie, setGuestCookie } from './guest-cookie.js';
import { guestSessionMissing } from './guest-errors.js';
import { GuestSessionGuard, type GuestRequest } from './guest-session.guard.js';

/** The guest the cookie belongs to; only on routes with GuestSessionGuard. */
const CurrentGuest = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  const guest = context.switchToHttp().getRequest<GuestRequest>().guest;
  if (!guest) throw guestSessionMissing();
  return guest;
});

/**
 * A guest's private invitation (PRD INV-02 to INV-04, GUEST-07). No
 * organizer account is involved: these routes are public to the organizer
 * guard, and use the separate `mm_guest_session` cookie.
 */
@ApiTags('Guest RSVP')
@Public()
@Controller('guest-access')
export class GuestAccessController {
  private readonly secureCookie: boolean;

  constructor(
    private readonly access: GuestAccessService,
    config: ConfigService<Env, true>,
  ) {
    this.secureCookie = config.get('NODE_ENV', { infer: true }) === 'production';
  }

  /** Exchanges the secret from a link for a guest cookie. */
  @Post('exchange')
  @HttpCode(204)
  @ApiOperation({ summary: 'Exchange raw private invite token for scoped cookie' })
  @ApiNoContentResponse({ description: 'The guest cookie is set.' })
  @ApiNotFoundResponse({ description: 'INVITATION_LINK_UNAVAILABLE: unknown or revoked.' })
  async exchange(
    @Body() body: ExchangeTokenDto,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const session = await this.access.exchange(body.token, { ip });
    setGuestCookie(res, session.sessionToken, session.expiresAt, this.secureCookie);
  }

  /** The guest's name, party size and invited ceremonies, nothing else. */
  @Get('invitation')
  @UseGuards(GuestSessionGuard)
  @ApiCookieAuth('mm_guest_session')
  @ApiOperation({ summary: 'View contact name and selected ceremonies' })
  @ApiDataResponse(GuestViewDto)
  @ApiUnauthorizedResponse({ description: 'GUEST_SESSION_REQUIRED: open the link again.' })
  invitation(@CurrentGuest() guest: GuestContext): Promise<GuestViewDto> {
    return this.access.view(guest);
  }

  /** Answers one ceremony; a stale `responseVersion` is refused (409). */
  @Patch('events/:invitationId/rsvp')
  @UseGuards(GuestSessionGuard)
  @ApiCookieAuth('mm_guest_session')
  @ApiOperation({ summary: 'Change RSVP for selected ceremony' })
  @ApiDataResponse(GuestViewEventDto)
  @ApiUnauthorizedResponse({ description: 'GUEST_SESSION_REQUIRED: open the link again.' })
  @ApiNotFoundResponse({ description: 'EVENT_INVITATION_NOT_FOUND: not invited to it.' })
  @ApiConflictResponse({
    description: 'RSVP_VERSION_CONFLICT, RSVP_CLOSED or WEDDING_ARCHIVED.',
  })
  answer(
    @CurrentGuest() guest: GuestContext,
    @Param('invitationId') invitationId: string,
    @Body() body: RsvpPatchDto,
  ): Promise<GuestViewEventDto> {
    return this.access.answer(guest, invitationId, body);
  }

  /** Stops reminder emails to this guest (by hand or on schedule); the invitation stays. */
  @Post('reminders/opt-out')
  @HttpCode(200)
  @UseGuards(GuestSessionGuard)
  @ApiCookieAuth('mm_guest_session')
  @ApiOperation({ summary: 'Opt out of reminder emails' })
  @ApiDataResponse(GuestReminderChoiceDto)
  @ApiUnauthorizedResponse({ description: 'GUEST_SESSION_REQUIRED: open the link again.' })
  optOut(@CurrentGuest() guest: GuestContext): Promise<GuestReminderChoiceDto> {
    return this.access.setReminderEmails(guest, 'off');
  }

  /** Turns reminder emails back on. */
  @Post('reminders/opt-in')
  @HttpCode(200)
  @UseGuards(GuestSessionGuard)
  @ApiCookieAuth('mm_guest_session')
  @ApiOperation({ summary: 'Receive reminder emails again' })
  @ApiDataResponse(GuestReminderChoiceDto)
  @ApiUnauthorizedResponse({ description: 'GUEST_SESSION_REQUIRED: open the link again.' })
  optIn(@CurrentGuest() guest: GuestContext): Promise<GuestReminderChoiceDto> {
    return this.access.setReminderEmails(guest, 'on');
  }

  /** Forgets this browser's guest session; the link keeps working. */
  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'Clear invitation-scoped session' })
  @ApiNoContentResponse({ description: 'Signed out of the invitation.' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.access.logout(readGuestCookie(req));
    clearGuestCookie(res, this.secureCookie);
  }
}
