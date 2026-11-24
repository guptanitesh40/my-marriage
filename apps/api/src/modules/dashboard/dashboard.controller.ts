import { Controller, Get, Param } from '@nestjs/common';
import { ApiCookieAuth, ApiNotFoundResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiDataResponse } from '../../platform/response-envelope.js';
import { CurrentUser } from '../auth/auth.decorators.js';
import type { AuthenticatedUser } from '../auth/sessions.service.js';
import { DashboardService } from './dashboard.service.js';
import { DashboardDto } from './dto/dashboard.dto.js';

/** The wedding overview, for any member; 404 to anyone else. Never public. */
@ApiTags('Dashboard')
@ApiCookieAuth('mm_session')
@Controller('weddings/:weddingId')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  /**
   * Ceremonies to come, open tasks, recorded expenses, guest answers,
   * photos, website and team, each loaded on its own. A section that could
   * not be loaded is left out and named in `unavailable`.
   */
  @Get('dashboard')
  @ApiOperation({ summary: 'Wedding overview' })
  @ApiDataResponse(DashboardDto)
  @ApiNotFoundResponse({ description: 'WEDDING_NOT_FOUND: not a wedding you belong to.' })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
  ): Promise<DashboardDto> {
    return this.dashboard.get(user, weddingId);
  }
}
