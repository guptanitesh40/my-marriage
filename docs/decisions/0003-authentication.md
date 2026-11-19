# 0003 — Authentication and account emails

Date: 2026-11-18 · Status: accepted

Decisions for milestone M2 (accounts: sign-up, email verification, sign-in,
sessions, password reset), approved by the owner before implementation. They
settle open items 1 (email pipeline) and 2 (auth policy) of
[0002](0002-phase-1-foundation.md#still-open--needs-the-owner).

## Policy

- **Password length:** 10 to 128 characters, counted as people see them
  (NFKC). No composition rules.
- **Weak passwords refused:**
  - number-only passwords, such as phone numbers and dates
  - fewer than 4 different characters
  - passwords from a built-in list of common ones
  - a common word with only a few digits or symbols added (`Wedding@2027`)
  - the account's own email address
- **Session:** ends 30 days after sign-in, or after 7 days without use,
  whichever is first.
- **Unverified accounts** may sign in. Every API route except `GET /auth/me`,
  sign-out and resend refuses them (403 `EMAIL_NOT_VERIFIED`).
- **Signup with a taken email** says so (409 `EMAIL_TAKEN`), as PRD AUTH-01
  requires. This reveals that the address has an account; the per-IP signup
  limit slows anyone harvesting addresses.
- **Email links:** verification links work for 24 hours, password reset links
  for 1 hour. Both are single use, and a new one replaces the old one.
- **After a password reset:** every session ends, other reset links stop
  working, the address counts as verified, and a "password changed" email is
  sent.
- **Consent at signup:** a notice linking to the Terms and Privacy pages, with
  placeholder wording. Nothing is stored.

Rate limits are in `apps/api/src/modules/auth/auth-policy.ts`. There is no
permanent account lockout: five failed sign-ins for one email pause sign-in
for that email for 15 minutes, which would otherwise let anyone lock a family
member out. Limits keyed on an email apply whether or not it has an account,
and the limits on how many emails one address receives are silent — the
request is answered as usual — so none of them reveals who has an account.
Failed sign-ins are counted before the password is checked (a success
clears the count), so simultaneous guesses cannot all slip under the limit.
Forgot-password and resend-verification answer once the per-IP limit has
passed and do everything that depends on the account afterwards, so the
response time does not reveal whether an address has one either. Per-IP
limits are generous because mobile carriers put many people behind one
address. When Redis is unreachable, rate-limited requests fail with 503
rather than skip the check.

## Mechanisms

- **Passwords: Argon2id with Node's built-in `crypto.argon2`** (Node 24.7+),
  so no native dependency. OWASP's minimum cost (19 MiB, 2 passes, 1 lane);
  hashes made with other settings are upgraded at the next sign-in. Sign-in
  with an unknown email spends the same time on a dummy hash.
- **Sessions: opaque random tokens** in the `mm_session` cookie (HttpOnly,
  SameSite=Lax, Secure in production, no Domain). MongoDB stores only the
  token's SHA-256. Every request re-checks revocation, both expiries, the
  account's status and whether the password changed since sign-in; the TTL
  index only cleans up. A session records the account's `passwordChangedAt`
  as read when its password was checked, and works only while that is
  unchanged — so a sign-in in flight during a reset cannot outlive it. Each sign-in creates a new session and ends the one
  the browser had.
- **Every route is protected by default.** A global `SessionAuthGuard`
  requires a session and a verified email; routes opt out with `@Public()` or
  `@AllowUnverified()`. A forgotten decorator fails closed.
- **CSRF: NestJS's built-in `app.enableCsrfProtection()`** (Fetch Metadata,
  with Origin as a fallback; `WEB_ORIGIN` is the one trusted origin), plus
  SameSite=Lax cookies and JSON-only bodies. No tokens. Sign-in and sign-out
  are protected too, so another site can neither log someone into an
  attacker's account nor out of their own.
- **Email links carry their secret in the URL fragment**
  (`/verify-email#token=…`). Browsers never send a fragment to a server, so it
  stays out of logs, proxies and Referer headers, and a link scanner that only
  fetches the page cannot use it. The page reads it, removes it from the
  address bar and history, then posts it. Verifying twice with the same link
  succeeds (some mail scanners open links first).
- **The worker creates the link while sending the email** (the owner chose
  this over an HMAC-derived or encrypted token). The API's transaction records
  only the notification and its outbox event; the worker issues the token,
  stores its SHA-256, and sends. No secret is ever stored or queued. A retry
  after a crash issues another token, but Resend's idempotency key (the
  notification's) stops a second email; the unsent token expires unused.
  Because a retry's payload differs, Resend answers it `409
invalid_idempotent_request`, which is recorded as sent.
- **Each token belongs to its email** (`notificationId`, `requestedAt`), so
  "a new link replaces the old one" holds whatever order the worker sends
  emails in: a new token revokes those of the user's other emails of that
  kind, but not earlier tokens of the same email, which may be the one that
  was delivered. The worker sends no link already overtaken: a request older
  than one that has a token, a reset requested before the password last
  changed, or a verification for an address verified meanwhile.

## Email pipeline

> **Superseded in part by [0007](0007-gmail-smtp.md):** email is now sent
> through Gmail over SMTP. Resend, its adapter and its idempotency key are
> gone; what this section says about them is history.

`notifications` + `outbox_events` written in the transaction of the change →
the worker's relay claims due events atomically (a 30-second claim, so several
workers never publish one twice) and adds a BullMQ job whose ID is the event
ID → the job's handler sends the email, skipping any notification already
sent. Retries: 8 tries with exponential backoff from 10 seconds (about 21
minutes). Resend 429/5xx/network errors retry; other 4xx errors fail at once.
"Sent" means Resend accepted the email, never that it was delivered (PRD
INV-08). Delivery webhooks are not built yet.

- **Resend through our own adapter over `fetch`** (about 60 lines), not the
  `resend` SDK or `@nestjs/mail` (version 0.0.2 when evaluated). Revisit
  `@nestjs/mail` once it is stable.
- **`@nestjs/outbox` was not used:** it has no MongoDB store. Nor
  `@nestjs/bullmq`: its automatic processor discovery would start workers in
  any process that imports the module, including the API. Plain `bullmq` is
  the only new dependency.
- **Local email:** `MAIL_TRANSPORT=file` writes HTML and JSON files to
  `apps/api/.mail/`; integration tests use `memory`; production must use
  `resend` (the API refuses to start otherwise).
- **Rate limiter: our own** fixed-window counter in Redis (an atomic Lua
  script), not `@nestjs/throttler`, whose limits are per route rather than per
  account and count every request rather than failures.

## Changes to the reference documents

- `notifications.kind` gains `password_changed` (the security notice after a
  reset). The schema document lists only the kinds of the other features.
- `auth_sessions.passwordChangedAt` and `auth_action_tokens.notificationId`
  / `requestedAt` are additions, explained under Mechanisms.
- Only the fields and kinds used so far exist in the schemas (for example no
  `profileAssetId`, no `change_email` purpose, no session `ipHash`); each
  arrives with its feature.
- Endpoint paths follow the API document (`/auth/verification/resend`,
  `/auth/password/forgot`, `/auth/password/reset`), not the architecture
  document's older names.

## Not built in M2

Profile editing, password change while signed in, the session list and
per-device sign-out, profile photo and email change (AUTH-05) — planned as a
separate profile milestone; the wedding switcher (AUTH-06); audit events;
Resend delivery webhooks. Real email delivery also needs a verified sending
domain and a Resend API key, which do not exist yet.
