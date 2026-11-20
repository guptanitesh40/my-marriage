# 0013 — Vendors

Date: 2026-11-19 · Status: accepted

## Why

Vendor management is milestone M7: a wedding's private directory of
service providers, each linked to any number of its ceremonies (PRD
VEND-01 to VEND-03), from the Stitch screen "Vendors Management — My
Marriage" (`docs/design/vendor-management/`, with each prototype state in
`states/`). The design shows more than the product approves for M7, and
the documents leave a few details open; these are the choices made.

## Decisions

- **Name and category are required; nothing else is.** A vendor may have
  no contact person, phone, email, address, notes or events. Two vendors
  may share a name.
- **The category is free text.** The schema stores a string, so the API
  takes any category up to 60 characters and never rejects an unfamiliar
  one. The form offers the design's list (Photography & Videography,
  Catering, Decoration, Makeup & Styling, Music & DJ, Venue,
  Transportation, Mehendi Artist, Event Coordination) and "Other", which
  lets people type their own; left empty, it is saved as "Other".
- **Contact details are checked lightly.** An email must look like an
  address. A phone number may have a leading `+`, digits, spaces, dots,
  dashes and brackets, with 6 to 15 digits; it is kept as typed, with
  spaces tidied. Limits: name 120, contact 80, phone 30, email 254,
  address 500, notes 4,000 characters.
- **Empty means absent.** Adding a vendor with an empty optional field
  stores nothing for it. When changing one, a field left out stays as it
  is, and `null` or `""` removes it, as for events and tasks.
- **Linked events.** `eventIds` holds at most 50 of the wedding's own,
  non-deleted events, once each. Every ID is checked in the same
  transaction as the write fence; one foreign, deleted or unknown ID
  refuses the whole save (400 on `eventIds`). A change replaces the list,
  and `[]` unlinks them all. When an event is deleted later, its ID stays
  stored on the vendor (nothing is silently lost) but the API no longer
  shows it. Events are listed in the wedding's order, by day and time.
- **One list call; filtering in the browser.** `GET .../vendors` returns
  the whole directory by name (up to 500, with `truncated`), and the page
  searches and filters it, like the Events page. A wedding has dozens of
  vendors, the summary figures need all of them anyway, and this avoids
  adding filter parameters to the agreed API. The filters (`q`,
  `category`, `eventId`, or `none` for vendors with no event) are kept in
  the address. Server-side filters can be added later if directories
  grow.
- **Owners and managers have equal rights** over vendors (PRD permission
  matrix). Archived weddings can be read, not changed.
- **Private.** Vendors are reached only through the wedding's organiser
  routes. No public page or payload includes them. The page says so.

## Deleting a vendor

Added at the owner's request, on the same terms as deleting an event
(decision 0011):

- **Soft delete.** `DELETE .../vendors/{vendorId}` sets `deletedAt` and
  `deletedBy` and keeps the record, with its linked events, so expenses
  (M8) that name the vendor keep their history. A deleted vendor is no
  longer listed, read or changed; deleting it again answers 404. There is
  no restore in the app.
- **Owners only** (403 `OWNER_REQUIRED` for managers), as for events; not
  on an archived wedding. It goes through the write fence.
- **In the app:** "Delete" in the vendor's details drawer, for owners,
  after a confirmation.

## Left out of M7

- **From the design, not built:** Export Directory, Import contacts, the
  grid view toggle, the "Verified" badge and verified-contact count (we
  check nothing; the tile shows vendors with both phone and email
  instead), "Last updated by" (we record when, not who), the contact's job
  title, and the "Cloud Vault" footer.
- **Expenses and payments** (M8). Vendors keep a stable ID for expenses to
  reference.

## Events

A ceremony's "⋮" menu on the Events page gains "View vendors", which
opens the directory filtered to that ceremony. There is no Event Details
page to hold a vendor section yet.
