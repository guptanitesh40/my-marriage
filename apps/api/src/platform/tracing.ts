import { AsyncLocalStorage } from 'node:async_hooks';
import { inspect } from 'node:util';
import { HttpException, type Logger } from '@nestjs/common';
import mongoose from 'mongoose';
import { JSON_LOGS } from './logger.js';

/**
 * Request tracing: which functions a request (or a worker job) went through,
 * in what order, how long each took, what each was given and returned, and
 * where it failed.
 *
 * - `off`: nothing is recorded.
 * - `errors`: every failed request (status 400 or above) and failed job is
 *   logged with the path it took: names, timings and the error's type and
 *   code. No values, so no personal data: safe for production.
 * - `full`: every request and job, with arguments, results, database queries
 *   and the response body. For local development: it logs names and email
 *   addresses.
 *
 * Values are made safe before they are logged, whatever the mode: secrets
 * are masked by key, positional strings (which may be a raw token or a
 * password) are shown only by length, and long values are cut short.
 */
export type TraceMode = 'off' | 'errors' | 'full';
export const TRACE_MODES = ['off', 'errors', 'full'] as const satisfies readonly TraceMode[];

interface TraceStep {
  label: string;
  startedAt: number;
  durationMs?: number;
  input?: string;
  output?: string;
  error?: string;
  /** A step with no duration, such as a database query. */
  point?: boolean;
  children: TraceStep[];
}

export interface Trace {
  root: TraceStep;
  stepCount: number;
  dropped: number;
  /** The body sent back, in `full` mode. */
  response?: string;
}

interface TraceStore {
  trace: Trace;
  step: TraceStep;
}

/** Enough for any real request; a loop gone wrong cannot fill the memory. */
const MAX_STEPS = 400;
const MAX_VALUE_CHARS = 600;
const MAX_STRING_CHARS = 200;
const MAX_ARRAY_ITEMS = 10;
const MAX_DEPTH = 4;

const storage = new AsyncLocalStorage<TraceStore>();
let mode: TraceMode = 'off';

export function traceMode(): TraceMode {
  return mode;
}

/** Called once at startup by the API (`configureApp`) and the worker. */
export function configureTracing(next: TraceMode): void {
  mode = next;
  // Mongoose calls this for every query, in the async context of the code
  // that ran it, so each query lands under the function that made it.
  mongoose.set(
    'debug',
    next === 'off'
      ? false
      : (collection: string, method: string, ...args: unknown[]) => {
          recordPoint(`db ${collection}.${method}`, args);
        },
  );
}

// ---------------------------------------------------------------- recording

/** Starts a trace and runs `fn` inside it. The caller logs it when done. */
export function startTrace<T>(label: string, fn: (trace: Trace | undefined) => T): T {
  if (mode === 'off') return fn(undefined);
  const trace: Trace = {
    root: { label, startedAt: performance.now(), children: [] },
    stepCount: 0,
    dropped: 0,
  };
  return storage.run({ trace, step: trace.root }, () => fn(trace));
}

/** The trace of the request or job being handled, if any. */
export function currentTrace(): Trace | undefined {
  return storage.getStore()?.trace;
}

function addStep(store: TraceStore, label: string): TraceStep | undefined {
  if (store.trace.stepCount >= MAX_STEPS) {
    store.trace.dropped += 1;
    return undefined;
  }
  store.trace.stepCount += 1;
  const step: TraceStep = { label, startedAt: performance.now(), children: [] };
  store.step.children.push(step);
  return step;
}

function recordPoint(label: string, args: unknown[]): void {
  const store = storage.getStore();
  if (!store) return;
  const step = addStep(store, label);
  if (!step) return;
  step.point = true;
  if (mode === 'full') step.input = describeList(args);
}

function finishStep(step: TraceStep, outcome: { output: unknown } | { error: unknown }): void {
  step.durationMs = performance.now() - step.startedAt;
  if ('error' in outcome) step.error = describeError(outcome.error);
  // Nothing returned shows nothing, rather than "→ undefined".
  else if (mode === 'full' && outcome.output !== undefined) {
    step.output = describeTopLevel(outcome.output);
  }
}

/**
 * Runs `call` as one step of the current trace. Anything it calls, including
 * database queries, is recorded under it; parallel calls become siblings.
 * Outside a trace it simply calls through.
 */
export function traceCall<T>(label: string, args: unknown[], call: () => T): T {
  const store = storage.getStore();
  if (!store || mode === 'off') return call();
  const step = addStep(store, label);
  if (!step) return call();
  if (mode === 'full') step.input = describeList(args);

  return storage.run({ trace: store.trace, step }, () => {
    let result: T;
    try {
      result = call();
    } catch (error) {
      finishStep(step, { error });
      throw error;
    }
    if (!isThenable(result)) {
      finishStep(step, { output: result });
      return result;
    }
    // An unexecuted query is returned as is, so the caller can still chain
    // `.lean()` or `.session()` on it; its database step is recorded where
    // it runs.
    if (result instanceof mongoose.Query || result instanceof mongoose.Aggregate) {
      step.durationMs = performance.now() - step.startedAt;
      if (mode === 'full') step.output = `[${result.constructor.name}]`;
      return result;
    }
    // `then` is called here, inside the step's context, so a Mongoose query
    // returned unawaited still runs (and is recorded) under this step.
    return result.then(
      (value) => {
        finishStep(step, { output: value });
        return value;
      },
      (error: unknown) => {
        finishStep(step, { error });
        throw error;
      },
    ) as T;
  });
}

