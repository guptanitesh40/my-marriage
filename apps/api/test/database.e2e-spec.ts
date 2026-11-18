import { getConnectionToken, MongooseModule } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import { Schema, type Connection, type Model } from 'mongoose';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { IndexCheckModule } from '../src/platform/index-check.js';
import {
  MigrationRunner,
  MIGRATIONS_COLLECTION,
} from '../src/platform/migrations/migration-runner.js';
import type { Migration } from '../src/platform/migrations/migrations.js';
import { PlatformModule } from '../src/platform/platform.module.js';
import { dropTestDatabase } from './support/app.js';

// A stand-in for a real collection whose unique index carries a business rule.
const probeSchema = new Schema({ weddingId: String, email: String });
probeSchema.index({ email: 1 }, { unique: true });
const probeModel = MongooseModule.forFeature([
  { name: 'IndexProbe', schema: probeSchema, collection: 'index_probes' },
]);

const createProbeIndex: Migration = {
  id: '0001-probe-email-index',
  description: 'unique email on index_probes',
  up: async (db) => {
    await db.collection('index_probes').createIndex({ email: 1 }, { unique: true });
  },
};

describe('Database foundation (integration)', () => {
  let moduleRef: TestingModule;
  let runner: MigrationRunner;
  let connection: Connection;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({ imports: [PlatformModule, probeModel] }).compile();
    runner = moduleRef.get(MigrationRunner);
    connection = moduleRef.get<Connection>(getConnectionToken());
    await dropTestDatabase(moduleRef);
  });

  afterEach(async () => {
    await dropTestDatabase(moduleRef);
    await moduleRef.close();
  });

  describe('migrations', () => {
    it('applies pending migrations in order, once', async () => {
      const calls: string[] = [];
      const migrations: Migration[] = ['0001-a', '0002-b'].map((id) => ({
        id,
        description: id,
        up: () => Promise.resolve(void calls.push(id)),
      }));

      expect(await runner.run(migrations)).toEqual(['0001-a', '0002-b']);
      expect(await runner.run(migrations)).toEqual([]);
      expect(calls).toEqual(['0001-a', '0002-b']);
    });

    it('does not record a migration that failed, and releases the lock', async () => {
      const failing: Migration = {
        id: '0001-fails',
        description: 'fails',
        up: () => Promise.reject(new Error('index build failed')),
      };
      await expect(runner.run([failing])).rejects.toThrow('index build failed');

      const records = connection.collection(MIGRATIONS_COLLECTION);
      expect(await records.countDocuments()).toBe(0);
    });

    it('refuses to run while another run holds the lock, until that lock expires', async () => {
      const records = connection.collection<{ _id: string; expiresAt: Date }>(
        MIGRATIONS_COLLECTION,
      );
      await records.insertOne({ _id: '_lock', expiresAt: new Date(Date.now() + 60_000) });
      await expect(runner.run([createProbeIndex])).rejects.toThrow(/in progress/);

      await records.updateOne({ _id: '_lock' }, { $set: { expiresAt: new Date(Date.now() - 1) } });
      expect(await runner.run([createProbeIndex])).toEqual([createProbeIndex.id]);
    });

    it('rejects migrations that are out of order or share an ID', async () => {
      const noop = () => Promise.resolve();
      const a = { id: '0001-a', description: 'a', up: noop };
      const b = { id: '0002-b', description: 'b', up: noop };
      await expect(runner.run([b, a])).rejects.toThrow(/ascending order/);
      await expect(runner.run([a, a])).rejects.toThrow(/ascending order/);
    });
  });

  describe('startup index check', () => {
    async function boot(): Promise<void> {
      const app = await Test.createTestingModule({
        imports: [PlatformModule, IndexCheckModule, probeModel],
      }).compile();
      try {
        await app.init();
      } finally {
        await app.close();
      }
    }

    it('refuses to start while a declared index is missing, and starts once it is migrated', async () => {
      await expect(boot()).rejects.toThrow(/missing indexes.*index_probes.*db:migrate/);
      await runner.run([createProbeIndex]);
      await expect(boot()).resolves.toBeUndefined();
    });
  });

  describe('schema strictness', () => {
    it('throws on a misspelt field instead of dropping it or widening a filter', async () => {
      const probes = moduleRef.get<Model<unknown>>('IndexProbeModel');
      await expect(probes.create({ weddingId: 'w1', emial: 'a@example.com' })).rejects.toThrow(
        /not in schema/,
      );
      await expect(probes.find({ weddingid: 'w1' })).rejects.toThrow(/not in schema/);
    });
  });
});
