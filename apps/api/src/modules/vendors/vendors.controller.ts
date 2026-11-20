import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
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
import { CreateVendorDto } from './dto/create-vendor.dto.js';
import { UpdateVendorDto } from './dto/update-vendor.dto.js';
import { VendorDto, VendorListDto } from './dto/vendor.dto.js';
import { VendorsService } from './vendors.service.js';

const NOT_FOUND =
  'WEDDING_NOT_FOUND: not a wedding you belong to. VENDOR_NOT_FOUND: no such vendor in it.';

/**
 * For a wedding's owners and managers; 404 to anyone else, as for every
 * wedding route. Vendors are private and never public.
 */
@ApiTags('Vendors')
@ApiCookieAuth('mm_session')
@Controller('weddings/:weddingId/vendors')
export class VendorsController {
  constructor(private readonly vendors: VendorsService) {}

  /** The wedding's vendors, by name. */
  @Get()
  @ApiOperation({ summary: 'List private vendors' })
  @ApiDataResponse(VendorListDto)
  @ApiNotFoundResponse({ description: 'WEDDING_NOT_FOUND: not a wedding you belong to.' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
  ): Promise<VendorListDto> {
    return this.vendors.list(user, weddingId);
  }

  /**
   * Adds a vendor. `name` and `category` are required; `eventIds` must be
   * the wedding's own events.
   */
  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create vendor contact' })
  @ApiDataResponse(VendorDto, { status: 201 })
  @ApiNotFoundResponse({ description: 'WEDDING_NOT_FOUND: not a wedding you belong to.' })
  @ApiConflictResponse({ description: 'WEDDING_ARCHIVED: the wedding is read-only.' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Body() body: CreateVendorDto,
  ): Promise<VendorDto> {
    return this.vendors.create(user, weddingId, body);
  }

  @Get(':vendorId')
  @ApiOperation({ summary: 'Read vendor' })
  @ApiDataResponse(VendorDto)
  @ApiNotFoundResponse({ description: NOT_FOUND })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Param('vendorId') vendorId: string,
  ): Promise<VendorDto> {
    return this.vendors.get(user, weddingId, vendorId);
  }

  /**
   * Changes a vendor. Fields left out stay; `null` or `""` removes an
   * optional one; `eventIds` replaces the linked events.
   */
  @Patch(':vendorId')
  @ApiOperation({ summary: 'Update vendor' })
  @ApiDataResponse(VendorDto)
  @ApiNotFoundResponse({ description: NOT_FOUND })
  @ApiConflictResponse({ description: 'WEDDING_ARCHIVED: the wedding is read-only.' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Param('vendorId') vendorId: string,
    @Body() body: UpdateVendorDto,
  ): Promise<VendorDto> {
    return this.vendors.update(user, weddingId, vendorId, body);
  }

  /**
   * Deletes a vendor (owners only). The record is kept, marked as deleted,
   * so expenses can still name it; it is no longer listed or read.
   */
  @Delete(':vendorId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete vendor (owners only); the record is kept, marked deleted' })
  @ApiNoContentResponse({ description: 'The vendor is deleted.' })
  @ApiForbiddenResponse({ description: 'OWNER_REQUIRED: managers cannot delete vendors.' })
  @ApiNotFoundResponse({ description: NOT_FOUND })
  @ApiConflictResponse({ description: 'WEDDING_ARCHIVED: the wedding is read-only.' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Param('vendorId') vendorId: string,
  ): Promise<void> {
    return this.vendors.remove(user, weddingId, vendorId);
  }
}
