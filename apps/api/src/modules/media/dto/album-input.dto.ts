import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { TextLineField } from '../../weddings/dto/fields.js';
import { ALBUM_LIMITS } from '../media-policy.js';

const TITLE_EMPTY = 'Enter a name for the album.';

/** A new album of the couple's own (PRD PHOTO-01); ceremonies get theirs automatically. */
export class CreateAlbumDto {
  @TextLineField({
    maxLength: ALBUM_LIMITS.title,
    empty: TITLE_EMPTY,
    example: 'Pre-Wedding Shoot',
  })
  title: string;
}

/** Changes to an album. Fields left out stay as they are. */
export class UpdateAlbumDto {
  /** Not for an event album, which takes its ceremony's name. */
  @TextLineField({
    maxLength: ALBUM_LIMITS.title,
    empty: TITLE_EMPTY,
    example: 'Pre-Wedding Shoot',
    optional: true,
  })
  title?: string;

  /** Pauses or resumes guests' upload links for this album. */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean({ message: 'Choose whether guests can upload.' })
  isUploadEnabled?: boolean;
}
