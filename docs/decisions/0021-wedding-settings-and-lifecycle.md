# 0021 — Wedding settings, archiving and deletion requests

Date: 2026-11-23 · Status: accepted (M13 built)

## Why

PRD WED-04 to WED-07 ask for editable wedding details, an owner-only
archive and an owner-controlled deletion request, with the deletion
handling left as a policy to approve. The owner answered the M13.0
analysis questions on 2026-11-23; this records those answers.

## Decisions

**Settings page (WED-04)**

- `GET /weddings/{id}/settings`, for any member: the wedding, who last
  saved its details and when, and its archive or deletion state.
- `PATCH /weddings/{id}` gains `mainVenue {name, address, mapsUrl}` and
  `description` (500 characters, line breaks kept). Both are private to
  the team; the public website does not show them. (Amended by decision
  0022: the couple may choose to show the main venue on the website; the
  description stays private.) The map link must be
  Google Maps, as for ceremonies. `null` clears either.
- Every save records `lastSavedAt` and `lastSavedBy` (not `updatedAt`,
  which every write fence raise changes) and a `wedding.updated` audit
  event listing the fields changed, never their values. Each save is one
  transaction.
- Any member edits the details (owner, admin or manager), as before.
- The title is derived from the couple's names ("Ananya & Arjun's
  Wedding"); it is not stored.
- One cover photo: the website's (M10). Settings shows it and links to the
  website builder; `weddings.coverAssetId` from the schema document is not
  added.

**Archive (WED-05)**

- `POST /weddings/{id}/archive`, owners only (admins and managers 403
  `OWNER_REQUIRED`). One transaction: the status changes from `active` to
  `archived` with `archivedAt` and `archivedBy`, the write fence is
  raised, the owners' `activeOwned` is cleared, and `wedding.archived` is
  audited. Archiving again answers with the wedding unchanged.
- Since decision 0020 anyone may own several weddings, so archiving frees
  no "slot": the design's wording about the active-wedding limit is not
  used.
- Not reversible in the app (PRD: reopening is not an MVP workflow).
- Pending team invitations, guest upload links and reminders are not
  revoked: each already refuses to act on a wedding that is not active,
  and their history stays.

**Deletion request (WED-07): a soft delete**

- `POST /weddings/{id}/deletion-requests`, owners only, from `active` or
  `archived`. One transaction: the status becomes `deletion_pending` (write
  fence raised), a `deletion_jobs` record keeps the previous status, and
  `wedding.deletion_requested` is audited. Repeating it answers with the
  waiting request. A partial unique index keeps one waiting request per
  wedding (migration 0019).
- While it waits: read-only for the whole team; the public website,
  gallery, guest invitation pages, upload links and their emails are
  offline (`WeddingAccessService.coupleOf` returns nothing for it, so
  every public path treats the wedding as gone). **Nothing is erased.**
- `POST /weddings/{id}/deletion-requests/cancel`, owners only, restores
  the previous status (`active` or `archived`) and audits
  `wedding.deletion_cancelled`.
- Purging data (MongoDB, S3, caches) is a later, separately approved
  policy; the `purging`, `verified` and `failed` job states are reserved
  for it.

**Confirmation**

- Archiving asks the owner to type `ARCHIVE`, requesting deletion `DELETE`.

**Design differences from Stitch**

Left out because nothing backs them: the prototype bar, the workspace ID,
sidebar count badges, the "Cloud Vault" meter, "PIN protected", "RAW and
video" uploads, subscription wording, "security team review", and the
claim that deletion wipes data at once.

**Phones and tablets**

The workspace sidebar is for screens 1024 px and wider; below that a Menu
button in the top bar opens the same sections and the account in a
drawer.
