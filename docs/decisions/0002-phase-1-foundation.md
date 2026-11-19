# 0002 — Foundation for Phase 1

Date: 2026-11-16 · Status: accepted

An architecture review of the scaffold, before authentication and wedding
management are built, found gaps that would have been expensive to close once
endpoints existed. This records what was decided for each, and what is still
open. It supersedes the "Deferred on purpose" entries of 0001 for the migration
runner and the success-response envelope.

## Database

- **Indexes are created only by versioned migrations, in every environment.**
  `autoIndex` is off everywhere, including development and tests, so there is
  one path and it is exercised daily. Migrations live in
  `apps/api/src/platform/migrations/migrations.ts` and are applied by a third
  entry point, `src/migrate.ts` (`pnpm db:migrate`; `node dist/migrate.js` in a
  deployment, before the new API and worker start). Applied IDs are recorded in
  the `schema_migrations` collection, which also holds a lock so two
  deployments cannot migrate at once. The runner is our own, about 80 lines: no
  dependency was added.
- **The API and worker refuse to start if the database lacks an index a schema
  declares** (`IndexCheck`). This is the startup check the schema document asks
  for (§10.1). It also catches an index added to a schema without a migration.
  An index is therefore written twice — on the schema and in a migration — and
  the check keeps the two in agreement.
- **Mongoose `strict` and `strictQuery` are `'throw'` for every schema.** With
  the defaults a misspelt field is silently dropped from a write, and a
  misspelt `weddingId` in a filter would silently change which documents
  match. `sanitizeFilter` was considered and not enabled: it would require
  wrapping every operator query in `trusted()`, and request bodies are already
  validated by DTOs that reject non-string values.
- **Local connection strings use `directConnection=true`** instead of
  `replicaSet=rs0`, so they keep working when the published port is changed.
  Transactions work the same way.

## Redis

- **The shared connection fails fast** (one retry, two-second timeouts). It
  previously waited forever, which made the readiness probe — and any request
  that touched Redis — hang during an outage. A BullMQ worker needs the
  opposite setting and must be given its own connection when it is added.

## HTTP contract

- **Every successful response is `{ data, requestId }`**, applied by a global
  interceptor; the health endpoints included, so there are no exceptions to
  remember. `@ApiDataResponse(Dto)` documents it. `meta` (for lists) is not
  built yet and will be added with the first list endpoint.
- **Validation errors are per field**: `details` is a list of
  `{ field, messages }`, with dotted paths for nested objects, so a form can
  place each message. Rejected values are never included.
- **The error envelope is part of the generated contract**, as the default
  response of every operation, so the web app's error type is generated too.
- **The Swagger CLI plugin is enabled**, so DTO properties and their comments
  reach the contract without an `@ApiProperty` on each one. It reads only files
  named `*.dto.ts`.
- **The contract is generated from code and checked for staleness only.** The
  API document asks for a diff against a hand-written OpenAPI file, but none
  exists; conformance to the API document is by review.

## Request handling

- **The request ID is available anywhere through `currentRequestId()`**
  (AsyncLocalStorage), is stamped on every production log line, and there is
  one access-log line per request: method, path without query string, status
  and duration. Headers and bodies are never logged.
- **Responses default to `Cache-Control: no-store`.** Public routes opt in to
  caching explicitly.
- **`TRUST_PROXY_HOPS` says how many proxies are believed about the client
  address**: 0 locally, 1 behind one load balancer. The web server forwards the
  visitor's `X-Forwarded-For` when it calls the API during server rendering, so
  rate limits see the visitor on both paths. Locally the Next.js rewrite does
  not send that header, so every request appears to come from 127.0.0.1.

## Web

- **Two API clients replace the single one**: `lib/api/browser` for Client
  Components and `serverApi()` in `lib/api/server` for Server Components, which
  forwards the visitor's cookie and address and nothing else. The old client
  called the API from the server without credentials.
- **Baseline security headers on every page** (`frame-ancestors 'none'`,
  `nosniff`, a referrer policy) and no `X-Powered-By` from either app. A full
  Content-Security-Policy is not designed yet.
- **`cacheComponents` and `partialPrefetching` both stay on.** The review
  suggested dropping `partialPrefetching` until it could be measured, but
  Next.js 16 warns when Cache Components is enabled without it, recommends both
  for new projects and makes both the default in the next major release.

## Tooling

- **Commands fail on the wrong Node or pnpm** instead of warning.
- **Integration tests use their own Redis database (`/1`)** as well as their
  own MongoDB database, and build the app through `createTestApp()`.
- **Local MongoDB and Redis listen on loopback only**, with overridable ports.
- **CI audits production dependencies** (high severity and above) on every
  run and weekly.
- **`strictPropertyInitialization` stays off in the API** — the one exception
  to "strict everywhere" — because DTO and schema classes are populated by the
  framework. Non-null assertions are now a lint error in both apps.

## Still open — needs the owner

None of these was guessed at. Items 1 and 2 were settled in
[0003](0003-authentication.md), and so was item 4's email change (deferred to
a profile milestone).

1. **Email pipeline.** Verification, password-reset and co-owner invitation
   emails make the outbox, BullMQ, the relay and the Resend adapter part of
   Phase 1. Undecided: NestJS first-party packages or our own; how a raw token
   reaches an email when only its hash is stored and outbox payloads may hold
   no secrets; how emails are viewed in local development.
2. **Auth policy.** Session lifetime, password rules, lockout, the CSRF
   mechanism, and which operations are limited before email verification.
3. **Wedding creation.** The API document requires `slug`, `city` and `state`;
   the approved setup screen derives the slug, has one location field and adds
   a "celebration scale" field that no specification mentions; the PRD mentions
   a wedding title that the schema lacks.
4. **Scope of Phase 1.** Email change (AUTH-05) has no endpoint; whether audit
   events are built in Phase 1 (PRD) or the next milestone (schema document).
5. **Designs.** There are none for signup, email verification, forgot/reset
   password, My Weddings or team management.
6. **An environment name.** `NODE_ENV=staging` is rejected, so staging runs as
   `production`. An `APP_ENV` variable should be added with its first consumer
   (most likely choosing the mail transport), not before.
