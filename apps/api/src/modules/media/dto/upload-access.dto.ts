import { ApiProperty } from '@nestjs/swagger';
import { CAPABILITY_SCOPES, type CapabilityScope } from '../schemas/upload-capability.schema.js';

/** An album a guest can upload to. */
export class GuestAlbumDto {
  id: string;

  title: string;

  /** `YYYY-MM-DD`, for a ceremony's album. */
  startDate?: string;

  venueName?: string;
}

export const UPLOAD_CLOSED_REASONS = ['archived', 'paused', 'storage_full'] as const;
export type UploadClosedReason = (typeof UPLOAD_CLOSED_REASONS)[number];

/**
 * What a guest's upload page shows: whose wedding, and where photos can
 * go. Nothing about other guests, the guest list or private photos.
 */
export class GuestUploadDto {
  /** "Ananya & Arjun". */
  coupleName: string;

  @ApiProperty({ enum: CAPABILITY_SCOPES })
  scope: CapabilityScope;

  /** For an album link: its album, open or not. */
  album?: GuestAlbumDto;

  /** Albums open to uploads now: the link's album, or every open album for a general link. */
  albums: GuestAlbumDto[];

  /** False when nothing can be uploaded; `closedReason` says why. */
  open: boolean;

  @ApiProperty({ enum: UPLOAD_CLOSED_REASONS, required: false })
  closedReason?: UploadClosedReason;

  /** The published wedding website, if there is one. */
  websitePath?: string;
}
