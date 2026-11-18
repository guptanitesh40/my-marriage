import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppLogger } from './platform/logger.js';
import { MigrationRunner } from './platform/migrations/migration-runner.js';
import { PlatformModule } from './platform/platform.module.js';

// Third entry point of the same build: applies pending database migrations and
// exits. A deployment runs it to completion before starting the new API and
// worker, which refuse to boot if a declared index is missing. A failure
// rejects here and ends the process with a non-zero exit code.
const app = await NestFactory.createApplicationContext(PlatformModule, {
  logger: new AppLogger(),
});
try {
  const applied = await app.get(MigrationRunner).run();
  new Logger('Migrate').log(
    applied.length > 0 ? `Applied ${applied.join(', ')}` : 'Database is up to date',
  );
} finally {
  await app.close();
}
