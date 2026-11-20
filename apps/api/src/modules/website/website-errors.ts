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
