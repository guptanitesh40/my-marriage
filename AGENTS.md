# AGENTS.md

Instructions for coding agents (and a quick orientation for humans) working in
this repository. Read this before changing anything.

## What this is

My Marriage is a wedding planning platform: a private workspace for the couple
and their managers, plus a public wedding website for guests. The specifications
in `docs/reference/` are the source of truth:

| Document                                         | Authority for                      |
| ------------------------------------------------ | ---------------------------------- |
| `PRD_v1.0.md`                                    | Product behaviour                  |
| `My_Marriage_System_Design_Architecture_v1.1.md` | Technical approach                 |
| `MongoDB_Schema_Design_v1.0.md`                  | Collections, indexes, transactions |
| `API_Documentation_v1.0.md`                      | Endpoints, payloads, error codes   |

Where the architecture document and the later schema/API documents disagree on
a name or path, the schema and API documents win. `docs/design/` holds the
approved visual design. `docs/decisions/` records why the repository is set up
the way it is.

Do not invent requirements. If the documents do not answer a question, ask.

## Repository layout

```
apps/api             NestJS modular monolith. Three entry points, one codebase:
                       src/main.ts     HTTP API
                       src/worker.ts   background worker (no HTTP)
                       src/migrate.ts  applies database migrations, then exits
apps/web             Next.js App Router frontend
packages/contracts   OpenAPI document + TypeScript types, generated from apps/api
docs/                specifications, design exports, decision records
compose.yaml         local MongoDB (replica set) and Redis
```

## Commands

Run from the repository root with Node 24 (`nvm use`) and pnpm.

| Command                   | Purpose                                           |
| ------------------------- | ------------------------------------------------- |
| `pnpm services:up`        | Start local MongoDB and Redis                     |
| `pnpm db:migrate`         | Apply pending database migrations (indexes)       |
| `pnpm dev`                | Run web (3000), API (4000) and worker together    |
| `pnpm typecheck`          | TypeScript across the workspace                   |
| `pnpm lint`               | ESLint across the workspace                       |
| `pnpm test`               | Unit tests (no services needed)                   |
| `pnpm test:e2e`           | API integration tests (needs `services:up`)       |
| `pnpm build`              | Production builds                                 |
| `pnpm contracts:generate` | Regenerate `packages/contracts` from the API code |
| `pnpm format`             | Prettier                                          |

Before reporting work as done, run typecheck, lint, test and — if the API
changed — `test:e2e` and `contracts:generate`. CI runs all of them and fails
if the committed contract is stale.

## Approved technology — do not replace without asking

Next.js + TypeScript, NestJS + TypeScript, MongoDB Atlas with Mongoose, Redis +
BullMQ, AWS S3, Resend, in-house email/password authentication (no Cognito,
Auth0 or Clerk), AWS hosting. Do not add a dependency when the framework or an
existing dependency already covers the need, and say why when you do add one.

These frameworks are newer than most training data. NestJS 12 is ESM-only;
Next.js 16 has breaking changes (see `apps/web/AGENTS.md`). Check the installed
version's documentation instead of relying on memory:
https://docs.nestjs.com/llms.txt and `node_modules/next/dist/docs/`.
NestJS now ships first-party packages for several things this project needs
(outbox, idempotency keys, storage, mail, webhooks). Evaluate them before
writing our own, and raise the choice with the owner — none is adopted yet.

## Architecture rules

1. **The NestJS API is the only authority for business rules and
   authorization.** Next.js renders and calls the API. It never talks to
   MongoDB, never re-implements a permission check, and hiding a button is
   never an authorization decision.
2. **The browser only ever calls its own origin.** `/api/v1/*` is forwarded to
   the API (Next rewrite locally, load balancer in production). Do not add
   CORS or call the API origin from client code — the HttpOnly session cookies
   depend on this.
3. **`apps/web` imports API types only from `@my-marriage/contracts`.** Never
   import from `apps/api`. Never edit generated files in `packages/contracts`.
4. **API and worker share code, not a process.** Anything a job needs (schemas,
   domain services) lives in a module both `AppModule` and `WorkerModule` can
   import. HTTP controllers are never imported by the worker.
5. **One module per domain** under `apps/api/src/modules/<name>/` (created
   when the first one is built). A module reaches another module's data through
   its exported service, never by importing its Mongoose model.
