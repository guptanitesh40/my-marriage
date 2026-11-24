import { Body, Controller, Delete, Get, HttpCode, Param, Patch } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiDataResponse } from '../../platform/response-envelope.js';
import { CurrentUser } from '../auth/auth.decorators.js';
import type { AuthenticatedUser } from '../auth/sessions.service.js';
import { TeamDto, TeamMemberDto } from '../weddings/dto/team.dto.js';
import { UpdateMemberDto } from '../weddings/dto/update-member.dto.js';
import { TeamService } from './team.service.js';

/** The team page: owners and admins only (decision 0020). */
@ApiTags('Team')
@ApiCookieAuth('mm_session')
@Controller('weddings/:weddingId')
export class TeamController {
  constructor(private readonly team: TeamService) {}

  /** Members with their addresses, labels and open tasks, and the invitations. */
  @Get('team')
  @ApiOperation({ summary: 'Team members and invitations, for owners and admins' })
  @ApiDataResponse(TeamDto)
  @ApiForbiddenResponse({ description: 'ADMIN_REQUIRED: managers do not manage the team.' })
  view(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
  ): Promise<TeamDto> {
    return this.team.view(user, weddingId);
  }

  /**
   * Changes a member's role (admin or manager; never an owner's, never your
   * own) or label (anyone's).
   */
  @Patch('members/:memberId')
  @ApiOperation({ summary: 'Change a member’s role or label' })
  @ApiDataResponse(TeamMemberDto)
  @ApiForbiddenResponse({ description: 'ADMIN_REQUIRED, OWNER_PROTECTED or NOT_YOURSELF.' })
  @ApiNotFoundResponse({ description: 'MEMBER_NOT_FOUND' })
  @ApiConflictResponse({ description: 'WEDDING_ARCHIVED' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Param('memberId') memberId: string,
    @Body() body: UpdateMemberDto,
  ): Promise<TeamMemberDto> {
    return this.team.update(user, weddingId, memberId, body);
  }

  /**
   * Removes an admin or manager (never an owner, never yourself). They lose
   * access at once; their tasks become unassigned; what they wrote stays.
   */
  @Delete('members/:memberId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove manager from a wedding' })
  @ApiNoContentResponse({ description: 'Removed.' })
  @ApiForbiddenResponse({ description: 'ADMIN_REQUIRED, OWNER_PROTECTED or NOT_YOURSELF.' })
  @ApiNotFoundResponse({ description: 'MEMBER_NOT_FOUND' })
  @ApiConflictResponse({ description: 'WEDDING_ARCHIVED' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Param('memberId') memberId: string,
  ): Promise<void> {
    await this.team.remove(user, weddingId, memberId);
  }
}
