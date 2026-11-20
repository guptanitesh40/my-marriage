# 0017 — Wedding website: one content model, three templates, draft and publish

Date: 2026-11-20 · Status: accepted (M10.1 built; M10.2–M10.5 follow)

## Why

M10 builds the public wedding website (PRD SITE-01 to SITE-07, LIVE-01/02,
EVT-07). The owner approved the recommendations of the M10 analysis
(D1–D13), recorded here.

## Decisions

- **D1 — Draft, then publish.** Edits save a draft (`templateId`, `content`,
  `contentVersion`); publishing copies it into `publishedTemplateId`,
  `publishedContent` and `publishedVersion`, which are all the public site
  reads. Republishing is "Update published site". Wedding names, the address
  and every ceremony detail are the wedding's and the events' own records,
  so their changes reach the public site at once; only the website's own
  words and its template wait for publishing. This adds the `published*`
  fields to the schema document's `website_configs`.
- **D2 — Designs.** The approved Stitch builder screen showed templates only
  as a hero variation, so the public site of each template, and the
  not-available page, were designed in Stitch from one shared content brief
  (`docs/design/wedding-website/README.md`).
- **D3 — Addresses can change.** `PATCH /weddings/{id}` takes `slug`.
  Every address a wedding has used is kept in `wedding_slugs` under a unique
  index: an old address belongs to that wedding for good, redirects to the
  current one, and can be taken back by it but never by another wedding.
  Wedding creation records its first address there; migration 0012 records
  existing weddings' addresses. `GET /weddings/{id}/website/address?slug=`
  checks one without changing anything.
- **D4 — Ceremony details for guests live on the event**: `venue.mapsUrl`
  (Google Maps hosts only, stored as https), `dressCode`, and `livestream`
  (a YouTube link in, only its video ID stored). `event-links.ts` checks
  both kinds of link; the site builds its own embed and watch links.
- **D5 — Timelines** are not built; the site shows none until they exist.
- **D6 — Every ceremony shows**, no per-ceremony switches (EVT-07).
  Deleted ones never show; cancelled ones show, marked cancelled.
- **D7 — Left out of the design:** a public RSVP button (guests use their
  private link), travel guide, password protection, contact email, parents'
  note and header motif.
- **D8 — Couple names** are the wedding's, edited through the wedding.
- **D9 — Not indexed by search engines by default**; link previews still work.
- **D10 — The story is plain text**: blank lines separate paragraphs. No
  Markdown, so no HTML sanitizer is needed.
- **D11 — Ready to publish:** couple names, a valid address and at least
  one ceremony that is neither deleted nor cancelled. Missing dates and
  venues show as "to be announced".
- **D12 — Template IDs** `traditional`, `modern`, `royal`; labels
  Traditional, Modern Minimal, Royal / Elegant.
- **D13 — Cover photo and gallery** wait for the photos milestone (M11).

## The model

- **One view for every template and both audiences**
  (`website-projection.ts`): the public site and the organizer's preview
  are built by the same function from the wedding, its events and the
  website's words, copied field by field into an allowlisted DTO. No IDs,
  invitations, guests, notes, vendors or anything private.
- **Routes:**
  - `GET`, `PATCH /weddings/{id}/website`
  - `GET …/preview`: draft, `Cache-Control: no-store`, `X-Robots-Tag: noindex`
  - `POST …/publish` and `…/unpublish`
  - `GET /public/weddings/{slug}` and `…/events`: published only, not cached
- **Concurrency:** every save and publish names the `contentVersion` it
  started from; a newer one is refused (409), never overwritten. Writes go
  through the archive write fence.
- **Archived weddings:** nothing can be edited or published; the published
  site stays up; only an owner can unpublish (without the fence, as the
  owner safety exception, SITE-07).
- **Not found is not found:** a missing address, an unpublished site and a
  wedding being deleted all answer the same 404.
- **Publication record:** `lastPublishedBy` and a log line per publish and
  unpublish, until an audit log exists (TEAM-05).
