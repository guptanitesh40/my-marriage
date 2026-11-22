import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { CAPABILITY_SCOPES, type CapabilityScope } from '../schemas/upload-capability.schema.js';

/** A guest upload link, as the couple sees it. The URL is a bearer credential. */
export class UploadLinkDto {
  /** Link ID. */
  id: string;

  @ApiProperty({ enum: CAPABILITY_SCOPES })
  scope: CapabilityScope;

  /** The album of an album link. */
  albumId?: string;

  /** The page guests open; scan or share it. */
  url: string;

  createdAt: Date;
}

export class UploadLinksDto {
  /** The wedding's general link, where guests choose the album. */
  general?: UploadLinkDto;

  /** Each album's own link, for those that have one. */
  albums: UploadLinkDto[];
}

export class CreateUploadLinkDto {
  /** Revoke the current link and make a new one: the old link and QR code stop working. */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean({ message: 'Choose whether to replace the link.' })
  replace?: boolean;
}

export const PHOTO_INVITE_AUDIENCES = ['all', 'attending'] as const;
export type PhotoInviteAudience = (typeof PHOTO_INVITE_AUDIENCES)[number];

/** Emails the general upload link to guests. */
export class EmailUploadLinkDto {
  /** Every guest with an email address, or those attending at least one ceremony. */
  @ApiProperty({ enum: PHOTO_INVITE_AUDIENCES })
  @IsIn(PHOTO_INVITE_AUDIENCES, { message: 'Choose who to email.' })
  audience: PhotoInviteAudience;
}

export class EmailUploadLinkResultDto {
  /** Emails queued. */
  queued: number;
}

/** How many guests each choice would email. */
export class PhotoInviteAudienceDto {
  all: number;

  attending: number;
}

export class ExchangeUploadTokenDto {
  @ApiProperty({ minLength: 20, maxLength: 100 })
  @IsString()
  @MinLength(20)
  @MaxLength(100)
  token: string;
}
