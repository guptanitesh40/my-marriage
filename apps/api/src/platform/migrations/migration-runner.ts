import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection, mongo } from 'mongoose';
import { MIGRATIONS, type Migration } from './migrations.js';

export const MIGRATIONS_COLLECTION = 'schema_migrations';

const LOCK_ID = '_lock';
// Long enough for an index build; short enough that a crashed run does not
// block deployments for long.
const LOCK_TTL_MS = 10 * 60 * 1000;

interface MigrationRecord {
  _id: string;
  appliedAt?: Date;
  expiresAt?: Date;
}

/**
 * Applies pending migrations in order and records each one. Run it as a
 * deployment step (`pnpm db:migrate`, or `node dist/migrate.js` in a
 * container) before the new API and worker start — never implicitly on boot.
 */
@Injectable()
export class MigrationRunner {
  private readonly logger = new Logger(MigrationRunner.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  /** Returns the IDs applied by this run; empty when the database is up to date. */
  async run(migrations: readonly Migration[] = MIGRATIONS): Promise<string[]> {
    assertOrdered(migrations);
    const db = this.connection.db;
    if (!db) throw new Error('MongoDB is not connected');
    const records = db.collection<MigrationRecord>(MIGRATIONS_COLLECTION);

    await this.acquireLock(records);
    try {
      const done = await records.find({ _id: { $ne: LOCK_ID } }).toArray();
      const applied = new Set(done.map((record) => record._id));
      const appliedNow: string[] = [];
      for (const migration of migrations) {
        if (applied.has(migration.id)) continue;
        this.logger.log(`Applying ${migration.id}: ${migration.description}`);
        await migration.up(db);
        await records.insertOne({ _id: migration.id, appliedAt: new Date() });
        appliedNow.push(migration.id);
      }
      return appliedNow;
    } finally {
      await records.deleteOne({ _id: LOCK_ID });
    }
  }

  /** Two deployments must not migrate at once; a backfill may not tolerate it. */
  private async acquireLock(records: mongo.Collection<MigrationRecord>): Promise<void> {
    const now = new Date();
    try {
      // Matches only an expired lock. A live lock matches nothing, so the
      // upsert tries to insert a second `_lock` and fails on the _id index.
      await records.updateOne(
        { _id: LOCK_ID, expiresAt: { $lt: now } },
        { $set: { expiresAt: new Date(now.getTime() + LOCK_TTL_MS) } },
        { upsert: true },
      );
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new Error('Another migration run is in progress; try again when it has finished', {
          cause: error,
        });
      }
      throw error;
    }
  }
}

function assertOrdered(migrations: readonly Migration[]): void {
  for (const [index, migration] of migrations.entries()) {
    const previous = migrations[index - 1];
    if (previous && previous.id >= migration.id) {
      throw new Error(
        `Migrations must have unique IDs in ascending order: "${migration.id}" follows "${previous.id}"`,
      );
    }
  }
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}
