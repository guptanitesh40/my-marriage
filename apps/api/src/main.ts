import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import type { Env } from './config/env.js';
import { API_PREFIX, configureApp, createOpenApiDocument } from './configure-app.js';
import { AppLogger } from './platform/logger.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: new AppLogger(),
  });
  configureApp(app);

  const config = app.get<ConfigService<Env, true>>(ConfigService);
  if (config.get('NODE_ENV', { infer: true }) !== 'production') {
    SwaggerModule.setup(`${API_PREFIX}/docs`, app, createOpenApiDocument(app));
  }

  await app.listen(config.get('PORT', { infer: true }));
}

// Started the way Vercel's NestJS entrypoint is documented, not with a
// top-level await, so loading this module never waits for the server to
// start. A failed start still exits the process: Node treats the unhandled
// rejection as fatal.
void bootstrap();
