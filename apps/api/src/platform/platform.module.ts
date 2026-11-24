import { Global, Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import mongoose, { type Connection } from 'mongoose';
import { validateEnv, type Env } from '../config/env.js';
import { BackgroundTasks } from './background-tasks.js';
import { MigrationRunner } from './migrations/migration-runner.js';
import { RateLimiter } from './rate-limit.js';
import { REDIS, redisProviders } from './redis.js';
import { ObjectStorage, objectStorageProvider } from './storage/object-storage.js';

// Defaults for every schema. A misspelt field must fail loudly: with the
// Mongoose defaults a typo in a write is silently dropped, and a typo in a
// filter such as `weddingId` would silently change which documents match.
mongoose.set('strict', 'throw');
mongoose.set('strictQuery', 'throw');

/**
 * Cross-cutting infrastructure shared by the HTTP API, the worker and the
 * migration runner: validated config, the MongoDB connection, the Redis
 * connection, the rate limiter built on it, background tasks and file
 * storage (S3, or a local folder in development). Domain
 * modules must not open their own connections.
 */
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        uri: config.get('MONGODB_URI', { infer: true }),
        serverSelectionTimeoutMS: 5000,
        // One attempt, then fail with the driver's reason in the log. The
        // module's default (10 attempts, 3 s apart) outlasts a serverless
        // function's start-up limit, which kills the process before any of
        // it is logged; a restarting host (or `pnpm dev`) retries anyway.
        retryAttempts: 1,
        verboseRetryLog: true,
        // The database name comes from the URI path; without one, MongoDB
        // silently uses `test`. Logging it makes that mistake visible.
        onConnectionCreate: (connection: Connection) => {
          connection.once('connected', () => {
            new Logger('MongoDB').log('Connected', { database: connection.name });
          });
        },
        // Indexes carry business invariants (e.g. one active owned wedding).
        // In every environment they are created by versioned migrations and
        // verified at startup (IndexCheck), never built implicitly on boot.
        autoIndex: false,
      }),
    }),
  ],
  providers: [
    ...redisProviders,
    MigrationRunner,
    RateLimiter,
    BackgroundTasks,
    objectStorageProvider,
  ],
  exports: [REDIS, MigrationRunner, RateLimiter, BackgroundTasks, ObjectStorage],
})
export class PlatformModule {}
