import type { IncomingMessage, ServerResponse } from 'node:http';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import type { Env } from './config/env.js';
import { API_PREFIX, configureApp, createOpenApiDocument } from './configure-app.js';
import { AppLogger } from './platform/logger.js';

type RequestListener = (req: IncomingMessage, res: ServerResponse) => void;

async function bootstrap(): Promise<RequestListener> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: new AppLogger(),
  });
  configureApp(app);

  const config = app.get<ConfigService<Env, true>>(ConfigService);
  if (config.get('NODE_ENV', { infer: true }) !== 'production') {
    SwaggerModule.setup(`${API_PREFIX}/docs`, app, createOpenApiDocument(app));
  }

  // Run directly (`node dist/main.js`, `nest start`), this process is the
  // server. Imported instead — by Vercel's function launcher — the platform
  // owns the socket and calls the exported handler, so only initialise.
  if (import.meta.main) {
    await app.listen(config.get('PORT', { infer: true }));
  } else {
    await app.init();
  }
  // The Express application is itself a Node request listener.
  const express: RequestListener = app.getHttpAdapter().getInstance();
  return express;
}

// Started on load, not awaited: Vercel needs this module's export as soon as
// it is imported, while start-up (MongoDB, the index check) takes seconds.
// A failed start is an unhandled rejection, which ends the process.
const listener = bootstrap();

/** The request handler Vercel invokes; requests wait until start-up is done. */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  (await listener)(req, res);
}
