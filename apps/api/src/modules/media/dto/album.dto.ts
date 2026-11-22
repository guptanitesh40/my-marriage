import { ApiProperty } from '@nestjs/swagger';
import { ALBUM_KINDS, type AlbumKind } from '../schemas/album.schema.js';

/** The ceremony of an event album, as the album card shows it. */
export class AlbumEventDto {
  id: string;

  title: string;

  /** `YYYY-MM-DD` in the ceremony's time zone. */
  startDate?: string;

  /** `HH:mm` in the ceremony's time zone. */
  startTime?: string;

  venueName?: string;

  cancelled: boolean;

  completed: boolean;
}

/** How many photos an album holds, by review state. */
export class AlbumCountsDto {
  pending: number;

  approved: number;

  /** Every photo not deleted or rejected. */
  total: number;
}

/** An album as the wedding's owners and managers see it. */
export class AlbumDto {
  /** Album ID. */
  id: string;

  @ApiProperty({ enum: ALBUM_KINDS })
  kind: AlbumKind;

  /** For an event album, its ceremony's current name. */
  title: string;

  /** For an event album only. */
  event?: AlbumEventDto;

  /** Whether guests' upload links for it work. */
  isUploadEnabled: boolean;

  counts: AlbumCountsDto;

  /** The newest photo's small copy, for the album's card. */
  coverUrl?: string;

  createdAt: Date;

  updatedAt: Date;
}

export class AlbumListDto {
  /** Event albums in the Events page's order, then the general album, then the couple's own. */
  albums: AlbumDto[];
}
