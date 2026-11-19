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
| Authentication         | Done (profile editing and session management not started) |
| Wedding management     | Onboarding steps 1–2 done (ceremony, handoff next)        |
| Guests, RSVPs, website | Not started                                               |
| Photos                 | Not started                                               |

Open questions waiting on the owner are listed in
[0002 — Foundation for Phase 1](decisions/0002-phase-1-foundation.md#still-open--needs-the-owner).

## Log

### Partner invitation (onboarding step 2) — 2026-11-19

Inviting your partner as the wedding's second owner, from the approved
Stitch design. Decisions in [0005](decisions/0005-partner-invitation.md)
and [0008](decisions/0008-invitations-without-the-link.md).

- **Invite** from `/onboarding/partner` by email. The partner gets an email
  with a link that works for 7 days; the page then shows the invitation as
  pending, with **Resend** (a new link; the old one stops working) and
  **Edit invitation** (another address, which replaces it). An email that
  fails shows as not sent, and the wedding is unaffected.
- **Accept** at `/invitations/accept`: shows what the invitation is for, then
  asks the partner to sign in with the invited address (or sign up and
  verify), and accepts. The partner becomes an equal owner. A wedding never
  gets a third owner, and someone who already owns an active wedding is
  refused.
- **Invitation waiting, no link needed:** a verified account that owns no
  wedding sees the invitations sent to its address on `/onboarding` before
  the form to create one (Stitch "Pending Co-owner Invitation"). "Accept and
  join" makes it an owner in one click. "Start my own wedding instead" asks
  first, and the invitation is offered again on the next visit until they
  accept one or own a wedding.
- **Edit the wedding's details:** "Back to wedding details" from step 2
  opens step 1 with the wedding filled in. Dates before today are refused.
- **API:** `PATCH /weddings/{id}`; `POST`/`GET
/weddings/{id}/member-invites`, `…/{inviteId}/resend`;
  `POST /member-invites/preview` and `/member-invites/accept`;
  `GET /member-invites/mine` and `POST /member-invites/{inviteId}/accept`. Every route
  under one wedding checks membership first and answers 404 to anyone else.
- **Tests:** API integration tests for every rule above, including
  simultaneous acceptance, the two-owner limit, the one-owned-wedding rule
  and a failed email; web unit tests for each state; browser tests for the
  whole journey across two browsers with the real emails.
- **Not done yet:** revoking an invitation without replacing it, the member
  list, manager invitations (PRD TEAM-01/02), step 3 (M3.3).

### Wedding creation (onboarding step 1) — 2026-11-18

The first step of wedding onboarding, from the approved Stitch design.
Decisions in [0004](decisions/0004-wedding-creation.md).

- **Create a wedding** at `/onboarding` with the bride's and groom's names,
  city, state and an optional date. It starts active, with its website
  unpublished, a 5 GB photo quota and the creator as its first owner, all in
  one transaction.
- **One active owned wedding per user**, enforced by the database's partial
  unique index, so simultaneous or repeated submissions cannot create a
  second. Managing other weddings is still allowed, and archived weddings do
  not count.
- **Every way in leads there:** a verified user without a wedding goes from
  the homepage, the dashboard, sign-in or email verification straight to
  `/onboarding`, and on to step 2 after creating it. Coming back to step 1
  shows the existing wedding instead of the form.
- **API:** `POST /api/v1/weddings` and `GET /api/v1/weddings` (the weddings
  you own or manage, with your role). The server chooses the web address
  (slug) from the names.
- **Tests:** API integration tests for creation, validation, the ownership
  rule under concurrency, rollback, managers and archived weddings; web unit
  tests for the form; browser tests for both steps at three widths (axe),
  keyboard use, refresh and back, and every redirect.
- **Not done yet:**
  - step 3, the first ceremony (M3.3); step 2 was added in M3.2, below
  - the workspace handoff page and dashboard (M3.4); `/dashboard` is still
    the welcome page, now naming the wedding

### Authentication and accounts — 2026-11-18

Accounts for couples and their families, built in-house as the architecture
requires. Policy and mechanisms in
[0003](decisions/0003-authentication.md).

- **Sign-up** with name, email and password. Weak and common passwords are
  refused, and an email can have only one account. Sign-up signs the person
  in and sends the verification email.
- **Email verification** by a single-use link that works for 24 hours, with
  a resend that replaces the old link. Unverified accounts can sign in, but
  everything except their own account details waits for verification.
- **Sign-in and sign-out** with server-side sessions in an HttpOnly cookie:
  30 days at most, 7 days without use. Failed sign-ins pause after five
  attempts for one email, and the answer never reveals whether an account
  exists.
- **Forgotten password:** a reset link that works for 1 hour and once. The
  reset signs the account out everywhere and sends a "password changed"
  email.
- **Protection everywhere:** every API route needs a signed-in, verified user
  unless marked otherwise. Cross-site requests are refused, and rate limits
  apply per address and per account. Link secrets are never stored, logged or
  queued.
- **Email delivery:** emails are queued in the same transaction as the change
  that causes them, relayed by the worker through BullMQ, and sent through
  Gmail (SMTP) with retries. Locally they are written to `apps/api/.mail/`.
- **Pages:** `/login` (matching the approved Stitch design), `/signup`,
  `/verify-email`, `/forgot-password`, `/reset-password`, and a signed-in
  welcome page at `/dashboard`. Signed-in visitors skip the sign-in page.
- **Tests:** API integration tests for every rule above, including
  concurrency, expiry and log hygiene. Browser tests now run the real web
  app, API and worker on a separate database: every account page at three
  widths (axe), plus the sign-up → verify → dashboard → sign-out → sign-in
  and forgot → reset journeys, reading the real emails.
- **Not done yet:**
  - profile editing, password change while signed in, the list of signed-in
    devices, and email change (planned as their own milestone)
  - the wedding switcher
  - audit events
  - delivery reports: Gmail SMTP says only that an email was accepted, not
    whether it arrived or bounced
  - final wording of the signup consent notice, which waits on the legal
    review

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
