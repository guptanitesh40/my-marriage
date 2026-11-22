# 0017 — Wedding website: one content model, three templates, draft and publish

Date: 2026-11-20 · Status: accepted (M10.1–M10.3 built, M10.4 in part; link previews and M10.5 follow)

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

## The three designs (M10.2, 2026-11-22)

- **Three renderers, one content.** `components/website/site/` holds a
  component per template, each reading the same `PublicWebsiteDto`. They
  differ in layout and decoration only; a section the couple hasn't written
  (story, questions) is left out of every design, with its menu link.
- **Royal / Elegant colours are design tokens** (`--color-royal-*` in
  `globals.css`), used only by that design. Its gold is for rules, borders
  and large type; small text on ivory uses `royal-gold-deep`, which passes
  contrast, where the Stitch export's lighter gold did not.
- **The livestream loads nothing until a guest presses play.** The
  design's poster is a button; pressing it swaps in YouTube's
  privacy-enhanced player (`youtube-nocookie.com`). "Watch on YouTube"
  opens the video there.
- **Questions are `<details>` elements**: they open and close without
  JavaScript, the first one open.
- **The organizers' preview** is a full page at
  `/weddings/{id}/website/preview`, outside the workspace shell so it looks
  as guests will see it. It shows the saved draft (not unsaved edits; the
  editor's live preview is M10.3) and can show it in another design to
  compare, without changing the choice. Not indexed. A non-member gets the
  workspace's "We couldn't find that wedding", which says nothing about
  whether it exists.
- **The guest's RSVP page wears the published website's design**, built
  class for class from the Stitch "Private Guest RSVP" screens
  (Traditional, Modern Minimal, Royal Elegant), with its cover photo. While
  the website isn't published (never, or taken down) guests see the
  standard RSVP page (Traditional, no photo): nothing from an unpublished
  website reaches them, and a draft change reaches them only on publishing.
  The view also
  gains each ceremony's dress code and the wedding's place. The answers
  read "Attending", "Decline" and "Tentative", as the designs do; they are
  stored as attending, not attending and maybe. Modern's muted grey and tan
  are a shade darker than the export, so their small text passes WCAG AA.
  The designs' own fonts (Plus Jakarta Sans and JetBrains Mono for Modern,
  Cinzel for Royal) are not preloaded, so a page never downloads another
  design's fonts.
- **Left out of the RSVP designs:** the QA state switcher, bottom tab bar,
  travel and stay, dietary requests, resort check-in, venue photo, the
  link's token on the page, and "reach the wedding concierge": none has a
  feature behind it, and the token must never be shown.

## The builder and the public page (2026-11-22)

- **The Wedding Website page is the Stitch builder**: Basics (web address
  with an availability check, couple names, headline, story), Ceremonies
  (read from Events, with "Manage events"), FAQ (add, edit, reorder,
  remove) and Appearance & Styles, a save bar ("Save draft", "Save &
  preview"), and a live preview of the real site in the chosen design with
  unsaved edits, at desktop (drawn at 1024px, so it stays readable) or
  390px. The template names are the builder's: Traditional Serene, Modern
  Minimal, Royal Heritage.
- **Publishing** asks in the design's dialog, showing the readiness checks;
  it saves any unsaved edits first. "Unpublish" asks in its own dialog.
  A live site shows a banner with its address; an archived wedding is
  read-only, and an owner can still unpublish.
- **Changing the address** saves at once with the draft and moves a live
  site; old links keep working (D3).
- **`/w/{slug}`** shows the published site to anyone, moves an old address
  to the current one, and otherwise shows the "not available" design,
  which says the same for every case. Not indexed. Link previews (Open
  Graph) are still to come.
- **Left out of the builder design** (D6, D7): the public "RSVP for
  Celebrations" and "Guest Travel Guide" buttons, the cover motif picker,
  and per-ceremony on/off switches.

## RSVP on the website (2026-11-22)

The owner asked for guests to answer on the website, and for invitation
and reminder emails to take them there. This replaces D7's "no RSVP
button"; the privacy rule behind it stays.

- **The private link opens the website.** Once the website is published,
  a guest's link is `/w/{address}#t=<secret>` (`GuestLinks.url`, from
  `WebsiteService.publishedAddress`): in invitation and reminder emails and
  in the link organizers copy for WhatsApp. While it is a draft, links
  still open `/invitation`.
- **Every design has an RSVP section**, a menu link and an "RSVP for
  celebrations" button. The section takes the secret out of the address at
  once, exchanges it for the guest cookie, and shows that guest's own
  ceremonies to answer, in the website's design, with their reminder
  choice. A return visit, without the link, shows them again.
- **No public RSVP:** a visitor without a link is told to open the one the
  couple sent. There is no lookup by name or phone, so the guest list
  stays private. The guest view now includes the wedding's address, so the
  website shows an invitation only on its own wedding's site.
- **Old links keep working:** a link that opens an unpublished or missing
  website goes on to `/invitation` with its secret; an old address
  redirects to the new one, keeping it.

## The designs follow the RSVP screens (2026-11-22)

The owner found the website designs, built from the "Public Wedding Site"
screens, plain and full of empty space, and pointed to the Stitch RSVP
screens ("Private Guest RSVP — Rajesh Sharma Family", "— Modern Minimal",
"— Royal Elegant") as the look to follow.

- **One layout, three skins** (`components/website/site/themed-site.tsx`,
  `site-skins.ts`), sharing the RSVP page's skins, so the website and its
  RSVP section read as one: cards, ceremony tags ("Function 1 of 6", or
  Modern's "01 / TILAK · MORNING FUNCTION"), When / Where / Attire boxes,
  initials avatars, Modern's monospace labels, Royal's emerald card,
  Cinzel and embossed gold.
- **No empty stretches on wide screens:** the welcome card beside the cover
  photo (or the couple's monogram until there is one), a quick-facts row
  (days to go, celebrations, place), the story beside "At a glance" (the
  ceremonies day by day), ceremony cards two to a row (a card alone on its
  row, or with a livestream, takes the whole row), the RSVP panel and the
  questions two to a row.
- The older "Public Wedding Site" screens remain in `docs/design/` for
  reference; the website no longer follows them.
