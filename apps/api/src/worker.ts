import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { Env } from './config/env.js';
import { AppLogger } from './platform/logger.js';
import { configureTracing } from './platform/tracing.js';
import { WorkerModule } from './worker.module.js';

// A standalone application context: full dependency injection, config and
// database access, but no HTTP listener. Deployed as its own process from the
// same build as the API.
const app = await NestFactory.createApplicationContext(WorkerModule, {
  logger: new AppLogger(),
});
app.enableShutdownHooks();
configureTracing(
  app.get<ConfigService<Env, true>>(ConfigService).get('LOG_TRACE', { infer: true }),
);

new Logger('Worker').log('Worker started: relaying the outbox and running its jobs');
