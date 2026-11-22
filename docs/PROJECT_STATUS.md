# Project status

A running log of what has been built. It records each major feature or
milestone when it lands, newest first, so anyone joining the project can see
where it stands without reading the git history. Decisions and their reasons
belong in `docs/decisions/`; requirements stay in `docs/reference/`.

## Where things stand

| Area                  | State                                                        |
| --------------------- | ------------------------------------------------------------ |
| Repository foundation | Done                                                         |
| Public homepage       | Done (privacy and terms are drafts, pending legal review)    |
| Authentication        | Done (profile editing and session management not started)    |
| Wedding management    | Onboarding steps 1–2 done; ceremony step waits for events    |
| Wedding workspace     | Shell started (M4.1a); switcher and overview next            |
| Events                | Listing, adding, editing and deleting ceremonies (M5.1)      |
| Tasks                 | List, filters, add, edit, quick completion (M6)              |
| Vendors               | Directory, filters, add, details, edit, delete (M7)          |
| Expenses              | Ledger, payments, discounts/extras, reversals, delete (M8)   |
| Guests & RSVP         | Guest list, private links, RSVP, CSV, reminders (M9)         |
| Wedding website       | Builder, three designs, preview, publish, public `/w/` page  |
| Photos                | Albums, uploads, guest QR links, review, gallery, ZIPs (M11) |

