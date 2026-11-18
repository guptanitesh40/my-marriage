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

/** Every migration, oldest first. Append here as each collection is introduced. */
export const MIGRATIONS: readonly Migration[] = [];
