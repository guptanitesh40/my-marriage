import { Body, Controller, Get, HttpCode, Ip, Param, Post } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiGoneResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiDataResponse } from '../../platform/response-envelope.js';
import { CurrentUser, Public } from '../auth/auth.decorators.js';
import type { AuthenticatedUser } from '../auth/sessions.service.js';
import { CreateMemberInviteDto } from './dto/create-member-invite.dto.js';
import { InvitePreviewDto } from './dto/invite-preview.dto.js';
import { InviteTokenDto } from './dto/invite-token.dto.js';
import { MemberInviteDto } from './dto/member-invite.dto.js';
import { MyInviteDto } from './dto/my-invite.dto.js';
import { WeddingDto } from './dto/wedding.dto.js';
import { MemberInvitesService } from './member-invites.service.js';

/** Inviting your partner to be the wedding's second owner, and accepting. */
@ApiTags('Team')
@ApiCookieAuth('mm_session')
@Controller()
export class MemberInvitesController {
  constructor(private readonly invites: MemberInvitesService) {}

  /**
   * Invites your partner by email, as an equal owner. Owners only. Replaces
   * a pending invitation. 409 OWNER_LIMIT when the wedding has two owners.
   */
  @Post('weddings/:weddingId/member-invites')
  @HttpCode(201)
  @ApiOperation({ summary: 'Invite a manager or second co-owner' })
  @ApiDataResponse(MemberInviteDto, { status: 201 })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Body() body: CreateMemberInviteDto,
  ): Promise<MemberInviteDto> {
    return this.invites.create(user, weddingId, body);
  }

  /** The wedding's invitations, newest first, with whether each email went out. */
  @Get('weddings/:weddingId/member-invites')
  @ApiOperation({ summary: 'List pending/consumed membership invites' })
  @ApiDataResponse(MemberInviteDto, { isArray: true })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
  ): Promise<MemberInviteDto[]> {
    return this.invites.list(user, weddingId);
  }

  /** Sends a pending invitation again with a new link; the old link stops working. */
  @Post('weddings/:weddingId/member-invites/:inviteId/resend')
  @HttpCode(200)
  @ApiOperation({ summary: 'Resend a pending member invitation' })
  @ApiDataResponse(MemberInviteDto)
  resend(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Param('inviteId') inviteId: string,
  ): Promise<MemberInviteDto> {
    return this.invites.resend(user, weddingId, inviteId);
  }

  /**
   * What an invitation link is for: the wedding, who sent it and which
   * address may accept. Public, for an invitee who has no account yet.
   */
  @Post('member-invites/preview')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Read an invitation from its link' })
  @ApiDataResponse(InvitePreviewDto)
  @ApiGoneResponse({ description: 'INVITE_INVALID: expired, replaced or withdrawn.' })
  preview(@Body() body: InviteTokenDto, @Ip() ip: string): Promise<InvitePreviewDto> {
    return this.invites.preview(body.token, { ip });
  }

  /**
   * Accepts an invitation as the signed-in, verified account it was sent to,
   * and returns the wedding. 403 INVITE_EMAIL_MISMATCH for another account;
   * 409 OWNER_LIMIT or OWNER_ACTIVE_LIMIT; 410 INVITE_INVALID.
   */
  @Post('member-invites/accept')
  @HttpCode(200)
  @ApiOperation({ summary: 'Accept invite as signed-in matching email' })
  @ApiDataResponse(WeddingDto)
  accept(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: InviteTokenDto,
    @Ip() ip: string,
  ): Promise<WeddingDto> {
    return this.invites.accept(user, body.token, { ip });
  }

  /**
   * Pending invitations sent to the signed-in account's own verified
   * address, newest first. Lets an invitee who signed in without the link
   * see what is waiting for them.
   */
  @Get('member-invites/mine')
  @ApiOperation({ summary: 'List invitations sent to my email address' })
  @ApiDataResponse(MyInviteDto, { isArray: true })
  mine(@CurrentUser() user: AuthenticatedUser): Promise<MyInviteDto[]> {
    return this.invites.listMine(user);
  }

  /**
   * Accepts one of those invitations without the link: the account's
   * verified address must be the one it was sent to. Returns the wedding.
   * 404 INVITE_NOT_FOUND for anyone else; 409 OWNER_LIMIT or
   * OWNER_ACTIVE_LIMIT; 410 INVITE_INVALID once expired or replaced.
   */
  @Post('member-invites/:inviteId/accept')
  @HttpCode(200)
  @ApiOperation({ summary: 'Accept an invitation sent to my email address' })
  @ApiDataResponse(WeddingDto)
  @ApiNotFoundResponse({ description: 'INVITE_NOT_FOUND: no such invitation for this account.' })
  @ApiGoneResponse({ description: 'INVITE_INVALID: expired, replaced or withdrawn.' })
  acceptById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('inviteId') inviteId: string,
  ): Promise<WeddingDto> {
    return this.invites.acceptById(user, inviteId);
  }
}