Open questions waiting on the owner are listed in
[0002 — Foundation for Phase 1](decisions/0002-phase-1-foundation.md#still-open--needs-the-owner).

## Log

### Photos, guest uploads and gallery (M11) — 2026-11-22

Decisions in [0019](decisions/0019-photos.md); designs in
`docs/design/photos-gallery/`.

- **Photos page** (Stitch "Photos & Albums Workspace"): 5 GB storage,
  photos waiting for review and the website gallery at a glance; albums
  with covers, counts and kind filters; every ceremony has an album, plus
  a General Collection and albums of the couple's own.
- **Uploads**: several photos at once with progress and retry per photo;
  space set aside atomically before upload, so the 5 GB limit holds under
  concurrent uploads; files checked, turned upright and re-encoded without
  metadata by the worker; originals kept privately; abandoned uploads
  give their space back.
- **Guest QR links**: a link and QR code per album and one general link
  (guests choose the album); copy, download, WhatsApp share, new link,
  turn off; email the link to all guests or only those attending. The
  guest page `/u` (Stitch guest upload screens) needs no account.
- **Review**: guests' uploads start Pending; the couple's and managers'
  own uploads are approved at once. Approve or reject one by one,
  selected or all; hide, show again, delete. In an album, select photos (or all) and delete them together. Archived weddings: owners can
  still hide and delete.
- **Website gallery**: approved photos only, in all three designs, while
  published.
- **Downloads**: a photo's original, or a ZIP of approved or all photos,
  a folder per album, kept seven days.
- Still missing: the sidebar storage meter, CloudFront for public images,
  and the AWS production settings (CORS origin, `exports/` expiry rule,
  least-privilege IAM user).

### Wedding website: builder, three designs, public page (M10.2–M10.4) — 2026-11-22

Decisions in [0017](decisions/0017-wedding-website.md#the-builder-and-the-public-page-2026-11-22).

- **The public site in all three designs** (Traditional Serene, Modern
  Minimal, Royal Heritage), from the Stitch screens, on phones and
  desktops: welcome, story, ceremonies with directions, dress code and a
  YouTube livestream that loads only when played, cancelled ceremonies
  marked, and questions.
- **The Wedding Website page is the Stitch builder**: editor tabs (Basics,
  Ceremonies, FAQ, Appearance & Styles), web address with availability
  check, save bar, live preview (desktop and phone), publish and unpublish
  dialogs, live banner, archived mode.
- **Full-page preview** of the saved draft for the wedding's members, with a
  switch to compare designs.
- **`/w/{slug}`**: the published site for anyone; old addresses move to the
  new one; otherwise the "not available" page.
- **The guest's RSVP page follows the website's design**, built from the
  Stitch RSVP screens, with each ceremony's dress code and the wedding's
  place.
- **Guests RSVP on the website**: once it is published, invitation and
  reminder emails (and the WhatsApp link) open the website, where each
  family answers through its private link. Visitors without a link see how
  to answer; nothing about the guest list is public.
- **Cover photo** ([0018](decisions/0018-uploaded-files.md)): uploaded in the
  builder, shrunk in the browser, checked by the API, kept in the one S3
  bucket (or a local folder in development), shown in all three designs
  and on the RSVP page once published.
- Still missing: link previews (Open Graph) for shared addresses, the
  M10.5 hardening pass, and creating the S3 bucket in AWS.

### Wedding website (M10.1) — 2026-11-20

Decisions in [0017](decisions/0017-wedding-website.md); designs in
`docs/design/wedding-website/`.

- **API:**
  - website draft and published copy
  - save with version check, preview, publish and unpublish (owner-only
    once archived)
  - readiness checks
  - public `/public/weddings/{slug}` and its events (allowlisted, not cached)
  - address changes with permanent redirects (`wedding_slugs`)
  - ceremony map link, dress code and YouTube livestream on events
- **Wedding Website page** in the sidebar:
  - draft or live status
  - website address
  - what publishing needs
  - the three-template picker (saves the draft only)
- Still missing (at the time): the three designs and preview (built in
  M10.2, above), the editor (M10.3), publishing and `/w/{slug}` (M10.4)

### Guest reminders — 2026-11-20

Decisions in [0016](decisions/0016-guest-reminders.md).

- **Send reminder** on the Guests page: everyone invited, about all upcoming
  ceremonies or one, with an optional note. A preview shows how many
  families will get it and who is left out and why (no email, invitation
  not shared, link off, reminders turned off), and the emails left today.
- **Send reminder** in a guest's details, with the last reminder's status.
- **Automatic reminders** (off until switched on): 30, 7 and/or 3 days
  before each ceremony, at 9:00 am in its time zone, checked by the worker
  every 15 minutes, never twice, following moved dates.
- **Reminder email**: the invitation card with each ceremony, the guest's
  current answer, the couple's note and the private link.
- **Guest opt-out** on the invitation page, linked from every reminder.
- Still missing: per-ceremony automatic settings, reminder history beyond
  the last one, and WhatsApp reminders (no API).

### Guests & RSVP (M9) — 2026-11-20

From the Stitch "Guests & RSVP" designs (organizer desktop and mobile, and
the guest's private RSVP page). Decisions in
[0015](decisions/0015-guests-rsvp.md).

- **Guests & RSVP page** at `/weddings/{weddingId}/guests`, from the
  sidebar:
  - totals that keep contacts, invited people (each family once),
    ceremony answers and confirmed people per ceremony apart
  - search by name, email or phone; filters by ceremony, RSVP (or not
    invited yet) and invitation status; sorting; 50 per page; cards on
    phones
  - a row per family: party size, contact, ceremonies, each ceremony's
    answer (e.g. Haldi 3/5) and the invitation status
- **Add and edit** in the drawer: name, party size (counter), email, phone,
  private notes, and ceremonies to invite to with their dates and venues.
  Lowering the party size below an answer is refused, naming the ceremony.
- **Details**: each ceremony's answer with its earlier answers, ceremonies
  not invited to, and the private invitation: copy the link, share it on
  WhatsApp by hand, send or resend the email (queued / sent / failed, never
  "delivered"), replace or turn off the link. Owners can remove a guest.
- **The guest's page** at `/invitation`: opened from the private link with
  no account; the secret is removed from the address and exchanged for a
  guest cookie. Only their ceremonies, each with Attending (1 to party
  size), Not attending or Maybe; one Save; saved answers on return; clear
  states for a changed-elsewhere conflict, a failed save, a closed or
  cancelled ceremony, an archived wedding and an unavailable link.
- **Import** (CSV, previewed row by row with duplicate warnings) and
  **export** (CSV, with a privacy warning).
- **API:** guests (`GET`, `POST`, `GET`/`PATCH`/`DELETE` on one), invitations
  (`GET`, `PUT`), links (create/reissue, revoke), invitation email, import
  preview and commit, and guest access (exchange, invitation, RSVP,
  logout). Migration `0010-guest-indexes`; new setting `GUEST_LINK_SECRET`
  (required in production).
- **Tests:**
  - API integration tests: contacts and validation, totals, the private
    link (only a hash stored, same link until reissued), the guest's view
    (only their ceremonies, nothing private), per-ceremony answers, party
    size limits, version conflicts, unselected, cancelled and deleted
    ceremonies, reissue and revoke, removal, party-size conflicts, the
    invitation email through the worker (no link in the queue), import,
    isolation, archived weddings, and a trace check that no link or guest
    cookie is logged
  - web unit tests for CSV, filters, labels, input and the RSVP form
  - browser tests at three widths (axe), the family journey (invite, open
    the link on a phone, answer 3 of 5 and 5 of 5, totals, conflict,
    replace link), CSV import, and another person's wedding
- **Not done yet:**
  - email reminders at 30, 7 and 3 days, and the guest's opt-out
  - XLSX import/export (needs a new dependency) and asynchronous exports
  - an audit log of organizer edits

### Expenses (M8) — 2026-11-20

From the Stitch "Expenses Management" designs (desktop and mobile), with
the owner's addition of discounts and extras agreed after the deal.
Decisions in [0014](decisions/0014-expenses.md).

- **Expenses page** at `/weddings/{weddingId}/expenses`, from the sidebar:
  - totals from the real ledger: recorded (what is owed), paid with a bar,
    outstanding with how many are overdue, and savings from negotiated
    discounts (with extras paid)
  - search; filters by category, event (or General; an expense can cover
    several), vendor (or No vendor) and status (unpaid, partially paid, overdue, paid); sorting.
    Kept in the address.
  - a row per expense with owed (and the agreed amount when it changed),
    paid, outstanding, status with icon and words, and due date; cards on
    phones
- **Details** in a wider drawer: owed / paid / outstanding, the agreed
  amount with discounts and extras, status, due date, notes, linked event
  and vendor (or "no longer available"), and the whole history.
- **Ledger actions** in dialogs: Record payment (never more than is
  outstanding; method optional), Discount or extra (with 5% and 10% of the
  agreed amount as shortcuts, and what's owed before and after), and
  Reverse (shows the effect; the original stays in the history). Paid in
  full disables Record payment until an extra is recorded.
- **Add and edit** in the drawer: name, category ("Other" names its own),
  agreed amount in ₹, events (tick every ceremony it covers), vendor, due
  date, notes. The agreed amount
  can't drop below what has been paid.
- **Delete** (owners only) from the details, after a confirmation. The
  expense and its history are kept, marked deleted; it leaves the totals.
- **Links in:** each ceremony's "⋮" menu has "View expenses"; a vendor's
  details link to its expenses.
- **States:** a first-time empty state without totals, a no-results state,
  loading placeholders, a retryable error, and read-only for archived
  weddings.
- **API:**
  - `GET`, `POST /weddings/{weddingId}/expenses`; `GET`, `PATCH` on one;
    `GET .../expenses-summary`
  - `GET`, `POST .../payments`; `POST .../adjustments`;
    `POST .../payments/reverse`; `DELETE` on one (soft, owners only)
  - migration `0009-expense-events`: an expense covers several events
  - every ledger entry is written with the expense's totals and the write
    fence in one transaction; migration `0008-expense-indexes`
- **Tests:**
  - API integration tests: required fields and paise, links of the same
    wedding, deleted links kept, several payments, overpayment, future
    dates, simultaneous payments, discounts and extras, reversals (once,
    not of a reversal, not of a paid extra, not across expenses), editing
    limits, sorting and totals, isolation, archived weddings, and the trace
  - web unit tests for money parsing and formatting, filters, form checks,
    the form, the details and the three dialogs
  - browser tests at three widths (axe), the full journey (add, pay,
    overpay refused, 10% discount, reversal, bonus, edit limit, totals,
    filters, Events → expenses), phone cards and dialogs, and another
    person's wedding
- **Not done yet:**
  - receipt uploads (need private S3 uploads)
  - restoring a deleted expense, an audit trail of detail edits, export
  - expense totals on the Overview page

### Vendors (M7) — 2026-11-19

From the Stitch "Vendors Management" design. Decisions in
[0013](decisions/0013-vendors.md).

- **Vendors page** at `/weddings/{weddingId}/vendors`, from the sidebar:
  - summary tiles from the real directory: total and categories, vendors
    at two or more ceremonies, vendors with phone and email, vendors with
    no ceremony
  - search by name, category, contact, phone or email; filters by
    category and by ceremony (or "Not linked to an event"), kept in the
    address
  - a row per vendor: initials, name, category, contact person, phone and
    email (as links), and up to three ceremonies with "+N more"; cards on
    phones. Missing details say "Not added".
- **Details** in the right-hand drawer: contact with copy buttons,
  assigned ceremonies with their dates, private notes, address, and Edit.
- **Add and edit** in the drawer: name and category (required; "Other"
  takes a category of its own), contact person, phone, email, address,
  ceremonies as tick-chips, and private notes. Editing can replace or
  remove every ceremony.
- **Delete** (owners only), from the details drawer after a
  confirmation. The record is kept, marked deleted, so future expenses
  keep their history.
- **Events page:** each ceremony's "⋮" menu has "View vendors".
- **States:** a first-time empty state, a no-results state with "Clear all
  filters", loading placeholders, a recoverable error, and read-only for
  archived weddings.
- **API:**
  - `GET`, `POST /weddings/{weddingId}/vendors`; `GET`, `PATCH`,
    `DELETE` (soft, owners only) on one
  - linked events are checked to be the wedding's own, in the same
    transaction as the write fence; migration `0007-vendor-indexes`
- **Tests:**
  - API integration tests: required fields, optional and empty fields,
    email and phone checks, several events once each, foreign, deleted or
    unknown events, editing and unlinking events, managers, anonymous
    visitors, another wedding's vendors by either ID, removed managers,
    archived weddings, soft delete (owners only), and the trace
  - web unit tests for the filters, figures, form checks, the form and the
    directory
  - browser tests at three widths (axe), the add/view/edit/filter journey,
    phone cards and keyboard use, Events → vendors, and another person's
    wedding
- **Not done yet:**
  - restoring a deleted vendor
  - export and import, and vendors on an Event Details page (no such page
    yet)
  - linking vendors to expenses (M8)

### Tasks (M6) — 2026-11-19

From the Stitch "Tasks Management" design. Decisions in
[0012](decisions/0012-tasks.md).

- **Tasks page** at `/weddings/{weddingId}/tasks`, from the sidebar:
  - summary tiles with the wedding's real counts
  - search; All, My Tasks, Overdue and Completed views; filters by event
    (or General), status, priority and assignee (or Unassigned); sorting.
    All are kept in the address and done by the server.
  - rows showing the ceremony, assignee, due date (overdue in red), and
    priority or status, as cards on phones
  - a circle to complete or reopen a task in one click
- **Add and edit** in the right-hand drawer: name, description, event,
  assignee (active owners and managers only), due date and optional time
  (India time), priority (Medium by default) and status (To Do by
  default). Completing records when and by whom.
- **Events page, redesigned to the Stitch layout:** summary tiles, search
  and All / Upcoming / Completed tabs, and on each ceremony its tasks done
  and overdue (a link to them), "Manage" and a "⋮" menu (View tasks,
  Delete for owners).
- **States:** a first-time empty state, a no-results state with "Clear all
  filters", loading placeholders, a recoverable error, and read-only for
  archived weddings.
- **API:**
  - `GET`, `POST /weddings/{weddingId}/tasks`, `PATCH` on one
  - `GET /weddings/{weddingId}/members`
  - every write checks the event and assignee belong to the wedding, in
    the same transaction as the write fence
- **Tests:**
  - API integration tests: roles, isolation, foreign or deleted events,
    removed or foreign assignees, validation, statuses and completion
    details, views, filters, search, sorting, counts, archived weddings
    and the trace
  - web unit tests for the filters, due dates, form and quick completion
  - browser tests at three widths (axe), the add/edit/complete/filter
    journey, keyboard use on a phone, and another person's wedding
- **Not done yet:**
  - the Event Details "Tasks" section (no Event Details page yet)
  - task counts on the Overview page
  - export, task reminders, removing members (and unassigning their tasks)
  - deleting tasks (Cancelled is used instead)

### Events: listing, adding, editing and deleting ceremonies (M5.1) — 2026-11-19

The first wedding-management module, from the Stitch "Events Management"
design. Decisions in [0010](decisions/0010-events.md) and
[0011](decisions/0011-event-edit-delete.md).

- **Events page** at `/weddings/{weddingId}/events`, from the sidebar. It
  lists the wedding's ceremonies by day and time; those without a day come
  last. Each card shows its day number, when (in the event's time zone),
  status, venue and description, and what is still to decide ("Date not
  set", "Venue not set").
- **Add a ceremony** from a drawer on the right (full width on phones):
  - presets Haldi, Mehendi, Sangeet, Garba, Wedding and Reception, or any
    name
  - optional date, start time, time zone (India unless changed), venue,
    address and a public description
  - the list updates after saving, without a reload
- **Edit** from each card: the same drawer, filled in, with a status
  (scheduled, completed, cancelled). Clearing a field removes it.
- **Delete** from each card, for owners only, after a confirmation. The
  record stays in the database, marked deleted, and is no longer shown.
- **First visit:** an empty state with "Add first ceremony". On an
  archived wedding the page is read-only.
- **API:**
  - `GET` and `POST /weddings/{weddingId}/events`, and `PATCH` on one, for
    the wedding's owners and managers; 404 to anyone else, and 409
    `WEDDING_ARCHIVED` for an archived wedding
  - `DELETE` on one, for owners only: a soft delete (`deletedAt`,
    `deletedBy`)
  - the day and time are sent as local values and stored with the UTC
    instant (a schema addition, `startDate`)
- **Tests:**
  - API integration tests for isolation, roles, archived weddings
    (including an archive at the same moment), rollback, validation, time
    zones and order
  - time-zone unit tests, including daylight saving
  - web unit tests for the form, the card and the sidebar
  - browser tests at three widths (axe), keyboard use and another
    person's wedding
- **Not done yet:**
  - restoring a deleted event (the record is kept, so it can come later)
  - end time, dress code, maps link, managers, livestream
  - the timeline
  - audit events

### Wedding workspace (M4.1a) — 2026-11-19

The signed-in workspace around each wedding, from the Stitch "Workspace
Handoff" and "Wedding Overview" designs. Decisions in
[0009](decisions/0009-wedding-workspace.md).

- **Each wedding has its own address,** `/weddings/{weddingId}`.
  `/dashboard`, where every "Go to your dashboard" leads, opens your own
  active wedding, or else the newest you belong to; without a wedding it
  still leads to onboarding.
- **The shell:** on large screens, a sidebar with the wedding and your role
  (owner or manager), the workspace sections and your account with
  sign-out. A top bar names the wedding, and shows "Archived" or "Deletion
  pending" when it applies. Sections not built yet are listed as "Soon",
  without links.
- **The overview** welcomes you by name and says which wedding this is,
  where and when. Nothing on it is invented: planning summaries arrive
  with their features.
- **Not yours, not found:** another wedding's address, or one that is not a
  wedding, shows "We couldn't find that wedding" and never says whether it
  exists. Signed out, a workspace address asks you to sign in and comes
  back.
- **API:** `GET /weddings/{weddingId}`, the wedding with your role in any
  status; 404 to anyone who is not a member.
- **Tests:** API integration tests for members, managers, archived
  weddings, removed members and malformed IDs; web unit tests for the
  shell and the choice of wedding; browser tests at three widths (axe), for
  another person's wedding and for signing in again.
- **Not done yet:**
  - collapsing the sidebar and the phone drawer (M4.1b)
  - the wedding switcher and the archived-wedding banner (M4.2)
  - the dashboard summary, countdown and storage (M4.3)
  - the getting-started checklist (M4.4)

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
