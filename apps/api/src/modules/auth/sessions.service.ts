import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { ClientSession, Model, Types } from 'mongoose';
import { randomToken, sha256 } from '../../platform/crypto.js';
import { SESSION_ABSOLUTE_MS, SESSION_IDLE_MS, SESSION_TOUCH_MS } from './auth-policy.js';
import { AuthSession } from './schemas/auth-session.schema.js';
import { User } from './schemas/user.schema.js';
import { Traced } from '../../platform/tracing.js';

/** The signed-in user, as guards and handlers see them. Never includes the password hash. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
}

export interface Authentication {
  user: AuthenticatedUser;
  sessionId: Types.ObjectId;
}

export interface NewSession {
  /** The cookie value. Shown to the browser once; only its hash is stored. */
  token: string;
  expiresAt: Date;
}

export function toAuthenticatedUser(user: {
  _id: Types.ObjectId;
  emailNormalized: string;
  displayName: string;
  verifiedAt?: Date;
}): AuthenticatedUser {
  return {
    id: user._id.toHexString(),
    email: user.emailNormalized,
    displayName: user.displayName,
    emailVerified: user.verifiedAt !== undefined,
  };
}

/** Opaque server-side sessions (schema document §4.02). */
@Traced()
@Injectable()
export class SessionsService {
  constructor(
    @InjectModel(AuthSession.name) private readonly sessions: Model<AuthSession>,
    @InjectModel(User.name) private readonly users: Model<User>,
  ) {}

  /**
   * A brand-new session, never one the browser proposed — so session
   * fixation is impossible. Pass the user exactly as read when their
   * password was checked: the session is tied to that password.
   */
  async create(
    user: { _id: Types.ObjectId; passwordChangedAt?: Date },
    session?: ClientSession,
  ): Promise<NewSession> {
    const token = randomToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_ABSOLUTE_MS);
    await this.sessions.create(
      [
        {
          userId: user._id,
          sessionHash: sha256(token),
          expiresAt,
          lastSeenAt: now,
          ...(user.passwordChangedAt ? { passwordChangedAt: user.passwordChangedAt } : {}),
        },
      ],
      { session },
    );
    return { token, expiresAt };
  }

  /**
   * The user signed in with this cookie, or null. Every condition is checked
   * on every request rather than trusting MongoDB's TTL cleanup, which runs
   * late: revoked, past its absolute end, idle too long, user no longer
   * active, or password changed since sign-in.
   */
  async authenticate(token: string): Promise<Authentication | null> {
    const now = Date.now();
    const session = await this.sessions.findOne({ sessionHash: sha256(token) }).lean();
    if (!session || session.revokedAt || session.expiresAt.getTime() <= now) return null;
    const lastSeen = (session.lastSeenAt ?? session.createdAt).getTime();
    if (now - lastSeen > SESSION_IDLE_MS) return null;

    const user = await this.users.findById(session.userId).lean();
    if (!user || user.status !== 'active') return null;
    if (user.passwordChangedAt?.getTime() !== session.passwordChangedAt?.getTime()) return null;

    if (now - lastSeen > SESSION_TOUCH_MS) {
      await this.sessions.updateOne({ _id: session._id }, { $set: { lastSeenAt: new Date(now) } });
    }
    return { user: toAuthenticatedUser(user), sessionId: session._id };
  }

  /** Ends the session for this cookie, if it is one of ours. */
  async revokeToken(token: string, session?: ClientSession): Promise<void> {
    await this.sessions.updateOne(
      { sessionHash: sha256(token), revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } },
      { session },
    );
  }

  /** Ends every session of a user, e.g. after a password reset. */
  async revokeAllForUser(userId: Types.ObjectId, session?: ClientSession): Promise<void> {
    await this.sessions.updateMany(
      { userId, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } },
      { session },
    );
  }
}
