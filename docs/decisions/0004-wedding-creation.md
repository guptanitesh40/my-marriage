# 0004 — Wedding creation (onboarding step 1)

Date: 2026-11-18 · Status: accepted

Decisions for milestone M3.1, creating a wedding with its first owner,
approved by the owner before implementation. The approved design is the
Stitch screen "Onboarding Flow: Steps 1, 2 & 3", which replaces the older
`docs/design/wedding-setup` export.

## What creating a wedding does

`POST /api/v1/weddings` (signed-in, verified user) writes, in one MongoDB
transaction (schema document §6.1):

- the **wedding**: `status: active`, `writeFenceVersion: 0`, a
  **5,000,000,000-byte** photo quota (the decimal 5 GB the schema document
  proposes) with nothing used or reserved, `createdBy` the user;
- the **first owner's membership**: `role: owner`, `status: active`,
  `activeOwned: true`.

The membership is written first. The partial unique index
`uniq_active_owned_wedding_per_user` is what enforces one active owned
wedding per user (PRD WED-03): a duplicate becomes 409 `OWNER_ACTIVE_LIMIT`,
even when simultaneous requests all passed the check made before the
transaction. If anything fails, the transaction aborts and neither document
exists. Being a manager of other weddings does not count, and an archived
wedding's owner membership has `activeOwned: false`, so it does not either.

The owner, role, status and address are never taken from the request: the
request body allows only the five fields below, and unknown fields are
refused.

## Decisions

- **The server chooses the slug** (the owner chose this over the API
  document's client-sent `slug`). It is the two names in lowercase ASCII
  words (`ananya-arjun`); if taken, a random four-character suffix is added
  (`ananya-arjun-k7q2`) and the transaction retried. Names with no Latin
  letters fall back to `wedding-xxxx`. Renaming comes with the website
  feature.
- **The wedding date is an optional calendar day** (`YYYY-MM-DD`), not the
  Stitch design's free-text "target month" and not a date-time: a wedding has
  a day, not an instant. It is stored as midnight UTC and returned as a date.
  Years 2000–2100 are accepted. Since M3.2, dates before today (in India)
  are refused; see [0005](0005-partner-invitation.md).
- **Repeated submissions rely on the one-wedding rule** (the owner chose this
  over an `Idempotency-Key` mechanism for now). A repeat of a request that
  succeeded gets 409, and the web form then carries on to step 2 with the
  existing wedding. The onboarding pages decide what to show from the API,
  so a refresh, a second tab or going back always shows the wedding that
  exists. Idempotency keys are still due for endpoints without a natural
  unique rule, starting with ceremonies (M3.3).
- **Only the wedding and its owner are created** (the owner chose this over
  creating the schema's default website configuration and audit event now).
  A new wedding's website is unpublished because no published website
  configuration exists; both arrive with their milestones.
- **State is chosen from a list** of India's 36 states and union territories
  plus "Outside India". The API accepts any short line of text, so the list
  can change without a migration.

## Changes to the reference documents

- `WeddingCreate`: no `slug` (server-chosen), no `secondOwnerEmail` (the
  partner is invited in onboarding step 2, M3.2), and `weddingDate` is a
  `date`, not a `date-time`. `mainVenue` and `description` arrive with
  wedding details editing (WED-04).
- `POST /weddings` returns the wedding as the member sees it (`id`, `slug`,
  names, place, date, `status`, and the caller's `role`), a superset of the
  documented `{ id, status, slug }`. `GET /weddings` returns a list of the
  same.
- `wedding_memberships` gains an index `(userId, status)` for "my weddings";
  the schema document lists only wedding-first indexes.
- Only the fields used so far exist on `weddings` (no `mainVenue`,
  `description`, `coverAssetId` or archive metadata yet), as in 0003.

## Web app

`/onboarding` is step 1, `/onboarding/partner` step 2 (for now only a
confirmation and "I'll do this later"; the invitation form is M3.2). Every
way in for a verified user without a wedding — the homepage, the dashboard,
sign-in, the verification page — leads straight to `/onboarding`, decided
before a page renders so nothing flashes. The step-1 page shows someone who
already owns an active wedding that wedding instead of the form.

Small text uses `on-surface-variant` rather than the design's lighter
`outline` grey, which fails WCAG contrast at that size.
