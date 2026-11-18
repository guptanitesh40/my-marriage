# My Marriage

A wedding planning and management platform, built first for Indian weddings:
a private workspace for the couple and their managers, and a public wedding
website for guests — who never need an account.

**Status:** the repository foundation and the public homepage are built.
See [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) for progress.

## What is in here

| Path                 | What it is                                                        |
| -------------------- | ----------------------------------------------------------------- |
| `apps/web`           | Next.js frontend (App Router)                                     |
| `apps/api`           | NestJS backend: the HTTP API and the background worker            |
| `packages/contracts` | API contract (OpenAPI + TypeScript types), generated from the API |
| `docs/reference`     | Product, architecture, database and API specifications            |
| `docs/design`        | Approved screen designs and the design system                     |
| `docs/decisions`     | Why the repository is set up the way it is                        |
| `AGENTS.md`          | Architecture rules and conventions — read before contributing     |

## Prerequisites

- **Node.js 24** — `nvm install` in the repository root reads `.nvmrc`
- **pnpm 12** — `corepack enable` (uses the version pinned in `package.json`),
  or `npm install -g pnpm@12`
- **Docker** (Docker Desktop or equivalent), for local MongoDB and Redis

## First-time setup

```bash
nvm use
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
```

The example files contain local-only values and no secrets. Commands refuse to
run on another Node or pnpm version; if you see `ERR_PNPM_UNSUPPORTED_ENGINE`,
run `nvm use`.

## Running locally

```bash
pnpm services:up   # MongoDB (replica set) on 27017, Redis on 6379
pnpm db:migrate    # create indexes; run again after pulling new migrations
pnpm dev           # web, API and worker together, with reload
```

| What              | Where                                     |
| ----------------- | ----------------------------------------- |
| Web app           | http://localhost:3000                     |
| API (through web) | http://localhost:3000/api/v1/health/ready |
| API (direct)      | http://localhost:4000/api/v1/health/ready |
| API reference     | http://localhost:4000/api/v1/docs         |

The browser always talks to port 3000; requests to `/api/v1/*` are forwarded
to the API. To run one process at a time use `pnpm dev:web`, `pnpm dev:api` or
`pnpm dev:worker`. Stop the services with `pnpm services:down` (data is kept
in a Docker volume).

**Port already in use?** MongoDB and Redis are published on the default ports,
on this machine only. If another project holds them, pick others and use the
same numbers in `apps/api/.env`:

```bash
MONGO_PORT=27018 REDIS_PORT=6380 pnpm services:up
```

**Start again with an empty database:** `docker compose down -v`, then
`pnpm services:up` and `pnpm db:migrate`.

**"MongoDB is missing indexes" at startup:** the API and worker refuse to boot
until every index declared in the code exists. Run `pnpm db:migrate`.

## Checks

```bash
pnpm typecheck      # TypeScript
pnpm lint           # ESLint
pnpm test           # unit tests — no services needed
pnpm test:e2e       # API integration tests — needs `pnpm services:up`
pnpm test:browser   # public pages in Chromium: accessibility, layout, keyboard, links
pnpm build          # production builds
pnpm format         # apply Prettier (format:check to verify only)
```

Before the first `pnpm test:browser`, download the test browser once:
`pnpm --filter @my-marriage/web exec playwright install chromium`.

CI (`.github/workflows/ci.yml`) runs all of these on every pull request.

## Changing the API

The web app's API types are generated from the NestJS code. After changing a
controller or DTO:

```bash
pnpm contracts:generate
```

Commit the updated files in `packages/contracts`. CI fails if they are stale.

## Changing the database

Indexes are never built automatically. A new or changed index needs a migration
in `apps/api/src/platform/migrations/migrations.ts` as well as the declaration
on the schema; `pnpm db:migrate` applies it. Deployments run the same step
(`node dist/migrate.js`) before starting the new API and worker.

## Environment variables

| Variable           | Used by | Purpose                                                                                                  |
| ------------------ | ------- | -------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`         | API     | `development`, `test` or `production`                                                                    |
| `PORT`             | API     | HTTP port (default 4000)                                                                                 |
| `MONGODB_URI`      | API     | MongoDB connection string (must be a replica set)                                                        |
| `REDIS_URL`        | API     | Redis connection string                                                                                  |
| `TRUST_PROXY_HOPS` | API     | Proxies trusted for the client address: 0 locally, 1 behind one load balancer                            |
| `API_ORIGIN`       | Web     | The API's origin: `/api/v1/*` is forwarded there (fixed at build) and server rendering calls it directly |

The API validates its variables at startup and refuses to start if one is
missing or malformed. Real secrets never go in the repository.
