import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import type { Types } from 'mongoose';
import type { Env } from '../../config/env.js';
import { derivedToken, sha256 } from '../../platform/crypto.js';
import { Traced } from '../../platform/tracing.js';
import { DEVELOPMENT_LINK_SECRET } from './guest-policy.js';

/**
 * Guests' private invitation links (decision 0015). The secret in a link is
 * derived from its record's ID with GUEST_LINK_SECRET, so it is never stored:
 * the database holds only its hash, and organizers or the email worker can
 * rebuild the link. It sits after `#`, so browsers never send it to a server
 * or in a Referer header.
 */
@Traced()
@Injectable()
export class GuestLinks {
  private readonly key: string;
  private readonly webOrigin: string;

  constructor(config: ConfigService<Env, true>) {
    this.key = config.get('GUEST_LINK_SECRET', { infer: true }) ?? DEVELOPMENT_LINK_SECRET;
    this.webOrigin = config.get('WEB_ORIGIN', { infer: true });
  }

  token(tokenId: Types.ObjectId): string {
    return derivedToken(this.key, `guest-link:${tokenId.toHexString()}`);
  }

  hash(token: string): string {
    return sha256(token);
  }

  url(tokenId: Types.ObjectId): string {
    return `${this.webOrigin}/invitation#t=${this.token(tokenId)}`;
  }
}
