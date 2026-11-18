# Project status

A running log of what has been built. It records each major feature or
milestone when it lands, newest first, so anyone joining the project can see
where it stands without reading the git history. Decisions and their reasons
belong in `docs/decisions/`; requirements stay in `docs/reference/`.

## Where things stand

| Area                   | State                                                     |
| ---------------------- | --------------------------------------------------------- |
| Repository foundation  | Done                                                      |
| Public homepage        | Done (privacy and terms are drafts, pending legal review) |
| Authentication         | Not started; `/login` is linked but returns 404           |
| Wedding management     | Not started                                               |
| Guests, RSVPs, website | Not started                                               |
| Photos                 | Not started                                               |

Open questions waiting on the owner are listed in
[0002 — Foundation for Phase 1](decisions/0002-phase-1-foundation.md#still-open--needs-the-owner).

## Log

### Public homepage — 2026-11-18

The marketing homepage for visitors, built from the approved Stitch design
(`docs/design/homepage/`), with every claim checked against the PRD.

- **Pages:** `/` (homepage), `/privacy` and `/terms`, in the `(public)` route
  group with a shared header and footer.
- **Homepage sections:** hero with a dashboard mock-up, ceremonies, planning
  features (task, expense and guest previews in keyboard-accessible tabs), how
  it works, wedding website templates, guest experience, trust, final call to
  action and FAQ.
- **Sample wedding:** one fictional wedding drives every mock-up
  (`src/content/home/sample-wedding.ts`), with unit tests that keep its numbers
  within the product rules (party size, payments, task totals).
- **Brand:** logo mark and favicon (`docs/design/brand/`), design tokens in
  `globals.css`.
- **Legal pages:** drafts written from the product documents. They carry a
  visible "pending legal review" notice and are excluded from search engines
  until a lawyer has reviewed them, including against India's DPDP Act, 2023.
  Company name, contact email, liability cap and jurisdiction are still
  placeholders.
- **Browser tests** (`pnpm test:browser`, also in CI): axe accessibility checks
  and no horizontal scroll at 360, 768 and 1280px, keyboard use of the skip
  link, tabs and FAQ, link integrity, and no failed requests or console errors.
- **Not done yet:** "Log in" and "Start planning free" point to `/login`,
  which the authentication milestone builds. No domain has been chosen, so
  mock-up URLs show `…/w/<slug>`.

### Repository foundation — 2026-11-18

The monorepo and the shared infrastructure every feature builds on. No product
features. Details in [0001](decisions/0001-repository-foundation.md) and
[0002](decisions/0002-phase-1-foundation.md).

- **Apps:** Next.js web app (`apps/web`); NestJS API, background worker and
  migration runner from one codebase (`apps/api`); generated API contract
  (`packages/contracts`).
- **Local services:** MongoDB replica set and Redis through `compose.yaml`.
- **Database:** indexes created only by versioned migrations, and the API and
  worker refuse to start if one is missing. Mongoose rejects unknown fields.
- **HTTP contract:** `{ data, requestId }` success envelope, a standard error
  envelope with per-field validation errors, request IDs in every log line, a
  health and readiness endpoint, and an OpenAPI contract that CI checks for
  staleness.
- **Web:** separate API clients for Client and Server Components, with the
  browser calling only its own origin; baseline security headers.
- **CI:** formatting, lint, typecheck, unit and integration tests, build and a
  weekly dependency audit.
