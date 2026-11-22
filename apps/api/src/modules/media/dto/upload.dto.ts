import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { IMAGE_TYPES, type ImageType } from '../../../platform/storage/image-type.js';
import { PHOTO_MAX_BYTES, UPLOAD_LIMITS } from '../media-policy.js';
import { UPLOAD_STATES, type UploadState } from '../schemas/upload-intent.schema.js';

const trimmed = Transform(({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.normalize('NFC').trim().replace(/\s+/g, ' ') : value,
);

/** One photo to upload (API document "UploadIntentCreate"). */
export class CreateUploadDto {
  @ApiProperty({ example: '65f000000000000000000401' })
  @IsMongoId({ message: 'Choose an album.' })
  albumId: string;

  /** As on the guest's device; shown to the couple only. */
  @ApiProperty({ maxLength: UPLOAD_LIMITS.fileName, example: 'haldi-01.jpg' })
  @trimmed
  @IsString({ message: 'Name the file.' })
  @MinLength(1, { message: 'Name the file.' })
  @MaxLength(UPLOAD_LIMITS.fileName, { message: 'This file name is too long.' })
  @Matches(/^[^\p{Cc}\p{Cf}/\\]*$/u, { message: 'This file name has characters we can’t keep.' })
  fileName: string;

  @ApiProperty({ enum: IMAGE_TYPES })
  @IsIn(IMAGE_TYPES, { message: 'Choose a JPG, PNG or WebP photo.' })
  contentType: ImageType;

  @ApiProperty({ minimum: 1, maximum: PHOTO_MAX_BYTES, example: 4820000 })
  @IsInt({ message: 'Give the file’s size.' })
  @Min(1, { message: 'This file is empty.' })
  @Max(PHOTO_MAX_BYTES, { message: `Photos can be up to ${PHOTO_MAX_BYTES / 1_000_000} MB.` })
  declaredBytes: number;

  /** A guest's name, optional; shown to the couple only. */
  @ApiProperty({ required: false, maxLength: UPLOAD_LIMITS.uploaderName, example: 'Priya D.' })
  @IsOptional()
  @trimmed
  @IsString({ message: 'Enter your name.' })
  @MaxLength(UPLOAD_LIMITS.uploaderName, {
    message: `Use ${UPLOAD_LIMITS.uploaderName} characters or fewer.`,
  })
  @Matches(/^[^\p{Cc}\p{Cf}]*$/u, { message: 'Use letters, numbers and punctuation only.' })
  uploaderName?: string;
}

/** Where to send the file: a form POST of `fields`, then the file as `file`. Never logged. */
export class UploadFormDto {
  url: string;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'string' } })
  fields: Record<string, string>;
}

/** An upload and how far it got. */
export class UploadDto {
  /** Upload ID. */
  id: string;

  albumId: string;

  @ApiProperty({ enum: UPLOAD_STATES })
  state: UploadState;

  /** The form stops working then. */
  expiresAt: Date;

  /** Only when the upload was just started. */
  upload?: UploadFormDto;
}
