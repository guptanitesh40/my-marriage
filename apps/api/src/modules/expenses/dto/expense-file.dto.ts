import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { DOCUMENT_TYPES, type DocumentType } from '../../../platform/storage/document-type.js';
import { RECEIPT_LIMITS } from '../expense-policy.js';

/** Asks for a form to upload one receipt or document to (decision 0023). */
export class ExpenseFileUploadRequestDto {
  @ApiProperty({ enum: DOCUMENT_TYPES })
  @IsIn(DOCUMENT_TYPES, {
    message: 'Choose a PDF, a photo (JPEG, PNG, WebP or HEIC), or a Word or Excel file.',
  })
  contentType: DocumentType;

  @ApiProperty({ type: 'integer', minimum: 1, maximum: RECEIPT_LIMITS.bytes })
  @IsInt({ message: 'Choose a file.' })
  @Min(1, { message: 'That file is empty.' })
  @Max(RECEIPT_LIMITS.bytes, { message: 'That file is too large. Choose one under 15 MB.' })
  bytes: number;

  /** The name on the uploader's device; kept tidied, for showing and downloading. */
  @ApiProperty({ minLength: 1, maxLength: 255, example: 'Caterer advance receipt.pdf' })
  @IsString({ message: 'Choose a file.' })
  @MinLength(1, { message: 'Choose a file.' })
  @MaxLength(255, { message: 'That file’s name is too long. Rename it and try again.' })
  fileName: string;
}

/**
 * Where the browser uploads the file: a form POST of `fields` with the file
 * last, as `file`, before it expires. Then `POST …/expense-files/{uploadId}/complete`.
 */
export class ExpenseFileUploadDto {
  uploadId: string;

  url: string;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'string' } })
  fields: Record<string, string>;

  maxBytes: number;

  expiresAt: Date;
}

/** A kept receipt or document, for the wedding's members. */
export class ExpenseFileDto {
  id: string;

  fileName: string;

  @ApiProperty({ enum: DOCUMENT_TYPES })
  contentType: DocumentType;

  bytes: number;

  /** Where members open it: `/api/v1/weddings/{weddingId}/expense-files/{id}`. */
  url: string;

  /** A photo the browser can show; everything else downloads. */
  viewable: boolean;

  createdAt: Date;
}
