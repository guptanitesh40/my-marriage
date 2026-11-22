# 0019 — Photos: albums, guest uploads, moderation and exports

Date: 2026-11-22 · Status: accepted (M11.1–M11.6 built)

## Why

PRD PHOTO-01 to PHOTO-08 left technical choices open (PRD §"technical
decisions", schema document §11). The M11.0 review proposed answers; the
owner approved them all on 2026-11-22. They are recorded here so each
slice builds on the same rules.

## Decisions

**Albums (M11.1, built)**

- Every ceremony has one `event` album and every wedding one `general`
  album ("General Collection"). They are made when the albums are first
  needed (listing them), not when a ceremony is added: the events module
  stays unaware of photos, and weddings from before M11 need no backfill.
  Unique partial indexes keep it to one each under concurrent requests;
  the upserts are not fenced, because an album for an existing ceremony
  changes nothing the archive protects. Archived weddings get none.
- An event album shows its ceremony's current name and details; it cannot
  be renamed. The album of a deleted ceremony is kept (with any photos)
  but no longer listed, changed or open to uploads.
- Couples add their own `custom` albums (name only, up to 50). The general
  and custom albums can be renamed. Any album's guest uploads can be
  paused and reopened (`isUploadEnabled`).
- `GET /weddings/{id}/quota` reports the 5 GB allowance.

**Files and storage (M11.2)**

- JPEG, PNG and WebP only. No HEIC: iPhones turn photos into JPEG when the
  page does not list HEIC, and decoding HEIC on the server adds risk.
- Up to 25 MB and 50 megapixels per photo. Originals are uploaded as they
  are (no shrinking in the browser), so exports keep the original.
- 5 GB is 5,000,000,000 bytes and counts originals, their display copies
  and uploads in progress (`used + reserved`). Website covers are not
  counted (0018). Organizers are warned at 90% and when full.
- Processing runs in the worker with `sharp`: decode within a pixel limit,
  turn upright, re-encode display copies (about 2048px and 480px WebP)
  without metadata. Originals are kept byte for byte, privately, for the
  wedding's organizers only. No virus scanner for the pilot: what anyone
  else sees is always a re-encoded copy.
- Folders in the one bucket (0018): `uploads/` (quarantine, expires after a
  day), `weddings/{weddingId}/photos/{photoId}/`, and `exports/`.

**Guest links (M11.3)**

- An upload link's secret is derived from its record's ID with
  `GUEST_LINK_SECRET`, as invitation links are (0015): only its hash is
  stored, yet the couple sees the same link and QR code every time, and
  an email can carry it. It sits after `#` (`/u#t=…`). One link per album, plus one general link
  per wedding with which guests choose among the open albums
  (`upload_capabilities.scope: album | wedding`).
- Opening a link sets a signed, two-hour `mm_upload_session` cookie (path
  `/api/v1`) that names only the link. Every request checks the link, the wedding and the
  album again, so revoking or pausing takes effect at once. It is never an
  RSVP or organizer session.
- Revoke and rotate end a link for good; pausing an album is reversible.
- Limits: 30 link openings per IP per 15 minutes, 100 uploads per session
  per hour, 1,000 per link per day, 20 uploads in progress per session.
- A guest's name is optional (60 characters) and shown to the couple only,
  never publicly.
- Guests use their own routes (`/upload-access/uploads…`), not
  `/media/uploads/initiate`, which needs a member's session: the global
  session guard stays simple, and the two sessions never mix.
- **Emailing the link** (owner's request, not in Stitch or the PRD): the
  share dialog of the general link emails it to every guest with an
  address, or only to guests attending a ceremony. The worker writes each
  email when sending, from the link's record, and skips it if the link
  was turned off meanwhile; turning off or rotating the general link so
  also stops every emailed copy. It counts against the wedding's daily
  guest email allowance (300).

**Moderation and gallery (M11.4–M11.5)**

- A guest's upload (through a link) starts Pending. An upload by the
  couple or a manager, signed in, starts Approved, approved by them: they
  are the ones who review, so asking them to approve their own photos only
  adds a step (owner's decision, 2026-11-22). Reject deletes the files and frees the
  space (the record stays). Hide takes an approved photo off the website
  and can be undone. Delete is final. Bulk approve, reject and delete (an album's photos, selected or all,
  after a confirmation) take up to 100 photos.
- Public photos are streamed by the API, checked on every request (site
  published, photo approved), cacheable for five minutes. CloudFront can
  replace this later.

**Exports (M11.6)**

- ZIP files of the originals, a folder per album, built by the worker
  (`archiver`, streamed to the bucket with `@aws-sdk/lib-storage`), kept
  seven days, for organizers only, also once archived. Approved photos
  only, or every kept photo; the wedding or one album.
- Downloads are streamed by the API, as images are (0018), rather than the
  signed link first proposed: no presigned URL ever reaches a page, and a
  stream never holds the file in memory. A single photo's original can be
  downloaded the same way.

**Designs**

- The Stitch screens are in `docs/design/photos-gallery/` with what was
  left out and why: paid storage, VIP albums, an approval switch (every
  photo is reviewed), readable link addresses, HEIC and invented details.

**Pages**

- Organizer: storage, pending-review and website-gallery cards; Albums and
  Pending review views; album cards with QR & link, Review and View;
  album page with uploads (progress, retry per photo), grid and a viewer
  with review actions and the original's download; share dialog (QR,
  copy, download, WhatsApp share, new link, turn off, email guests);
  export dialog.
- Guest: `/u`, from the two mobile Stitch screens; no account, no
  referrer, not indexed.
- Website: a Gallery section in all three designs, album chips and a
  full-screen viewer; only while published.

## Still open

- AWS before production: the production origin in the bucket's CORS rule,
  an expiry rule for `exports/`, and a least-privilege IAM user instead of
  root keys.
- The public gallery has no Stitch screen; it uses the website's own
  skins.
- Audit events for reviews are the photo's `approvedBy`/`approvedAt` until
  an audit log exists.
- The sidebar storage meter in the Stitch workspace shell is not built;
  the Photos page shows the storage.