6. **Infrastructure connections live in `PlatformModule`.** Domain code does
   not open its own MongoDB or Redis connections or read `process.env`; add
   variables to `src/config/env.ts` and `.env.example`. The shared Redis
   connection fails fast; a BullMQ worker needs its own connection.
7. **Indexes exist only through migrations.** `autoIndex` is off everywhere.
   Declare an index on the schema _and_ add a migration in
   `src/platform/migrations/migrations.ts`; the API and worker refuse to start
   if the database lacks a declared index. Never edit a deployed migration.
8. **The web app has two API clients.** Client Components use `api` from
   `lib/api/browser`; Server Components use `serverApi()` from
   `lib/api/server`, which forwards the visitor's cookie. Anything that sets or
   clears a cookie goes through the browser client.

## Business invariants every change must preserve

These come from the PRD and are enforced in the backend, in transactions where
noted. Each needs a test when the feature is built.

- **Wedding isolation.** Every wedding-owned document carries `weddingId`, and
  every query filters on it. Never authorize by `_id` alone. A resource in
  another wedding returns 404, not 403.
- **One active owned wedding per user**, enforced by a partial unique index
  plus a transaction — not by a read-then-write check. Managers may belong to
  any number of weddings.
- **At most two owners, equal in power; never zero.** Managers cannot archive,
  delete, or change ownership.
- **Archived weddings are read-only.** Archive-sensitive writes (RSVP, uploads,
  planning edits) go through the wedding write fence in the same transaction.
  Only the owner safety actions (unpublish, hide photo, request deletion) remain.
- **Party size lives once on the guest contact.** RSVP status and attending
  count are per event and never exceed party size. Never copy party size onto
  an event invitation.
- **Invitation and upload links are bearer credentials.** Store only a hash.
  Never log, return in public payloads, or put in analytics a raw token,
  session cookie, presigned URL or password.
- **Public responses are allowlisted DTOs.** Never return a Mongoose document
  from a controller. Guest contacts, expenses, vendor details, notes, tokens
  and private S3 keys never appear in a public route.
- **Photos are private until approved.** 5 GB per wedding, reserved atomically
  before upload.
- **Side effects are durable and idempotent.** Emails and media work are
  written to the outbox in the same transaction as the change that caused
  them; job handlers must be safe to run twice.
- **Money is integer paise.** No floating point.

## Coding conventions

- TypeScript strict everywhere. No `any`; no non-null assertions to silence
  the compiler.
- API is ESM: relative imports end in `.js`; use `import.meta.dirname`.
- Validate every request body with a DTO; the global pipe rejects unknown
  fields. Errors use the envelope `{ error: { code, message, details? },
requestId }` — throw a Nest `HttpException` (with a `code` for domain errors
  such as `OWNER_ACTIVE_LIMIT`) and let `ApiExceptionFilter` format it.
- Controllers return the DTO itself; a global interceptor wraps it as
  `{ data, requestId }`. Document the response with `@ApiDataResponse(Dto)`,
  not `@ApiOkResponse`, so the generated contract describes the envelope. Name
  DTO files `*.dto.ts`: the Swagger plugin only reads those.
- Log through Nest's `Logger`, with structured fields as a second argument
  (`logger.log('message', { weddingId })`). The request ID is added
  automatically; services read it with `currentRequestId()` for audit events.
- Mongoose runs with `strict` and `strictQuery` set to `'throw'`: a field that
  is not in the schema is an error, in writes and in filters.
- Unit tests sit beside the code as `*.spec.ts` (API) or `*.test.tsx` (web).
  Integration tests in `apps/api/test/*.e2e-spec.ts` run against real MongoDB
  and Redis — do not mock the database for rules that depend on transactions
  or unique indexes. Build the app with `createTestApp()` from
  `test/support/app.ts`, which applies migrations first.
- Frontend styling uses the design tokens in `apps/web/src/app/globals.css`
  (`bg-surface`, `text-primary`, `font-serif` …), not raw hex values.
- Comments explain why, not what.
- Do not create empty modules, placeholder files or abstractions for features
  that are not being built yet.

## Working agreements

- Never commit secrets. Only `*.example` env files are tracked.
- Do not commit, push, or provision cloud resources unless asked.
- Keep changes scoped to the task; do not start the next milestone unprompted.
