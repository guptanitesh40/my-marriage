import { Body, Controller, Get, HttpCode, Ip, Param, Post } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiGoneResponse,
  ApiNoContentResponse,
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

/**
 * Inviting people to a wedding's team, and accepting or declining
 * (decision 0020). Owners and admins invite; managers never manage the team.
 */
@ApiTags('Team')
@ApiCookieAuth('mm_session')
@Controller()
export class MemberInvitesController {
  constructor(private readonly invites: MemberInvitesService) {}

  /**
   * Invites someone by email. `owner` (your partner): owners only; replaces
   * a pending partner invitation; 409 OWNER_LIMIT with two owners. `admin`
   * or `manager`: owners and admins; 409 ALREADY_MEMBER or ALREADY_INVITED.
   */
  @Post('weddings/:weddingId/member-invites')
  @HttpCode(201)
  @ApiOperation({ summary: 'Invite an admin, a manager or the second owner' })
  @ApiDataResponse(MemberInviteDto, { status: 201 })
  @ApiForbiddenResponse({ description: 'ADMIN_REQUIRED or OWNER_REQUIRED.' })
  @ApiConflictResponse({
    description: 'ALREADY_MEMBER, ALREADY_INVITED, OWNER_LIMIT or WEDDING_ARCHIVED.',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Body() body: CreateMemberInviteDto,
  ): Promise<MemberInviteDto> {
    return this.invites.create(user, weddingId, body);
  }

  /** The wedding's invitations, newest first, with whether each email went out. Owners and admins. */
  @Get('weddings/:weddingId/member-invites')
  @ApiOperation({ summary: 'List pending/consumed membership invites' })
  @ApiDataResponse(MemberInviteDto, { isArray: true })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
  ): Promise<MemberInviteDto[]> {
    return this.invites.list(user, weddingId);
  }

  /** Sends a pending invitation again with a new link; the old link stops working. Owners and admins. */
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
   * Withdraws a pending invitation: its links stop working at once. Owners
   * and admins (the partner's: owners). 409 INVITE_NOT_PENDING once it was
   * accepted or declined.
   */
  @Post('weddings/:weddingId/member-invites/:inviteId/revoke')
  @HttpCode(200)
  @ApiOperation({ summary: 'Revoke pending member invitation' })
  @ApiDataResponse(MemberInviteDto)
  @ApiConflictResponse({ description: 'INVITE_NOT_PENDING or WEDDING_ARCHIVED.' })
  revoke(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Param('inviteId') inviteId: string,
  ): Promise<MemberInviteDto> {
    return this.invites.revoke(user, weddingId, inviteId);
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
   * 409 OWNER_LIMIT; 410 INVITE_INVALID. Joins with the invitation's role;
   * owning or managing other weddings does not matter.
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
   * Declines an invitation from its link, as the signed-in, verified account
   * it was sent to. It stops working; they can be invited again later.
   */
  @Post('member-invites/decline')
  @HttpCode(204)
  @ApiOperation({ summary: 'Decline an invitation' })
  @ApiNoContentResponse({ description: 'Declined.' })
  @ApiGoneResponse({ description: 'INVITE_INVALID: expired, replaced or withdrawn.' })
  async decline(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: InviteTokenDto,
    @Ip() ip: string,
  ): Promise<void> {
    await this.invites.decline(user, body.token, { ip });
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
   * 404 INVITE_NOT_FOUND for anyone else; 409 OWNER_LIMIT; 410
   * INVITE_INVALID once expired or replaced.
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

  /** Declines an invitation sent to my email address, without the link. */
  @Post('member-invites/:inviteId/decline')
  @HttpCode(204)
  @ApiOperation({ summary: 'Decline an invitation sent to my email address' })
  @ApiNoContentResponse({ description: 'Declined.' })
  @ApiNotFoundResponse({ description: 'INVITE_NOT_FOUND: no such invitation for this account.' })
  @ApiGoneResponse({ description: 'INVITE_INVALID: expired, replaced or withdrawn.' })
  async declineById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('inviteId') inviteId: string,
  ): Promise<void> {
    await this.invites.declineById(user, inviteId);
  }
}
