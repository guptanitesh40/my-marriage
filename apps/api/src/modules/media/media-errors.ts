import {
  ConflictException,
  GoneException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { fieldError } from '../weddings/wedding-errors.js';
import { ALBUM_LIMITS, PHOTO_MAX_BYTES } from './media-policy.js';

/** Also for an album of another wedding: isolation never says which. */
export function albumNotFound(): NotFoundException {
  return new NotFoundException({ code: 'ALBUM_NOT_FOUND', message: 'Album not found.' });
}

/** An event album is named after its ceremony, so it follows a rename of the ceremony. */
export function eventAlbumTitle() {
  return fieldError(
    'title',
    'This album takes its ceremony’s name. Rename the ceremony on the Events page.',
  );
}

export function albumLimit(): ConflictException {
  return new ConflictException({
    code: 'ALBUM_LIMIT',
    message: `A wedding can have up to ${ALBUM_LIMITS.customAlbums} albums of its own.`,
  });
}

export function photoNotFound(): NotFoundException {
  return new NotFoundException({ code: 'PHOTO_NOT_FOUND', message: 'Photo not found.' });
}

/** PRD PHOTO-05: refused gracefully, before anything is uploaded. */
export function storageFull(): ConflictException {
  return new ConflictException({
    code: 'STORAGE_FULL',
    message: 'This wedding’s 5 GB of photo storage is full, so no more photos can be added.',
  });
}

export function uploadNotFound(): NotFoundException {
  return new NotFoundException({ code: 'UPLOAD_NOT_FOUND', message: 'Upload not found.' });
}

/** The form expired, or the upload already failed: start again with a new one. */
export function uploadExpired(): GoneException {
  return new GoneException({
    code: 'UPLOAD_EXPIRED',
    message: 'This upload has expired. Please add the photo again.',
  });
}

/** Complete was called before the file arrived: it can be retried. */
export function uploadNotReceived(): ConflictException {
  return new ConflictException({
    code: 'UPLOAD_NOT_RECEIVED',
    message: 'The photo has not arrived yet. Please try again.',
  });
}

export function uploadNotImage(): HttpException {
  return new HttpException(
    {
      code: 'UPLOAD_NOT_IMAGE',
      message: 'This file isn’t a JPG, PNG or WebP photo.',
    },
    HttpStatus.UNPROCESSABLE_ENTITY,
  );
}

export function uploadTooLarge(): HttpException {
  return new HttpException(
    {
      code: 'UPLOAD_TOO_LARGE',
      message: `Photos can be up to ${PHOTO_MAX_BYTES / 1_000_000} MB.`,
    },
    HttpStatus.PAYLOAD_TOO_LARGE,
  );
}

/** Unknown, revoked or expired: which one is never said. */
export function uploadLinkUnavailable(): GoneException {
  return new GoneException({
    code: 'UPLOAD_LINK_UNAVAILABLE',
    message: 'This upload link no longer works. Ask the couple for a new one.',
  });
}

export function uploadLinkNotFound(): NotFoundException {
  return new NotFoundException({
    code: 'UPLOAD_LINK_NOT_FOUND',
    message: 'Upload link not found.',
  });
}

/** No upload session, or it ended: the guest opens the link again. */
export function uploadSessionMissing(): HttpException {
  return new HttpException(
    {
      code: 'UPLOAD_SESSION_REQUIRED',
      message: 'Please open the upload link again.',
    },
    HttpStatus.UNAUTHORIZED,
  );
}

/** The album is paused or no longer open to guests. */
export function albumClosed(): ConflictException {
  return new ConflictException({
    code: 'ALBUM_CLOSED',
    message: 'The couple has closed uploads to this album for now.',
  });
}

export function exportNotFound(): NotFoundException {
  return new NotFoundException({ code: 'EXPORT_NOT_FOUND', message: 'Download not found.' });
}