/** Records a step around an observable-based call (a Nest interceptor). */
export function openStep(label: string, input?: Record<string, unknown>): TraceStep | undefined {
  const store = storage.getStore();
  if (!store || mode === 'off') return undefined;
  const step = addStep(store, label);
  if (step && input && mode === 'full') step.input = describeValue(input);
  return step;
}

/** Runs `fn` with `step` as the parent of whatever it calls. */
export function withinStep<T>(step: TraceStep, fn: () => T): T {
  const store = storage.getStore();
  if (!store) return fn();
  return storage.run({ trace: store.trace, step }, fn);
}

export function closeStep(
  step: TraceStep,
  outcome: { output: unknown } | { error: unknown },
): void {
  // A step closed twice (an error after a value) keeps its first outcome.
  if (step.durationMs === undefined) finishStep(step, outcome);
}

/** Records the body sent back, so it is shown at the end of the trace. */
export function recordResponse(body: unknown): void {
  const trace = currentTrace();
  if (trace && mode === 'full') trace.response = describeValue(body);
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { then?: unknown }).then === 'function'
  );
}

// ------------------------------------------------------------- @Traced()

/**
 * Records every call to this class's methods (private ones included) in the
 * current trace. Put it on services, guards and other providers whose path
 * you want to see in the logs. Not on controllers: `TraceInterceptor`
 * records those, with the request and the response.
 */
export function Traced(): ClassDecorator {
  return (target) => {
    const prototype = target.prototype as Record<string, unknown>;
    for (const key of Object.getOwnPropertyNames(prototype)) {
      if (key === 'constructor') continue;
      const descriptor = Object.getOwnPropertyDescriptor(prototype, key);
      if (!descriptor || typeof descriptor.value !== 'function') continue;
      const original = descriptor.value as (...args: unknown[]) => unknown;
      const label = `${target.name}.${key}`;
      const wrapped = function (this: unknown, ...args: unknown[]): unknown {
        return traceCall(label, args, () => original.apply(this, args));
      };
      // Method decorators store their metadata on the function itself.
      for (const metadataKey of Reflect.getOwnMetadataKeys(original)) {
        Reflect.defineMetadata(metadataKey, Reflect.getOwnMetadata(metadataKey, original), wrapped);
      }
      Object.defineProperty(wrapped, 'name', { value: original.name });
      Object.defineProperty(prototype, key, { ...descriptor, value: wrapped });
    }
  };
}

// ---------------------------------------------------------------- values

/**
 * Keys whose values are never logged. Matched as substrings of the
 * lower-cased key, so `newPassword`, `sessionHash` and `tokenHashes` are
 * covered. `html` and `text` are email bodies, which carry secret links.
 */
const SECRET_KEY_PARTS = [
  'password',
  'token',
  'secret',
  'cookie',
  'authorization',
  'apikey',
  'hash',
];
const SECRET_KEYS = new Set(['html', 'text']);

function isSecretKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SECRET_KEYS.has(lower) || SECRET_KEY_PARTS.some((part) => lower.includes(part));
}

const OBJECT_ID = /^[0-9a-f]{24}$/;

/** A placeholder printed as is, not as a quoted string. */
function marker(text: string): object {
  return { [inspect.custom]: () => text };
}

/**
 * A string passed straight to a function can be anything (a raw token, a
 * password, its hash), and there is no key to tell, so only IDs are shown.
 */
function describePositional(value: unknown): unknown {
  if (typeof value === 'string' && !OBJECT_ID.test(value))
    return marker(`[string ×${value.length}]`);
  return sanitize(value, 0, new WeakSet());
}

function sanitize(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return `${value}n`;
  if (typeof value === 'string') {
    return value.length > MAX_STRING_CHARS ? `${value.slice(0, MAX_STRING_CHARS)}…` : value;
  }
  if (typeof value === 'function') return marker(`[Function ${value.name || 'anonymous'}]`);
  if (typeof value !== 'object') return marker(`[${typeof value}]`);

  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) return marker(`[${describeError(value)}]`);
  if (Buffer.isBuffer(value)) return marker(`[Buffer ${value.length} bytes]`);
  if (value instanceof mongoose.Types.ObjectId) return value.toHexString();
  if (seen.has(value)) return marker('[Circular]');
  if (depth >= MAX_DEPTH) return marker(Array.isArray(value) ? '[Array]' : '[Object]');
  seen.add(value);

  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_ARRAY_ITEMS).map((item) => sanitize(item, depth + 1, seen));
    if (value.length > MAX_ARRAY_ITEMS) items.push(`…${value.length - MAX_ARRAY_ITEMS} more`);
    return items;
  }

  // A Mongoose document: its fields, not its internals.
  const plain = isMongooseDocument(value) ? value.toObject() : value;
  const prototype: unknown = Object.getPrototypeOf(plain);
  const className = (prototype as { constructor?: { name?: string } } | null)?.constructor?.name;
  // Plain objects and request DTOs are shown; anything else (a session, a
  // request, a connection) is named, not expanded.
  if (prototype !== null && prototype !== Object.prototype && !className?.endsWith('Dto')) {
    return marker(`[${className ?? 'Object'}]`);
  }
  return Object.fromEntries(
    Object.entries(plain).map(([key, field]) => [
      key,
      isSecretKey(key) ? '[REDACTED]' : sanitize(field, depth + 1, seen),
    ]),
  );
}

