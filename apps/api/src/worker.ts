import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppLogger } from './platform/logger.js';
import { WorkerModule } from './worker.module.js';

// A standalone application context: full dependency injection, config and
// database access, but no HTTP listener. Deployed as its own process from the
// same build as the API.
const app = await NestFactory.createApplicationContext(WorkerModule, {
  logger: new AppLogger(),
});
app.enableShutdownHooks();

new Logger('Worker').log('Worker started; no queue processors are registered yet');
