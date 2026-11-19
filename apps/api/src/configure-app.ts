import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import type { Env } from './config/env.js';
import { ApiErrorDto, FieldErrorDto } from './platform/api-error.dto.js';
import { ApiExceptionFilter } from './platform/api-exception.filter.js';
import { accessLog, defaultHeaders } from './platform/http-middleware.js';
import { requestContext } from './platform/request-context.js';
import { ResponseEnvelopeInterceptor } from './platform/response-envelope.js';
import { TraceInterceptor } from './platform/trace.interceptor.js';
import { configureTracing } from './platform/tracing.js';
import { createValidationPipe } from './platform/validation.js';

export const API_PREFIX = 'api/v1';

/**
 * HTTP behaviour shared by the real server, the integration tests and the
 * OpenAPI export, so all three always see the same API.
 */
export function configureApp(app: NestExpressApplication): void {
  app.disable('x-powered-by');

  // How many proxies in front of the API may be believed about the client's
  // address (X-Forwarded-For). Rate limits depend on this being right: too
  // low and every user shares the load balancer's address, too high and a
  // client can forge its own. Null only in OpenAPI preview mode, where
  // providers are not instantiated.
  const config = app.get<ConfigService<Env, true> | null>(ConfigService);
  if (config) app.set('trust proxy', config.get('TRUST_PROXY_HOPS', { infer: true }));

  configureTracing(config ? config.get('LOG_TRACE', { infer: true }) : 'off');
  app.use(requestContext, accessLog, defaultHeaders);
  // Cross-site request forgery: a state-changing request from another site's
  // page is refused (403) before it reaches a handler. Uses the browser's
  // Fetch Metadata, with Origin as a fallback; GET, HEAD and OPTIONS are never
  // checked, so they must never change anything. Registered after the
  // middleware above, so a refusal still carries a request ID.
  app.enableCsrfProtection({
    trustedOrigins: config ? [config.get('WEB_ORIGIN', { infer: true })] : [],
  });
  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalPipes(createValidationPipe());
  // Tracing first, so it wraps the envelope and records the body as sent.
  app.useGlobalInterceptors(new TraceInterceptor(), new ResponseEnvelopeInterceptor());
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();
}

export function createOpenApiDocument(app: NestExpressApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('My Marriage API')
    .setDescription('REST API for the My Marriage wedding planning platform.')
    .setVersion('1.0')
    // ApiExceptionFilter gives every failure this shape, whatever the status.
    .addGlobalResponse({
      status: 'default',
      description: 'Any failed request, in the standard error envelope.',
      type: ApiErrorDto,
    })
    // The organizer session (SessionAuthGuard); set by signup and login.
    .addCookieAuth('mm_session')
    .build();
  return SwaggerModule.createDocument(app, config, { extraModels: [ApiErrorDto, FieldErrorDto] });
}
