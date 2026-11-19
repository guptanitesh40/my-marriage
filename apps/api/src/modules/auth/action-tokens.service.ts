import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { ClientSession, Model, Types } from 'mongoose';
import { randomToken, sha256 } from '../../platform/crypto.js';
import {
  AuthActionToken,
  type AuthActionTokenDocument,
  type AuthTokenPurpose,
} from './schemas/auth-action-token.schema.js';
import { Traced } from '../../platform/tracing.js';

/**
 * Single-use secrets for email links. The worker issues one while writing the
 * email, so the link exists only in the email itself: MongoDB holds its
 * SHA-256, and the outbox and notification hold no trace of it.
 */
@Traced()
@Injectable()
export class ActionTokensService {
  constructor(@InjectModel(AuthActionToken.name) private readonly tokens: Model<AuthActionToken>) {}

  /**
   * A new link secret for the email `notificationId`, returned once to be
   * put in that email — or null when a later request for the same kind of
   * link already has one, so this email should not be sent.
   *
   * The new link replaces those of every other email of this kind for the
   * user, so of several emails, only the latest request's link works,
   * whatever order the worker sends them in. Earlier links of the same
   * email stay usable: they come from attempts that may have been delivered.
   */
  async issue(link: {
    userId: Types.ObjectId;
    purpose: AuthTokenPurpose;
    ttlMs: number;
    notificationId: Types.ObjectId;
    requestedAt: Date;
  }): Promise<string | null> {
    const { userId, purpose, notificationId, requestedAt } = link;
    // Requests are ordered by requestedAt, then notificationId to break a
    // tie. Every step below only ever acts against an older request, never
    // a newer one, so jobs for several emails can run at the same time, in
    // any interleaving: the newest request's link is the one left working.
    const older = {
      $or: [
        { requestedAt: { $lt: requestedAt } },
        { requestedAt, notificationId: { $lt: notificationId } },
      ],
    };
    const newer = {
      $or: [
        { requestedAt: { $gt: requestedAt } },
        { requestedAt, notificationId: { $gt: notificationId } },
      ],
    };
    const usable = { consumedAt: { $exists: false }, revokedAt: { $exists: false } };

    const token = randomToken();
    const tokenHash = sha256(token);
    await this.tokens.create({
      userId,
      purpose,
      notificationId,
      requestedAt,
      tokenHash,
      expiresAt: new Date(Date.now() + link.ttlMs),
    });
    await this.tokens.updateMany(
      { userId, purpose, ...usable, ...older },
      { $set: { revokedAt: new Date() } },
    );
    // Checked after our link exists: a newer job that has not created its
    // link yet will revoke ours when it does (the step above, in its run).
    if (await this.tokens.exists({ userId, purpose, ...newer })) {
      await this.tokens.updateOne({ tokenHash, ...usable }, { $set: { revokedAt: new Date() } });
      return null;
    }
    return token;
  }

  /** The record for a link secret, whatever its state, or null. */
  find(token: string, purpose: AuthTokenPurpose): Promise<AuthActionTokenDocument | null> {
    return this.tokens.findOne({ tokenHash: sha256(token), purpose });
  }

  /**
   * Marks the link used, if it is still usable: not used, not replaced, not
   * expired (checked here, not left to the TTL index). Atomic, so of two
   * simultaneous uses exactly one succeeds. Returns the token, or null.
   */
  consume(
    token: string,
    purpose: AuthTokenPurpose,
    session: ClientSession,
  ): Promise<AuthActionTokenDocument | null> {
    const now = new Date();
    return this.tokens.findOneAndUpdate(
      {
        tokenHash: sha256(token),
        purpose,
        consumedAt: { $exists: false },
        revokedAt: { $exists: false },
        expiresAt: { $gt: now },
      },
      { $set: { consumedAt: now } },
      { session, returnDocument: 'after' },
    );
  }

  /** Stops every unused link of this kind from working, e.g. when a new one is requested. */
  async revokeOutstanding(
    userId: Types.ObjectId,
    purpose: AuthTokenPurpose,
    session?: ClientSession,
  ): Promise<void> {
    await this.tokens.updateMany(
      { userId, purpose, consumedAt: { $exists: false }, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } },
      { session },
    );
  }
}
