import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';

/**
 * One answer for a missing, unpublished or unpublished-again site, so the
 * public route never says whether a wedding or a draft exists (PRD SITE-04).
 */
export function websiteNotFound(): NotFoundException {
  return new NotFoundException({
    code: 'WEBSITE_NOT_FOUND',
    message: 'This wedding website isn’t available.',
  });
}

export function websiteChanged(): ConflictException {
  return new ConflictException({
    code: 'WEBSITE_VERSION_CONFLICT',
    message: 'The website was changed elsewhere since you opened it. Reload to see the latest.',
  });
}

/** Publishing needs couple names, an address and a usable ceremony (PRD SITE-04). */
export function websiteNotReady(problems: string[]): UnprocessableEntityException {
  return new UnprocessableEntityException({
    code: 'WEBSITE_NOT_READY',
    message: problems.join(' '),
  });
}

export function imageNotFound(): NotFoundException {
  return new NotFoundException({ code: 'IMAGE_NOT_FOUND', message: 'That image isn’t available.' });
}

/** The upload never arrived, was too large, or isn’t a JPEG, PNG or WebP photo. */
export function uploadRejected(
  code: 'UPLOAD_NOT_FOUND' | 'UPLOAD_TOO_LARGE' | 'UPLOAD_NOT_IMAGE',
): UnprocessableEntityException {
  const messages = {
    UPLOAD_NOT_FOUND: 'The photo didn’t finish uploading. Please try again.',
    UPLOAD_TOO_LARGE: 'That photo is too large. Choose one under 10 MB.',
    UPLOAD_NOT_IMAGE: 'That file isn’t a photo. Choose a JPEG, PNG or WebP image.',
  };
  return new UnprocessableEntityException({ code, message: messages[code] });
}
