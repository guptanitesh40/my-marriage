import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsMongoId, IsOptional } from 'class-validator';
import {
  EXPORT_SCOPES,
  EXPORT_STATES,
  type ExportScope,
  type ExportState,
} from '../schemas/media-export.schema.js';

/** Starts a ZIP of the wedding's photos, or of one album. */
export class CreateMediaExportDto {
  /** Approved photos only, or every photo you can see (pending and hidden too). */
  @ApiProperty({ enum: EXPORT_SCOPES })
  @IsIn(EXPORT_SCOPES, { message: 'Choose approved or all photos.' })
  scope: ExportScope;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId({ message: 'Choose an album.' })
  albumId?: string;
}

export class MediaExportDto {
  /** Export ID. */
  id: string;

  @ApiProperty({ enum: EXPORT_SCOPES })
  scope: ExportScope;

  albumId?: string;

  @ApiProperty({ enum: EXPORT_STATES })
  state: ExportState;

  photoCount?: number;

  bytes?: number;

  /** When ready: the API route that streams the ZIP to the wedding's members. */
  downloadUrl?: string;

  /** When the ZIP is removed. */
  expiresAt?: Date;

  createdAt: Date;
}

export class MediaExportListDto {
  /** Newest first, at most five. */
  exports: MediaExportDto[];
}