function isMongooseDocument(value: object): value is { toObject(): object } {
  return '$__' in value && typeof (value as { toObject?: unknown }).toObject === 'function';
}

function render(value: unknown): string {
  const text = inspect(value, { depth: null, breakLength: Infinity, compact: true });
  return text.length > MAX_VALUE_CHARS ? `${text.slice(0, MAX_VALUE_CHARS)}…` : text;
}

function describeList(args: unknown[]): string {
  return args.map((arg) => render(describePositional(arg))).join(', ');
}

function describeTopLevel(value: unknown): string {
  return render(describePositional(value));
}

function describeValue(value: unknown): string {
  return render(sanitize(value, 0, new WeakSet()));
}

/**
 * The error's type and code; its message too in `full` mode only, since a
 * message can quote input (a duplicate-key error names the email address).
 */
function describeError(error: unknown): string {
  if (error instanceof HttpException) {
    const response = error.getResponse();
    const code =
      typeof response === 'object' && typeof (response as { code?: unknown }).code === 'string'
        ? ` ${(response as { code: string }).code}`
        : '';
    const message = mode === 'full' ? `: ${error.message}` : '';
    return `${error.name} ${error.getStatus()}${code}${message}`;
  }
  if (error instanceof Error) {
    const code = (error as { code?: unknown }).code;
    const codeText = typeof code === 'string' || typeof code === 'number' ? ` ${code}` : '';
    const message = mode === 'full' ? `: ${error.message}` : '';
    return `${error.name}${codeText}${message}`;
  }
  return mode === 'full' ? `thrown ${render(sanitize(error, 0, new WeakSet()))}` : 'thrown value';
}

// ---------------------------------------------------------------- output

function formatMs(ms: number | undefined): string {
  if (ms === undefined) return '';
  return ms < 10 ? `${ms.toFixed(1)}ms` : `${Math.round(ms)}ms`;
}

/**
 * The trace as indented lines, one per step, in the order things happened:
 *
 *     ├─ WeddingsService.create(…)  41ms → { id: '…' }
 *     │  ├─ db weddings.findOne({ … })
 *     │  └─ db weddings.insertOne(…)
 *     └─ ✗ MemberInvitesService.create(…)  12ms ✗ ConflictException 409 OWNER_LIMIT
 */
export function renderTrace(trace: Trace): string[] {
  const lines: string[] = [];
  const walk = (steps: TraceStep[], prefix: string) => {
    steps.forEach((step, index) => {
      const last = index === steps.length - 1;
      const call = step.point
        ? `${step.label}${step.input === undefined ? '' : ` ${step.input}`}`
        : `${step.label}(${step.input ?? ''})`;
      const timing = step.point
        ? ''
        : step.durationMs === undefined
          ? '  (did not finish)'
          : `  ${formatMs(step.durationMs)}`;
      const outcome = step.error
        ? ` ✗ ${step.error}`
        : step.output === undefined
          ? ''
          : ` → ${step.output}`;
      lines.push(`${prefix}${last ? '└─' : '├─'} ${call}${timing}${outcome}`);
      walk(step.children, `${prefix}${last ? '   ' : '│  '}`);
    });
  };
  walk(trace.root.children, '');
  if (trace.response !== undefined) lines.push(`response ${trace.response}`);
  if (trace.dropped > 0) lines.push(`…${trace.dropped} more steps not recorded`);
  return lines;
}

/**
 * Logs a finished trace as one entry: in production a JSON record whose
 * `trace` is the list of lines, elsewhere a summary line with the tree
 * beneath it, so concurrent requests never interleave their steps.
 */
export function logTrace(
  logger: Logger,
  trace: Trace,
  entry: { message: string; summary: string; fields: Record<string, unknown>; failed: boolean },
): void {
  const lines = renderTrace(trace);
  if (JSON_LOGS) {
    const record = { ...entry.fields, trace: lines };
    if (entry.failed) logger.warn(entry.message, record);
    else logger.log(entry.message, record);
    return;
  }
  const text = [entry.summary, ...lines.map((line) => `  ${line}`)].join('\n');
  if (entry.failed) logger.warn(text);
  else logger.log(text);
}
