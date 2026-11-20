# 0015 — Guests, private invitation links and RSVP

Date: 2026-11-20 · Status: accepted

## Why

Guest management and RSVP is milestone M9 (PRD GUEST-01 to GUEST-07,
INV-01 to INV-10), from the approved Stitch screens "Guests & RSVP
Management", "Guest RSVP" and "Guests & RSVP (Mobile)", exported to
`docs/design/guest-management-rsvp/`. It adds the first page used by people
who are not organizers: an invited family answers through a private link,
with no account.

## The model

- **One contact per family or group** (`guest_contacts`): a name, one
  `partySize` (1–100) for every ceremony, optional email and phone, private
  notes. Removing a guest (owners only, as for events, vendors and
  expenses) keeps the record with `status: removed` and stops its links.
- **One invitation per guest and ceremony** (`event_invitations`) with its
  current RSVP: pending, attending (1 to party size), not attending (0) or
  maybe (an optional count, never confirmed). Unselecting a ceremony sets
  `isInvited: false` and keeps the answer, which comes back if it is
  selected again. Earlier answers are kept on the invitation, the last 20
  (PRD INV-04, "basic change history"), shown to organizers.
- **Totals never mix units** (PRD GUEST-04): contacts; invited people, each
  family counted once across the wedding (party sizes of guests invited to
  at least one ceremony); ceremony answers vs pending; and confirmed people
  per ceremony (attending counts only). Deleted events are left out;
  cancelled ones are not counted as answered or pending.
- **Party size changes** (schema document §6.4): lowering it below an
  answer already given for an open ceremony is refused with 409
  `PARTY_SIZE_CONFLICT` naming the ceremonies. Nothing is clamped.

## Private links

- A link is a bearer credential (PRD INV-02): whoever holds it can see and
  change that family's answers. The page says so; it never claims to have
  verified anyone.
- **The secret is derived, not stored.** `invitation_tokens` keeps only
  `sha256` of it. The secret itself is `HMAC-SHA-256(GUEST_LINK_SECRET,
"guest-link:" + tokenId)`, so organizers can copy the same link again
  and the email worker can rebuild it at send time, without the secret ever
  being stored in the database or the outbox (the schema document's
  "short-lived encrypted outbox material" is not needed). A leaked database
  alone does not reveal links. `GUEST_LINK_SECRET` (32+ characters) is
  required in production; development and tests fall back to a fixed,
  public value. Changing it invalidates every link.
- One active link per guest. **Replace link** revokes it (and every browser
  session it opened) and creates a new one; **Turn off link** only revokes.
  No expiry: a link works until revoked or the guest is removed.
- The link is `/invitation#t=<secret>`. The secret is after `#`, so
  browsers never send it to a server or in a Referer; the page removes it
  from the address at once and exchanges it (`POST /guest-access/exchange`)
  for the `mm_guest_session` cookie (HttpOnly, SameSite=Lax, 30 days,
  stored hashed in `guest_sessions`). The page sets no-referrer and noindex
  and shows no guest name in its title.
- In API responses the link is `secretUrl`, so request traces mask it; a
  tracing test checks that neither the link nor the guest cookie is logged.

## RSVP writes

`PATCH /guest-access/events/{invitationId}/rsvp` runs in one transaction:
the archive write fence (schema document §6.3), the guest still active,
the link still active, the invitation still selected and the guest's own,
the ceremony neither deleted nor cancelled (409 `RSVP_CLOSED`), the count
within the current party size, and `responseVersion` matching (409
`RSVP_VERSION_CONFLICT` otherwise; never overwritten). Because organizer
changes raise the same fence, an RSVP and a party-size change or link
revocation can never both act on stale data. RSVP changes are rate limited
per guest session, link opening per IP.

## Invitation email and WhatsApp

- `POST .../invitation-email` needs an email address and at least one open
  ceremony; it creates the link if needed and queues a `guest_invite`
  email. The worker writes it (`GuestInviteComposer`) with the rebuilt link,
  and does not send it if the guest was removed, the address changed, the
  wedding was archived or no link is active.
- Status shown: queued, sent (accepted by the mail server) or failed.
  **Never "delivered"**: Gmail SMTP gives no delivery evidence (PRD INV-08).
- WhatsApp is a manual share: a `wa.me` link with a prefilled message and
  the private link, opened by the organizer. Nothing is sent automatically.

## Import and export

- **Import** is CSV, read in the browser (columns found by heading: Name,
  Party size, Email, Phone, Notes, Ceremonies separated by semicolons and
  matched to the wedding's events by name). `import/preview` checks every
  row and flags possible duplicates (same email, or same name ignoring case
  and spacing, on the list or earlier in the file); `import/commit` checks
  again and imports the passing rows in one transaction, skipping
  duplicates if asked. Up to 1,000 rows.
- **Export** is CSV, built in the browser from the loaded list after a
  warning that it holds private data; cells starting with `=`, `+`, `-` or
  `@` are defused for spreadsheets. The API's asynchronous export routes
  (with S3 links) are not built.
- **XLSX** is not supported yet: it needs a spreadsheet library, a new
  dependency to approve. The import asks for CSV ("Save as CSV").

## Left out of M9

- Email reminders at 30, 7 and 3 days (PRD INV-07) and the guest's reminder
  opt-out: they need scheduled worker jobs, a slice of their own (since
  built: decision 0016).
- XLSX import and export; asynchronous exports.
- An audit log of organizer edits beyond the RSVP history.
- From the design: the "verified" tick by the guest's name (it implied
  identity checks), relationship labels, "Live sync", and the Stitch mobile
  tab bar.
