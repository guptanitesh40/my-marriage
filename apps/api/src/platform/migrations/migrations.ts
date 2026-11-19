import type { mongo } from 'mongoose';

/**
 * One versioned, source-controlled change to the database: indexes,
 * collection validators or a backfill.
 *
 * - `up` must be safe to run twice. A run that crashes after `up` finishes but
 *   before it is recorded will run it again.
 * - Never edit a migration that has been deployed; add a new one.
 * - Declare each index on the Mongoose schema as well. The startup index check
 *   compares the two and refuses to boot if the database is missing one.
 */
export interface Migration {
  /** Sorts in the order to apply, e.g. `0001-users-indexes`. Never reused. */
  id: string;
  description: string;
  up(db: mongo.Db): Promise<void>;
}

// createIndex is a no-op when the same index already exists, which makes
// each of these safe to run twice.

const identityIndexes: Migration = {
  id: '0001-identity-indexes',
  description: 'users, auth_sessions and auth_action_tokens indexes',
  up: async (db) => {
    const users = db.collection('users');
    // One account per email address (schema document §5, P0).
    await users.createIndex({ emailNormalized: 1 }, { unique: true });
    await users.createIndex({ status: 1, createdAt: 1 });

    const sessions = db.collection('auth_sessions');
    await sessions.createIndex({ sessionHash: 1 }, { unique: true });
    await sessions.createIndex({ userId: 1, expiresAt: 1 });
    await sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    const tokens = db.collection('auth_action_tokens');
    await tokens.createIndex({ tokenHash: 1 }, { unique: true });
    await tokens.createIndex({ userId: 1, purpose: 1 });
    await tokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  },
};

const messagingIndexes: Migration = {
  id: '0002-messaging-indexes',
  description: 'notifications and outbox_events indexes',
  up: async (db) => {
    const notifications = db.collection('notifications');
    // One key per email, sent to the provider so a retried send cannot
    // deliver a second copy; unique so two emails never share one.
    await notifications.createIndex({ idempotencyKey: 1 }, { unique: true });
    await notifications.createIndex(
      { providerMessageId: 1 },
      { unique: true, partialFilterExpression: { providerMessageId: { $type: 'string' } } },
    );

    // The relay's "what is due" query.
    await db.collection('outbox_events').createIndex({ state: 1, nextAttemptAt: 1 });
  },
};

const weddingIndexes: Migration = {
  id: '0003-wedding-indexes',
  description: 'weddings and wedding_memberships indexes',
  up: async (db) => {
    const weddings = db.collection('weddings');
    // One wedding per public address (schema document §5, P0).
    await weddings.createIndex({ slug: 1 }, { unique: true });
    await weddings.createIndex({ status: 1, createdAt: 1 });

    const memberships = db.collection('wedding_memberships');
    // One membership per user per wedding (P0).
    await memberships.createIndex({ weddingId: 1, userId: 1 }, { unique: true });
    // One active owned wedding per user (P0, §5.1): the final gate for wedding
    // creation and co-owner acceptance, whatever the application checked first.
    await memberships.createIndex(
      { userId: 1 },
      {
        name: 'uniq_active_owned_wedding_per_user',
        unique: true,
        partialFilterExpression: { role: 'owner', status: 'active', activeOwned: true },
      },
    );
    await memberships.createIndex({ weddingId: 1, status: 1, role: 1 });
    await memberships.createIndex({ userId: 1, status: 1 });
  },
};

const inviteIndexes: Migration = {
  id: '0004-membership-invite-indexes',
  description: 'membership_invites indexes',
  up: async (db) => {
    const invites = db.collection('membership_invites');
    // Each link secret finds one invitation (schema document §4.06). Partial:
    // an invitation whose email has not been sent yet has no secret.
    await invites.createIndex(
      { tokenHashes: 1 },
      { unique: true, partialFilterExpression: { tokenHashes: { $type: 'string' } } },
    );
    await invites.createIndex({ weddingId: 1, status: 1 });
    await invites.createIndex({ emailNormalized: 1, status: 1 });
    // The worker finds the invitation an email is for.
    await invites.createIndex({ notificationId: 1 });
  },
};

/** Every migration, oldest first. Append here as each collection is introduced. */
export const MIGRATIONS: readonly Migration[] = [
  identityIndexes,
  messagingIndexes,
  weddingIndexes,
  inviteIndexes,
];
