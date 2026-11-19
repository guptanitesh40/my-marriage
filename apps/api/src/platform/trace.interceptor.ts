import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { closeStep, openStep, recordResponse, withinStep } from './tracing.js';

/**
 * Records the controller method as a step of the request's trace, with what
 * it was given (route params, query, body) and the response it returned.
 * Registered outermost, so the services it calls appear beneath it and the
 * response is the envelope actually sent.
 */
@Injectable()
export class TraceInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest<Request>();
    const step = openStep(`${context.getClass().name}.${context.getHandler().name}`, {
      params: req.params,
      query: req.query,
      body: req.body as unknown,
    });
    if (!step) return next.handle();

    return new Observable((subscriber) =>
      // Subscribing inside the step runs the pipes and the handler inside it.
      withinStep(step, () =>
        next.handle().subscribe({
          next: (value) => {
            closeStep(step, { output: undefined });
            recordResponse(value);
            subscriber.next(value);
          },
          error: (error: unknown) => {
            closeStep(step, { error });
            subscriber.error(error);
          },
          complete: () => {
            closeStep(step, { output: undefined });
            subscriber.complete();
          },
        }),
      ),
    );
  }
}
