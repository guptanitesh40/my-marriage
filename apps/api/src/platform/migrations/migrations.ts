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

const eventIndexes: Migration = {
  id: '0005-event-indexes',
  description: 'events indexes',
  up: async (db) => {
    const events = db.collection('events');
    // Schema document §4.07: reminders by start, and filters by state.
    await events.createIndex({ weddingId: 1, startAt: 1 });
    await events.createIndex({ weddingId: 1, state: 1 });
    // The organizer's list, in date order (decision 0010).
    await events.createIndex({ weddingId: 1, startDate: 1, startAt: 1, createdAt: 1 });
  },
};

const taskIndexes: Migration = {
  id: '0006-task-indexes',
  description: 'tasks indexes',
  up: async (db) => {
    const tasks = db.collection('tasks');
    // Schema document §4.09: My Tasks, by event, and by state, each by due time.
    await tasks.createIndex({ weddingId: 1, assigneeId: 1, state: 1, dueAt: 1 });
    await tasks.createIndex({ weddingId: 1, eventId: 1, dueAt: 1 });
    await tasks.createIndex({ weddingId: 1, state: 1, dueAt: 1 });
  },
};

const vendorIndexes: Migration = {
  id: '0007-vendor-indexes',
  description: 'vendors indexes',
  up: async (db) => {
    const vendors = db.collection('vendors');
    // Schema document §4.10: by name, by category, and by linked event.
    await vendors.createIndex({ weddingId: 1, name: 1 });
    await vendors.createIndex({ weddingId: 1, category: 1 });
    await vendors.createIndex({ weddingId: 1, eventIds: 1 });
  },
};

const expenseIndexes: Migration = {
  id: '0008-expense-indexes',
  description: 'expenses and expense_payments indexes',
  up: async (db) => {
    const expenses = db.collection('expenses');
    // Schema document §4.11: by event, by vendor, and by due day (decision 0014).
    await expenses.createIndex({ weddingId: 1, eventId: 1 });
    await expenses.createIndex({ weddingId: 1, vendorId: 1 });
    await expenses.createIndex({ weddingId: 1, dueDate: 1 });
    const entries = db.collection('expense_payments');
    // Schema document §4.12: an expense's history, and the wedding's by day.
    await entries.createIndex({ weddingId: 1, expenseId: 1, paidAt: 1 });
    await entries.createIndex({ weddingId: 1, paidAt: 1 });
    // An entry can be reversed once.
    await entries.createIndex(
      { reversalOfId: 1 },
      { unique: true, partialFilterExpression: { reversalOfId: { $exists: true } } },
    );
  },
};

const expenseEvents: Migration = {
  id: '0009-expense-events',
  description: 'expenses link to several events',
  up: async (db) => {
    const expenses = db.collection('expenses');
    // One expense can cover several ceremonies (decision 0014): eventId becomes eventIds.
    await expenses.updateMany({ eventId: { $exists: true } }, [
      { $set: { eventIds: ['$eventId'] } },
      { $unset: 'eventId' },
    ]);
    await expenses.updateMany({ eventIds: { $exists: false } }, { $set: { eventIds: [] } });
    await expenses.createIndex({ weddingId: 1, eventIds: 1 });
    const old = await expenses.indexExists('weddingId_1_eventId_1');
    if (old) await expenses.dropIndex('weddingId_1_eventId_1');
  },
};

const guestIndexes: Migration = {
  id: '0010-guest-indexes',
  description: 'guest_contacts, event_invitations, invitation_tokens and guest_sessions indexes',
  up: async (db) => {
    // Schema document §4.13 to §4.16 (decision 0015).
    const guests = db.collection('guest_contacts');
    await guests.createIndex({ weddingId: 1, name: 1 });
    await guests.createIndex({ weddingId: 1, emailNormalized: 1 });
    await guests.createIndex({ weddingId: 1, status: 1 });
    const invitations = db.collection('event_invitations');
    await invitations.createIndex({ weddingId: 1, guestId: 1, eventId: 1 }, { unique: true });
    await invitations.createIndex({ weddingId: 1, eventId: 1, isInvited: 1, 'rsvp.status': 1 });
    await invitations.createIndex({ weddingId: 1, guestId: 1 });
    const tokens = db.collection('invitation_tokens');
    await tokens.createIndex({ tokenHash: 1 }, { unique: true });
    await tokens.createIndex({ weddingId: 1, guestId: 1, status: 1 });
    const sessions = db.collection('guest_sessions');
    await sessions.createIndex({ sessionHash: 1 }, { unique: true });
    await sessions.createIndex({ tokenId: 1, expiresAt: 1 });
    await sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  },
};

const reminderIndexes: Migration = {
  id: '0011-reminder-indexes',
  description: 'guest_reminders and reminder_settings indexes',
  up: async (db) => {
    // Decision 0016.
    const reminders = db.collection('guest_reminders');
    await reminders.createIndex({ notificationId: 1 }, { unique: true });
    await reminders.createIndex(
      { scheduleKeys: 1 },
      { unique: true, partialFilterExpression: { scheduleKeys: { $exists: true } } },
    );
    await reminders.createIndex({ weddingId: 1, guestId: 1, createdAt: -1 });
    const settings = db.collection('reminder_settings');
    await settings.createIndex({ weddingId: 1 }, { unique: true });
    await settings.createIndex({ enabled: 1 });
  },
};

