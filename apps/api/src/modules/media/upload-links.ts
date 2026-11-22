import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { Types } from 'mongoose';
import type { Env } from '../../config/env.js';
import { derivedToken, sha256 } from '../../platform/crypto.js';
import { Traced } from '../../platform/tracing.js';
import { DEVELOPMENT_LINK_SECRET } from '../guests/guest-policy.js';
import { UPLOAD_SESSION_HOURS } from './media-policy.js';

/** What an upload session cookie carries: the link, and when it stops working. */
export interface UploadSession {
  capabilityId: Types.ObjectId;
  /** Random, per opening: what the per-session upload limit counts. */
  nonce: string;
  expiresAt: Date;
}

const SESSION_PATTERN = /^([0-9a-f]{24})\.([A-Za-z0-9_-]{16})\.(\d{13})\.([A-Za-z0-9_-]{43})$/;

/**
 * Guest upload links and their sessions (decision 0019). A link's secret
 * is derived from its record's ID with GUEST_LINK_SECRET, as guests'
 * invitation links are (decision 0015): only its hash is stored, yet the
 * couple can see the same link and QR code again and an email can carry
 * it. It sits after `#`, so browsers never send it to a server or in a
 * Referer header.
 *
 * Opening a link gives a signed cookie naming only the link; it is checked
 * again on every request, so revoking a link ends its sessions at once.
 */
@Traced()
@Injectable()
export class UploadLinks {
  private readonly key: string;
  private readonly webOrigin: string;

  constructor(config: ConfigService<Env, true>) {
    this.key = config.get('GUEST_LINK_SECRET', { infer: true }) ?? DEVELOPMENT_LINK_SECRET;
    this.webOrigin = config.get('WEB_ORIGIN', { infer: true });
  }

  token(capabilityId: Types.ObjectId): string {
    return derivedToken(this.key, `upload-link:${capabilityId.toHexString()}`);
  }

  hash(token: string): string {
    return sha256(token);
  }

  /** The page a guest opens to upload. */
  url(capabilityId: Types.ObjectId): string {
    return `${this.webOrigin}/u#t=${this.token(capabilityId)}`;
  }

  /** A new session for a link, as its cookie value. */
  newSession(capabilityId: Types.ObjectId): { value: string; expiresAt: Date } {
    const nonce = randomBytes(12).toString('base64url');
    const expiresAt = new Date(Date.now() + UPLOAD_SESSION_HOURS * 3600_000);
    const body = `${capabilityId.toHexString()}.${nonce}.${expiresAt.getTime()}`;
    return { value: `${body}.${this.sign(body)}`, expiresAt };
  }

  /** The session a cookie value carries, if it is ours, unaltered and not expired. */
  readSession(value: string | undefined): UploadSession | null {
    const match = value ? SESSION_PATTERN.exec(value) : null;
    if (!match) return null;
    const [, id, nonce, expires, signature] = match;
    if (!id || !nonce || !expires || !signature) return null;
    const expected = Buffer.from(this.sign(`${id}.${nonce}.${expires}`));
    const given = Buffer.from(signature);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
    const expiresAt = new Date(Number(expires));
    if (expiresAt.getTime() <= Date.now()) return null;
    return { capabilityId: new Types.ObjectId(id), nonce, expiresAt };
  }

  private sign(body: string): string {
    return derivedToken(this.key, `upload-session:${body}`);
  }
}
