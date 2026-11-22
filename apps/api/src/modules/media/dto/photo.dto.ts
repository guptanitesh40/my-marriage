import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsMongoId } from 'class-validator';
import {
  MODERATION_STATES,
  PHOTO_SOURCES,
  type ModerationState,
  type PhotoSource,
} from '../schemas/photo.schema.js';

/** A photo as the wedding's owners and managers see it. Private. */
export class PhotoDto {
  /** Photo ID. */
  id: string;

  albumId: string;

  @ApiProperty({ enum: MODERATION_STATES })
  moderation: ModerationState;

  @ApiProperty({ enum: PHOTO_SOURCES })
  source: PhotoSource;

  /** A guest's name, when given. */
  uploaderName?: string;

  /** The member who uploaded it. */
  uploadedByName?: string;

  originalName: string;

  /** Upright size, in pixels. */
  width: number;

  height: number;

  /** The original's size. */
  bytes: number;

  /** Small copy for grids, from the API. */
  thumbUrl: string;

  /** Large copy for viewing, from the API. */
  displayUrl: string;

  createdAt: Date;
}

export class PhotoListDto {
  /** Newest first. */
  photos: PhotoDto[];

  /** Uploads received and still being checked; they appear here when done. */
  processing: number;

  /** True when the album has more photos than the list returns. */
  truncated: boolean;
}

/** What can be done to several photos at once; `remove` deletes them for good. */
export const MODERATION_ACTIONS = ['approve', 'reject', 'remove'] as const;
export type ModerationAction = (typeof MODERATION_ACTIONS)[number];

/** Approves or rejects several photos at once (Stitch "Approve All", "Reject Selected"). */
export class BulkModerationDto {
  @ApiProperty({ enum: MODERATION_ACTIONS })
  @IsIn(MODERATION_ACTIONS, { message: 'Choose approve, reject or remove.' })
  action: ModerationAction;

  @ApiProperty({ type: [String], minItems: 1, maxItems: 100 })
  @IsArray()
  @ArrayMinSize(1, { message: 'Choose at least one photo.' })
  @ArrayMaxSize(100, { message: 'Choose up to 100 photos at a time.' })
  @IsMongoId({ each: true })
  photoIds: string[];
}

export class BulkModerationResultDto {
  /** Photos changed; others were already reviewed or are gone. */
  changed: number;
}

/** The photos waiting for review across every album (Stitch moderation queue). */
export class ReviewQueueDto {
  /** Oldest first, so the earliest uploads are reviewed first. */
  photos: PhotoDto[];

  /** All photos waiting, which may be more than listed. */
  total: number;

  /** Uploads received and still being checked; they join the queue when done. */
  processing: number;
}
