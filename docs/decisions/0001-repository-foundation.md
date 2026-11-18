# 0001 — Repository foundation

Date: 2026-11-16 · Status: accepted

Decisions taken when the repository was scaffolded, with the reason for each.
Where a choice differs from the architecture document or from a tool's
default, that is called out.

## Structure

- **pnpm workspace with `apps/api`, `apps/web`, `packages/contracts`.** No
  Turborepo or Nx: with two apps and one types package, `pnpm -r` is enough.
  Revisit if CI exceeds about five minutes.
- **The worker is a second entry point in `apps/api` (`src/worker.ts`), not a
  separate `apps/worker`.** This differs from the folder list in the
  architecture document but matches its intent ("a deployable API and a
  separate worker process from the same codebase"). Jobs need the same schemas
  and domain services as the API; a separate app would force a shared domain
  package before any domain code exists. It still deploys as its own process
  with its own IAM role, from the same image.
- **The OpenAPI contract is generated from the NestJS code.** No hand-written
  specification exists. `pnpm contracts:generate` writes
  `packages/contracts/openapi.json` and the TypeScript types the web app
  consumes; CI fails if the committed copy is stale.

## Versions

- **Node 24 LTS.** Supported until April 2028 and required by the NestJS 12 CLI
  (24.15+). Node 26 became LTS weeks before this decision; moving to it later
  is a one-line change.
- **TypeScript 6.0, not 7.** The NestJS CLI, `@nestjs/swagger` and
  typescript-eslint do not support 7 yet.
- **The API is ESM and tested with Vitest**, because NestJS 12 packages are
  ESM-only and that is what its ESM project layout uses. The web app uses
  Vitest too, so the repository has one test runner.
- **ESLint 10 with typescript-eslint**, instead of the Oxlint default the
  NestJS generator now emits, so that both apps share one linter (Next.js
  ships an ESLint config). ESLint 9 is end-of-life. Three plugins inside
  `eslint-config-next` still declare ESLint 9 as their maximum but run
  correctly on 10; the allowance is recorded in `pnpm-workspace.yaml`.

## Local environment

- **MongoDB runs as a single-node replica set** even locally, because the
  ownership, RSVP/archive and quota rules depend on transactions, which a
  standalone server does not support.
- **Local Redis is pinned to 7.x** to match the ElastiCache Redis OSS engine.

## Design

- **Canonical tokens are the `DESIGN.md` front matter** (primary `#184539` on
  `#fdf9f0`), which the exported screens use, rather than the slightly
  different values in its prose. Headings use Newsreader, product text
  Manrope; the Fraunces face on the exported login screen is not used.

## Deferred on purpose

BullMQ (added with the first real queue), authentication, Resend, AWS SDK,
image processing, a migration runner, the success-response envelope
(`{ data, requestId }`, added with the first real DTOs), Dockerfiles,
infrastructure-as-code and deployment. Hosting is assumed to be ECS Fargate
for web, API and worker.