const websiteIndexes: Migration = {
  id: '0012-website-indexes',
  description: 'website_configs and wedding_slugs indexes; every wedding’s address recorded',
  up: async (db) => {
    // Schema document §4.17 and decision 0017.
    await db.collection('website_configs').createIndex({ weddingId: 1 }, { unique: true });
    const slugs = db.collection('wedding_slugs');
    await slugs.createIndex({ slug: 1 }, { unique: true });
    await slugs.createIndex({ weddingId: 1 });
    // Weddings created before addresses were recorded: their current one.
    const weddings = db
      .collection<{ slug: string }>('weddings')
      .find({}, { projection: { slug: 1 } });
    for await (const wedding of weddings) {
      await slugs.updateOne(
        { slug: wedding.slug },
        {
          $setOnInsert: {
            slug: wedding.slug,
            weddingId: wedding._id,
            current: true,
            createdAt: new Date(),
          },
        },
        { upsert: true },
      );
    }
  },
};

const fileAssetIndexes: Migration = {
  id: '0013-file-asset-indexes',
  description: 'file_assets indexes for uploaded website covers',
  up: async (db) => {
    // Schema document §4.22 and decision 0018.
    const assets = db.collection('file_assets');
    await assets.createIndex({ weddingId: 1, kind: 1, state: 1 });
    await assets.createIndex({ state: 1, createdAt: 1 });
  },
};

const albumIndexes: Migration = {
  id: '0014-album-indexes',
  description: 'albums indexes: one album per ceremony and one general album per wedding',
  up: async (db) => {
    // Schema document §4.18 and decision 0019.
    const albums = db.collection('albums');
    await albums.createIndex(
      { weddingId: 1, eventId: 1 },
      { unique: true, partialFilterExpression: { kind: 'event' } },
    );
    await albums.createIndex(
      { weddingId: 1, kind: 1 },
      { unique: true, partialFilterExpression: { kind: 'general' } },
    );
    await albums.createIndex({ weddingId: 1, kind: 1, sortOrder: 1 });
  },
};

const mediaIndexes: Migration = {
  id: '0015-media-indexes',
  description: 'upload_intents and photos indexes',
  up: async (db) => {
    // Schema document §4.20–4.21 and decision 0019. No TTL on either.
    const intents = db.collection('upload_intents');
    await intents.createIndex({ weddingId: 1, state: 1, expiresAt: 1 });
    await intents.createIndex({ state: 1, expiresAt: 1 });
    const photos = db.collection('photos');
    await photos.createIndex({ weddingId: 1, albumId: 1, moderation: 1, createdAt: -1 });
    await photos.createIndex({ weddingId: 1, moderation: 1, createdAt: -1 });
  },
};

const uploadLinkIndexes: Migration = {
  id: '0016-upload-link-indexes',
  description: 'upload_capabilities and upload_link_emails indexes',
  up: async (db) => {
    // Schema document §4.19 and decision 0019.
    const links = db.collection('upload_capabilities');
    await links.createIndex({ tokenHash: 1 }, { unique: true });
    await links.createIndex({ weddingId: 1, albumId: 1, status: 1 });
    await links.createIndex({ weddingId: 1, scope: 1, status: 1 });
    const emails = db.collection('upload_link_emails');
    await emails.createIndex({ notificationId: 1 }, { unique: true });
    await emails.createIndex({ weddingId: 1, createdAt: -1 });
  },
};

const mediaExportIndexes: Migration = {
  id: '0017-media-export-indexes',
  description: 'media_exports indexes',
  up: async (db) => {
    // Schema document §4.23 and decision 0019.
    const exports = db.collection('media_exports');
    await exports.createIndex({ weddingId: 1, createdAt: -1 });
    await exports.createIndex({ state: 1, expiresAt: 1 });
  },
};

const teamChanges: Migration = {
  id: '0018-team-and-audit',
  description: 'audit_events indexes; drop the one-active-owned-wedding index',
  up: async (db) => {
    // Schema document §4.27; no TTL: audit history is kept.
    const audit = db.collection('audit_events');
    await audit.createIndex({ weddingId: 1, occurredAt: -1 });
    await audit.createIndex({ actorUserId: 1, occurredAt: -1 });

    // An account may now own several active weddings (decision 0020).
    const memberships = db.collection('wedding_memberships');
    const indexes = await memberships.indexes();
    if (indexes.some((index) => index.name === 'uniq_active_owned_wedding_per_user')) {
      await memberships.dropIndex('uniq_active_owned_wedding_per_user');
    }
  },
};

const deletionJobIndexes: Migration = {
  id: '0019-deletion-jobs',
  description: 'deletion_jobs indexes: one waiting deletion request per wedding',
  up: async (db) => {
    // Schema document §4.29; decision 0021.
    const jobs = db.collection('deletion_jobs');
    await jobs.createIndex({ weddingId: 1, createdAt: 1 });
    await jobs.createIndex({ state: 1, requestedAt: 1 });
    await jobs.createIndex(
      { weddingId: 1 },
      { unique: true, partialFilterExpression: { state: 'requested' } },
    );
  },
};

/** Every migration, oldest first. Append here as each collection is introduced. */
export const MIGRATIONS: readonly Migration[] = [
  identityIndexes,
  messagingIndexes,
  weddingIndexes,
  inviteIndexes,
  eventIndexes,
  taskIndexes,
  vendorIndexes,
  expenseIndexes,
  expenseEvents,
  guestIndexes,
  reminderIndexes,
  websiteIndexes,
  fileAssetIndexes,
  albumIndexes,
  mediaIndexes,
  uploadLinkIndexes,
  mediaExportIndexes,
  teamChanges,
  deletionJobIndexes,
];
