import type { INestApplicationContext, ModuleMetadata } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import type { Connection } from 'mongoose';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/configure-app.js';
import { MigrationRunner } from '../../src/platform/migrations/migration-runner.js';

/**
 * The application exactly as `main.ts` builds it, against the test database,
 * with migrations applied first — so every unique index a test relies on
 * exists before the first request. Pass extra controllers or imports to probe
 * behaviour that no real endpoint exercises yet.
 */
export async function createTestApp(extra: ModuleMetadata = {}): Promise<NestExpressApplication> {
  const moduleRef = await Test.createTestingModule({
    ...extra,
    imports: [AppModule, ...(extra.imports ?? [])],
  }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.get(MigrationRunner).run();
  await app.init();
  return app;
}

/** Wipes the database, indexes and migration history included. Refuses anything but a test database. */
export async function dropTestDatabase(app: INestApplicationContext): Promise<void> {
  const connection = app.get<Connection>(getConnectionToken());
  if (!connection.name.endsWith('_test')) {
    throw new Error(`Refusing to drop "${connection.name}": not a test database`);
  }
  await connection.dropDatabase();
}
