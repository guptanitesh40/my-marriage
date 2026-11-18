import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { NestExpressApplication } from '@nestjs/platform-express';

// Writes the OpenAPI document generated from the controllers and DTOs to
// packages/contracts/openapi.json. Run via `pnpm contracts:generate`.
//
// Preview mode builds the route metadata without instantiating providers, so
// no database or Redis is needed; the placeholders only satisfy env validation.
process.env.MONGODB_URI ??= 'mongodb://localhost/openapi-export';
process.env.REDIS_URL ??= 'redis://localhost';

const { NestFactory } = await import('@nestjs/core');
const { AppModule } = await import('./app.module.js');
const { configureApp, createOpenApiDocument } = await import('./configure-app.js');

const app = await NestFactory.create<NestExpressApplication>(AppModule, {
  preview: true,
  logger: false,
});
configureApp(app);
const document = createOpenApiDocument(app);

const target = resolve(import.meta.dirname, '../../../packages/contracts/openapi.json');
await writeFile(target, `${JSON.stringify(document, null, 2)}\n`);
await app.close();
console.log(`OpenAPI document written to ${target}`);
