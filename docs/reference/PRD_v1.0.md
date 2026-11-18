# MY MARRIAGE

## Product Requirements Document (PRD)

**Version:** 1.0  
**Date:** 5 November 2026  
**Status:** Baseline for MVP design and implementation  
**Product name:** My Marriage (working title)  
**Primary market:** India  
**Launch model:** Free pilot with friends and family  
**Language:** English  
**Platform:** Responsive web application

> **Product promise:** Plan, coordinate, celebrate, and preserve an Indian wedding in one place - without forcing guests to create accounts.

\newpage

# 1. Executive summary

My Marriage is a wedding-management web platform for people in India coordinating their own wedding. It combines a private planning workspace for the couple and trusted managers with a public wedding website for guests and visitors. A wedding is organized into ceremonies such as Haldi, Mehendi, Sangeet, Wedding and Reception, with separate event schedules, tasks, expenses, invitees, RSVP responses, and photo albums.

The MVP prioritizes everyday coordination: who owns a task, where an event takes place, what has been paid, how many guests are attending, what guests need to know, and how to collect photos after each ceremony. The product is free during the initial pilot, with a 5 GB storage allowance per wedding.

**Approved direction.** Users can own one active wedding at a time; they may simultaneously be managers on multiple other weddings. Once an owner archives a wedding, its administrative workspace becomes read-only and the owner can create another wedding. Public wedding events and approved photos remain viewable. Personalized invitation and RSVP information is accessible to anyone possessing its unique private link - there is no guest login or identity verification in the MVP.

**Business goal.** Validate whether a unified, simple workflow is more useful to Indian couples and families than using separate spreadsheets, messaging threads, invitations and photo-sharing tools.

## 1.1 Goals

1. Enable a couple to set up and organize a wedding quickly without requiring both owners to join at the same time.
2. Let owners and managers coordinate multiple ceremonies, tasks, vendors and expenses from one workspace.
3. Support event-specific guest invitations with one primary contact and a consistent invited party size across invited events.
4. Provide per-event RSVP confirmation and accurate **attending-person** totals, not just invited-contact totals.
5. Publish a public wedding website with three templates, schedules, venue directions, galleries and optional livestream links.
6. Collect event-specific guest photographs through QR or private upload links without guest authentication, with moderation and a 5 GB wedding quota.
7. Make the experience usable on mobile browsers by non-technical family members.

## 1.2 Non-goals for MVP

No vendor marketplace, integrated payment collection, advanced budgets, AI wedding planner, internal chat, seating charts, QR arrival check-in, automated WhatsApp API messaging, guest video uploads, custom livestream infrastructure, native mobile apps, multilingual support, or professional-planner billing features. These may be evaluated after the pilot, but are **not** acceptance requirements for V1.

## 1.3 Users and access contexts

| Persona | Primary job | Access |
|---|---|---|
| Wedding owner | Set up the wedding, manage all plans, publish the website, archive wedding | Full control within owned wedding |
| Second wedding owner | Collaborate as an equal co-owner after accepting invitation | Same full control |
| Wedding manager | Coordinate events, tasks, guests, expenses, content and photos | Broad operational access; no ownership, archive or delete actions |
| Primary guest contact | Receive one invitation representing a group; RSVP for selected events | Public site plus capability-token invitation link; no account |
| Public visitor | View published wedding information and approved photographs | Public content only |
| Guest photo contributor | Upload images to an event album without signing in | Upload via QR/link; no other management rights |

# 2. Scope, language and business definitions

**Wedding workspace:** private organizer application and its data. **Wedding website:** guest-facing public pages, published by an owner or manager. **Wedding:** a top-level planning container belonging to one or two co-owners. **Event:** a ceremony/function within a wedding. **Manager:** an authenticated user authorized to operate that wedding. **Primary guest contact:** one invitee record optionally representing multiple attending people. **Party size:** one number stored on that guest record, applied to every selected event. **Event invitation:** association between a guest contact and a ceremony. **RSVP:** the contact's response and attending count for one invited event. **Private invitation link:** a high-entropy bearer link that authorizes viewing/editing the guest's invitation; possession, rather than identity, controls access.

The first release targets Indian weddings and uses English UI, Indian date/time display where appropriate, INR expenses, and the **Asia/Kolkata** timezone as the initial event/reminder default. Event date-times are stored unambiguously, with the event timezone retained. Weddings may be created before all dates and venues are finalized.

## 2.1 Core product principles

- **Easy first, detailed later:** require few onboarding fields; progressively complete missing information.
- **Ceremony-centric:** invitations, RSVP, tasks, expenses, schedules and photos can all connect to a ceremony.
- **Public is not private:** publicly visible event data must never carry organizer-only records or guest identity data.
- **No guest account:** guests can RSVP and contribute photos without a username or password.
- **Owner isolation:** data belonging to one wedding is never accessible through another wedding's membership.
- **Mobile first:** essential workflows must work comfortably on a smartphone.

# 3. Permissions and wedding lifecycle

## 3.1 Permission matrix

| Action | Owner | Manager | Guest / public |
|---|:---:|:---:|:---:|
| View/edit planning workspace | Yes | Yes | No |
| Manage events and timelines | Yes | Yes | No |
| Manage/assign tasks | Yes | Yes | No |
| Manage vendors and expenses | Yes | Yes | No |
| Manage guests, invitations and RSVPs | Yes | Yes | Own invitation only via link |
| Edit/publish wedding website | Yes | Yes | No |
| Approve/remove photos | Yes | Yes | No |
| Upload photos | Yes | Yes | Yes, through upload link |
| Add/remove managers | Yes | Yes | No |
| Appoint/remove owners; transfer ownership | Protected owner action | No | No |
| Archive, reopen or delete wedding | Owner only | No | No |

**Protected ownership rules:** The first creator becomes owner immediately. A second owner joins through invitation, but the pending invitation does not block planning or website publication. A wedding must retain at least one owner. Managers may not remove an owner or elevate themselves to owner. Ownership transfers/removals require a confirmed owner action and a separate implementation-level security review.

## 3.2 Lifecycle states

- **Active wedding:** editable; tasks, invitations, RSVPs, reminders and photo uploads can operate.
- **Archived wedding:** organizer planning data is read-only; no new RSVPs, uploads, invitations or scheduled reminders. Public pages and approved photos remain viewable if the site is published. Owners retain limited safety controls to unpublish the site, hide/remove public photos, or request deletion.
- **Website draft / published:** a separate publication state independent of whether the wedding is active. New weddings start unpublished.
- **Event scheduled / completed / cancelled:** ceremony state. Cancellation hides invitation action and stops future related reminders, but organizers retain a historical record.

**One-active-owned-wedding invariant:** A user cannot create or accept co-ownership of a second active wedding while they already own an active wedding; the product must explain the conflict and offer the path to archive the first wedding or decline the new ownership invitation. Being a manager on other active weddings does not count toward this limit. This constraint must be enforced in backend transactions to avoid races.

**Archiving behavior:** An owner explicitly confirms archive (not automatic on event date). Pending invitation and reminder jobs are stopped. Historical expenses, tasks, guest lists and responses stay accessible to authorized members in read-only form. Owners can unpublish the site, hide/remove public photos, or request deletion as privacy/safety exceptions to read-only planning; otherwise the published site/galleries remain accessible. A new wedding can then be created. Reopening an archive is not an MVP workflow; it must be treated as a future administrative capability if needed.

# 4. End-to-end journeys

## J1 - Create and plan a wedding

1. User registers, verifies email and signs in.
2. User creates a wedding with couple names and city; date and venue may be tentative.
3. User is registered as first owner and is prompted to email an invitation to the second owner.
4. Dashboard becomes usable immediately even when the second owner has not joined.
5. Owner creates ceremonies, adds managers, tasks, vendors and expenses.
6. Owner previews the public website and publishes when ready.

**Outcome:** planning begins before all details or the co-owner account are finalized.

## J2 - Invite a contact representing multiple people

1. Manager creates contact "Rajesh Sharma", party size **5**, and an optional email/phone.
2. Manager selects Haldi and Wedding but does not select Reception.
3. Invitation uses the same invited headcount of **5** for Haldi and Wedding.
4. Guest receives an email or the manager manually sends their personalized link via WhatsApp.
5. Guest chooses "Attending 3" for Haldi and "Attending 5" for Wedding; Reception is not available for RSVP.
6. Dashboard shows **3** and **5** confirmed people, not two attending contacts.
7. The same link may be used later to change those responses while the wedding is active.

**Outcome:** accurate ceremony-level counts without collecting every family member's name.

## J3 - Share photographs after an event

1. Owner/manager generates an event-specific QR code for Mehendi.
2. Guest scans, chooses image files, enters an optional display name, and uploads without login.
3. Valid files are stored under the Mehendi album in **pending** moderation status.
4. Owner/manager reviews and approves images; approved photos then appear publicly.
5. If the wedding reaches 5 GB, uploads are blocked with a useful message and admins see usage.

**Outcome:** smooth collection with controls to avoid unwanted public content.

## J4 - Close and start another wedding

1. Owner reviews the archive warning and confirms archival.
2. Workspace is locked read-only; automatic reminders and writable public actions stop.
3. Published wedding website and approved photo gallery remain accessible.
4. Owner creates a new active wedding; archived one stays listed for historical access.

# 5. Detailed functional requirements

Requirements are identified using stable IDs for implementation and QA traceability. **MUST** means required for MVP. Optional fields and suggested default values are called out where appropriate.

## 5.1 AUTH - Authentication and profile

**AUTH-01 - Account creation (MUST).** Users register with unique email and password; show validation errors for invalid email, weak passwords and duplicate accounts. Display consent/privacy notices at signup.

**AUTH-02 - Email verification (MUST).** Send a verification email with expiring single-use link; allow a resend with abuse controls. Limit sensitive operations until verification is complete.

**AUTH-03 - Login/session/logout (MUST).** Provide secure login, persistent authenticated session with expiration, logout and clear invalid-credential handling. Session cookies must be secure and protected from cross-site request forgery where applicable.

**AUTH-04 - Password reset (MUST).** Support expiring, single-use password reset links; never reveal whether an email exists through an easily enumerable public response.

**AUTH-05 - User profile (MUST).** Users may update display name, profile photo (optional) and password. Email change requires re-verification.

**AUTH-06 - Wedding switcher (MUST).** A signed-in user can view their one active owned wedding, archived owned weddings and weddings where they are a manager; manager membership is not subject to the ownership limit.

**Acceptance:** a new verified user can authenticate and create a wedding; an unauthenticated browser cannot access organizer pages; expired/reused tokens fail safely.

## 5.2 WED - Wedding creation and lifecycle

**WED-01 - Create wedding (MUST).** Required: bride name, groom name, city/state. Date, main venue, story/description and cover photo are optional at creation; records may be updated later.

**WED-02 - Invitation to co-owner (MUST).** Allow inviting the second owner by email; show pending/accepted/expired or revoked status. Planner access begins immediately for the first owner.

**WED-03 - Active ownership limit (MUST).** A user may own only one active wedding; acceptances that would violate this are rejected with clear recovery messaging. Manager roles in other weddings remain permitted.

**WED-04 - Manage basic details (MUST).** Owners/managers update wedding title, names, city, tentative/final dates, description, photos and venue details, with modification timestamps.

**WED-05 - Archive wedding (MUST).** Only an owner can archive, after a confirmation that explains read-only effects. Record archive timestamp and actor, stop future reminders, disable RSVP/upload mutations, and release the owner's active-wedding slot.

**WED-06 - Archived access (MUST).** Archived planning records remain readable to authorized members; private records stay private. Published site and approved photos remain viewable, within retention/availability policy, unless an owner uses an explicit safety control to unpublish, hide media or delete.

**WED-07 - Wedding deletion (MUST, owner-controlled).** Provide a destructive removal request with explicit confirmation and documented handling of associated records/media. Exact deletion grace period is an implementation policy to approve before launch, not a user-facing promise in V1.

**Acceptance:** attempts by managers to archive or delete are denied on both frontend and backend; an owner can create another wedding after archiving the previous one.

## 5.3 TEAM - Co-owner and manager management

**TEAM-01 - Invite managers (MUST).** An owner or manager can invite a user by email to join the current wedding as manager; invite acceptance creates wedding-scoped membership.

**TEAM-02 - Manage managers (MUST).** Owners/managers can list, revoke or remove manager access. The affected user must immediately lose permission after membership revocation.

**TEAM-03 - Protected owner privileges (MUST).** Managers cannot change co-owner identity, ownership or wedding archive/delete state. Never allow a wedding to have zero owners.

**TEAM-04 - Role-aware screens (MUST).** Hide unauthorized controls in UI, and independently enforce permissions on every API/resource operation.

**TEAM-05 - Member activity (MUST).** Capture actor, timestamp and action for ownership, membership, publication, expense and guest-invitation changes.

**Acceptance:** a manager on Wedding A cannot access Wedding B data by changing URL or ID; removing a manager immediately invalidates protected access.

## 5.4 EVT - Ceremonies and day-of schedules

**EVT-01 - Add ceremony (MUST).** Offer optional presets (Haldi, Mehendi, Sangeet, Garba, Wedding, Reception) and custom name. Do not limit ceremony types or require a fixed ordering.

**EVT-02 - Event attributes (MUST).** Store title, optional description, date/time, timezone, venue name, location/address, Google Maps URL, dress code (optional), status and associated manager(s). Date/time and venue may be incomplete until publication, with incomplete-data warnings.

**EVT-03 - Manage multiple venues/dates (MUST).** Every event has independent logistics; multiple events may overlap or occur on the same day.

**EVT-04 - Event timeline (MUST).** Create ordered schedule entries with time, title, optional description and responsible person. Display hour-by-hour agenda on the organizer side and publish the event schedule publicly.

**EVT-05 - Event relationship (MUST).** Events can relate to tasks, vendor assignments, expenses, invitations, RSVPs, photos and livestream links.

**EVT-06 - Update/cancel event (MUST).** Allow editing, mark event completed/cancelled, and recalculate or stop related reminders when dates change or an event is cancelled. Prevent sending invitation reminders for cancelled events.

**EVT-07 - Public listing (MUST).** All wedding events are eligible for the public published site, regardless of invitation eligibility. Private guest details and RSVP controls remain restricted to invitation links.

**Acceptance:** two overlapping ceremonies with different venues retain separate invitations and counts; cancelling one stops its future reminders but does not erase unrelated event data.

## 5.5 DASH - Organizer dashboard

**DASH-01 (MUST).** Show wedding countdown (when a date is known), event summary, upcoming ceremonies, open/overdue tasks, total recorded expenses, total paid/outstanding, invited contacts and per-event confirmed attendee counts.

**DASH-02 (MUST).** Provide shortcuts to create an event, task, expense, guest and invitation; show clear empty states and onboarding steps for a newly created wedding.

**DASH-03 (MUST).** Dashboard statistics derive from source data and refresh after updates; label ambiguous totals (contacts vs people) clearly.

**Acceptance:** an RSVP increase from 3 to 5 attendees updates the relevant event count without increasing the number of contacts.

## 5.6 TASK - Task planning

**TASK-01 (MUST).** Create/edit task with title, details, linked event (optional), due date/time (optional), priority, one assigned owner/manager (optional), and status.

**TASK-02 (MUST).** Supported statuses: To Do, In Progress, Completed, Cancelled. Completed tasks preserve completion date and actor.

**TASK-03 (MUST).** Provide list views and filters for My Tasks, All, By Event, Overdue and Completed; sorting by due date and priority.

**TASK-04 (MUST).** Tasks may be reassigned; removed members must not retain assignment or access. Show unassigned tasks distinctly.

**TASK-05 (MUST).** Restrict task assignment to active owner/manager members of that wedding. No guest task accounts.

**Acceptance:** only authorized members can change status; task due date and event filtering work independently; a manager can see tasks assigned to them across their accessible weddings via the wedding switcher.

## 5.7 VEND - Vendor directory

**VEND-01 (MUST).** Organizers create vendor records with name, category/service, contact name (optional), phone, email, notes and optional address.

**VEND-02 (MUST).** Associate a vendor with one or more events and expenses. A vendor record is internal and never exposed by default on the public wedding website.

**VEND-03 (MUST).** Search and filter by category/event; permit edits while the wedding is active.

**Acceptance:** one photographer can be linked to both Sangeet and Wedding without duplicate vendor records.

## 5.8 EXP - Simple expenses and payment tracking

**EXP-01 (MUST).** Create expense with title, category, INR total, event (optional), linked vendor (optional), notes, optional due date and optional receipt image/file.

**EXP-02 (MUST).** Record multiple payments per expense; each payment stores amount, paid date, optional method and note. Display `paid = sum(payments)` and `outstanding = total - paid`.

**EXP-03 (MUST).** Reject negative amounts and payments greater than the expense's remaining amount unless an authorized explicit adjustment is recorded. Maintain an audit trail for changes.

**EXP-04 (MUST).** Filter expenses by category, event, vendor and outstanding status. Provide simple totals only; no complex budgets or forecasting.

**EXP-05 (MUST).** If an associated event/vendor is removed, preserve historical expense records and handle references without silent deletion.

**Acceptance:** an INR 80,000 expense with INR 30,000 in payments displays INR 50,000 outstanding; totals equal sum of expense and payment records.

## 5.9 GUEST - Guest contacts and headcount

**GUEST-01 (MUST).** Create a primary guest contact with name, **party size >= 1**, optional email and optional phone/WhatsApp number; provide organizer-only notes. An email is necessary for email delivery, but manually shared links may be used when no email is provided.

**GUEST-02 (MUST).** One guest contact can be invited to multiple events. The **same invited party size** applies to every event selected for that contact. Do not collect individual names for represented family members.

**GUEST-03 (MUST).** Each invited event retains its own RSVP status and confirmed attending count, which may differ by event and may not exceed party size.

**GUEST-04 (MUST).** Search/filter guest contacts by name, event invitation, RSVP state and delivery status. Clearly distinguish number of contacts, total invited people and confirmed people per event.

**GUEST-05 (MUST).** Support CSV and XLSX import with preview, per-row validation, errors and duplicate warnings. Support export of contacts, invited events and RSVP results in CSV and XLSX formats. Large imports/exports may be handled asynchronously.

**GUEST-06 (MUST).** Organizers can update party size; if lowering it below any current RSVP attending count, require the organizer to resolve those conflicts rather than silently clamping confirmed counts.

**GUEST-07 (MUST).** No guest signup or password is required for invitation or photo-upload experiences.

**Acceptance:** when a contact with party size 5 is invited to three ceremonies, each ceremony shows 5 invitees; changing RSVP to 2, 3 and 5 yields those attendee totals, without making three guest contacts.

## 5.10 INV - Digital invitations, RSVP and reminders

**INV-01 (MUST).** Organizer selects one or more wedding events for a guest contact and generates a unique high-entropy private invitation URL.

**INV-02 (MUST).** The invitation landing page may display the contact's name, invited party size, selected events, dates/venues and RSVP options. **Anyone possessing the private link can view and modify it**; guest identity verification is intentionally not in MVP.

**INV-03 (MUST).** RSVP is per invited event: Pending, Attending, Not Attending, or Maybe. For Attending, record attendee count from 1 to party size; for Not Attending, count is 0. For Maybe, count is optional and is not included in confirmed-attendee totals unless changed to Attending.

**INV-04 (MUST).** Guests can edit their RSVP at any time while the wedding is active, including after a previous response. The latest valid submission becomes current; retain basic change history for organizers.

**INV-05 (MUST).** Unauthorized events are never added to a guest's RSVP options simply because the events appear on the public website. Only an organizer can modify event-invitation eligibility.

**INV-06 (MUST).** Send a personalized email invitation where an email is available, with one-click manual WhatsApp sharing via a prefilled message and the same invitation URL. No WhatsApp API integration or automatic WhatsApp sending in V1.

**INV-07 (MUST).** Provide configurable email reminders at 30, 7 and 3 days before a scheduled event (enabled/disabled per wedding or event). Reminders are event-specific; avoid messages for cancelled events, archived weddings, uninvited contacts, opted-out contacts and contacts that have declined that event. Recalculate pending reminders after date changes and deduplicate jobs.

**INV-08 (MUST).** Track email queue/send/error status, show failures in organizer UI and allow safe resend. Do not describe an email as delivered unless provider evidence supports delivery.

**INV-09 (MUST).** Organizers can revoke or regenerate invitation tokens; old links stop working. Rate-limit link operations and RSVP mutations. Exclude private token and guest name from public metadata, previews, referrer leaks and analytics events.

**INV-10 (MUST).** Public event information uses the standard wedding website URL. Guest identity and RSVP information appears **only** through the private invitation route; the two URLs must not be conflated.

**Acceptance:** forwarding a public URL never displays Rajesh's personal invitation; forwarding Rajesh's private invitation URL *does* grant the holder access (documented limitation). Regenerated links revoke old tokens. A guest cannot RSVP for an unselected event even by constructing an API call.

## 5.11 SITE - Public wedding website

**SITE-01 (MUST).** Each wedding can reserve a unique human-friendly URL slug (e.g., `/w/aarav-priya`), with uniqueness validation and safe slug changes/redirect behavior defined at implementation.

**SITE-02 (MUST).** Provide **three** starter templates: Traditional, Modern Minimal and Royal/Elegant. They use the same data model and feature set; selecting a new template does not destroy content.

**SITE-03 (MUST).** Editable content includes couple names, hero/cover photo, wedding description/story, ceremony list, event timelines, venues, Google Maps links, optional FAQs, livestream embeds and approved gallery sections.

**SITE-04 (MUST).** Provide preview, publish and unpublish actions. New websites start unpublished. Prevent publication without essential content (couple names and at least one usable event), with actionable validation messages.

**SITE-05 (MUST).** All ceremony details configured for the public page are viewable by anyone; this does not grant access to RSVP or guest data.

**SITE-06 (MUST).** Public pages are responsive and shareable on WhatsApp, with appropriate title/description/preview image. Hide private wedding records and invitation tokens from public page source and metadata.

**SITE-07 (MUST).** An archived wedding's published site stays accessible, but content editing stops and writable RSVP/upload endpoints are disabled; an owner retains a safety control to unpublish it.

**Acceptance:** an anonymous visitor can open a published wedding page and see ceremony schedules and approved gallery content; direct attempts to access expense, contact or RSVP data are unauthorized.

## 5.12 PHOTO - Albums, QR upload and storage

**PHOTO-01 (MUST).** Provide event-based albums automatically, plus optional custom albums. Each photo has wedding, album/event, uploader name (optional), upload time, file attributes and moderation state.

**PHOTO-02 (MUST).** Generate event-specific QR codes/upload URLs that route uploaded photos to the chosen album. Also support a general wedding upload link where contributors choose an album.

**PHOTO-03 (MUST).** Guest uploads require no account. Support multiple image selection, clear progress/failure feedback, supported file validation, size limits and malicious-content protections.

**PHOTO-04 (MUST).** Uploaded images default to Pending. Owners/managers approve or reject/delete uploads. Only **approved** photos appear on the public website. Guests never get delete/manage access over other people's photos.

**PHOTO-05 (MUST).** Limit aggregate wedding photo storage to **5 GB**, clearly show usage to organizers, and reject excess uploads gracefully. Preserve an original suitable for export and produce optimized display sizes, with quota accounting consistently defined in implementation.

**PHOTO-06 (MUST).** Owners/managers can download photos individually and export all approved or all accessible photos, grouped by event/album. Large exports may run as background jobs with a completion notification or download link.

**PHOTO-07 (MUST).** Photo galleries remain available indefinitely while the wedding and files are retained, subject to storage and account deletion policy. Archiving stops uploads but leaves approved public photos accessible; owners retain safety controls to hide/remove public photos.

**PHOTO-08 (MUST).** Provide QR/link disable or rotation to reduce unwanted uploads; apply rate limiting and abuse monitoring. Inform uploaders that approved photos can appear publicly.

**Acceptance:** guest uploads 10 valid images to the Mehendi QR; images remain invisible publicly until approved; an over-quota upload does not create a partial or orphaned public image.

## 5.13 LIVE - Embedded livestreams

**LIVE-01 (MUST).** Owner/manager can enter a supported external livestream URL for an event, initially YouTube; validate and safely transform into an allowed embed format.

**LIVE-02 (MUST).** Public event page displays player when the provider allows embedding; otherwise provide a direct "Watch on YouTube" link and a helpful fallback.

**LIVE-03 (MUST).** No native hosting, video ingestion, streaming moderation or recording infrastructure in MVP. Clearly communicate that externally hosted streams may be public or accessible to others with the link.

**Acceptance:** a valid supported YouTube stream displays on the right ceremony; an unsupported/malformed URL is not injected as executable HTML.

# 6. Conceptual information model

The technical design will specify tables, indexes and schemas. The PRD requires the following logical entities and relationships.

| Entity | Essential fields / meaning | Relationship |
|---|---|---|
| User | id, email, display name, auth state | Has wedding memberships |
| Wedding | id, names, city, date, active/archived, website state, slug | Owns all scoped records |
| WeddingMember | user, wedding, role, status | Many members per wedding |
| MembershipInvitation | invited email, role, token/status | Becomes membership on acceptance |
| Event | wedding, name, date/time, venue, status | One wedding to many events |
| EventTimelineItem | event, time, title, owner | One event to many schedule items |
| Task | wedding, event?, assignee?, due date, status | Scoped to wedding |
| Vendor | wedding, contact and category | Many-to-many to events |
| Expense | wedding, event?, vendor?, total | One expense has many payments |
| ExpensePayment | expense, amount, paid date, note | Historical entries |
| GuestContact | wedding, name, party_size, email?, phone? | One contact to many event invitations |
| EventInvitation | guest, event, invited flag | One record per guest/event pair |
| RSVP | invitation, status, attending_count, updated | Exactly one current RSVP per event invitation |
| InvitationToken | guest, secret hash, revoked state | Allows access to that guest's selected invitations |
| NotificationJob | guest/event, kind, schedule, delivery state | Deduplicated reminders |
| WebsiteConfig | wedding, template, published status, content | One active configuration per wedding |
| Album | wedding, event?, title, upload policy | One to many photos |
| Photo | album, object key, state, metadata | Media stored separately |
| AuditEvent | actor, wedding, operation, time | Sensitive-change history |

**Data modeling constraints:** all wedding-scoped records carry a wedding identifier; event invitations are unique per `(guest, event)`; RSVP attending counts are within party-size bounds; monetary amounts use exact decimal semantics; private invitation secrets are stored hashed rather than in plaintext. Storage object paths and access checks must enforce wedding isolation.

# 7. Functional rules, validation and failure modes

## 7.1 Guest numbers and RSVP computations

- `Invited people for event = SUM(GuestContact.party_size)` across contacts invited to that event.
- `Confirmed attending people for event = SUM(RSVP.attending_count)` across RSVP status `Attending` for that event.
- `Pending contacts = selected event invitations without a final response`; `Maybe` remains separately reported.
- A guest record may be invited to some events and not others; **the single party-size value is shared** across selected events.
- RSVP edits are allowed while active, including edits after email reminders; totals must reflect the latest valid response.
- Duplicate contacts are not silently merged; import and manual entry should warn of likely duplicates.

## 7.2 Invitation links and security trade-off

**Final product decision:** no guest identity check. An invitation link is a bearer credential. It may expose the invited person's name and allow another holder to change the RSVP if forwarded. This is an **accepted V1 limitation**, not a claim that invitations are personally verified. Mitigations: sufficiently random tokens, hashed storage, revocation/rotation, request throttling, no public indexing, redaction in logs, no advertising pixels on invitation pages, and clear user messaging.

## 7.3 Notification behavior

- Reminder offsets: 30, 7, 3 days before each event, configurable. MVP implementation should select a consistent local send time and expose it in settings; **09:00 Asia/Kolkata is a proposed engineering default**, not a product dependency.
- Event changes: cancel outdated queued reminder jobs and generate revised jobs when dates change.
- Idempotency: never send the same reminder twice for the same guest/event/offset/schedule version due to retries.
- Failures: distinguish queued, attempted, sent, delivered (when provider confirms), bounced and failed states.
- Consent: offer a simple opt-out from reminders without automatically deleting the guest's invitation.
- Archived or cancelled events do not generate new reminders.

## 7.4 Lifecycle edge cases

- Co-owner invitee already owns an active wedding: reject activation of new co-ownership until conflict resolved; no silent extra owned wedding.
- First owner loses access while co-owner invite remains pending: use a documented account-recovery/support process; managers must not become owners automatically.
- An archived wedding is read-only for planning workflows for *all* managers and owners, not just the person who archived it; limited owner-only privacy/deletion controls remain available.
- Removing a guest or revoking an invitation immediately disables its private token and prevents further RSVPs.
- Removing an event retains auditable associated expenses/tasks; use soft deletion or blocked deletion rather than orphaning financial data.
- Editing a guest party size below confirmed counts requires explicit correction; do not corrupt historical headcount.
- Public wedding site may be available even if the recipient was not invited; invitation eligibility and public visibility remain separate.
- Site unpublishing must prevent anonymous viewing even if old public URLs exist.
- Photo uploads that exceed limits, fail security checks, or lose network connectivity must not create publicly visible partial files.

# 8. UX and screen inventory

The product should use plain language, legible controls, clear empty states, and mobile-friendly navigation. Complex admin controls can be progressively revealed. There are two navigation systems: authenticated planning and anonymous/guest wedding experience.

## 8.1 Organizer application

| Screen / route concept | Main capabilities |
|---|---|
| Signup, login, recovery | Register, verify, reset password, sign in |
| My Weddings | Active owned wedding, manager memberships, archived weddings |
| Create Wedding | Basic details, optional co-owner invite |
| Dashboard | Countdown, overview metrics and quick actions |
| Events | Event list, create/edit, venue and status |
| Event Details / Timeline | Hour-by-hour schedule, related tasks, links and media |
| Tasks | Create, assign, filter, change status |
| Vendors | Contact directory and event associations |
| Expenses | Expense list, payment history, outstanding values |
| Guest Contacts | Add/edit/import/export CSV/XLSX, party sizes and filters |
| Invitations | Select events, send/resend, RSVP/status tracking |
| Website Editor | Template selection, content, preview, publication |
| Photos / Moderation | Albums, upload QR codes, approval queue, export, quota |
| Team & Settings | Owner/manager invites, role administration, archiving |

## 8.2 Public / guest application

| Screen | Main capabilities |
|---|---|
| Published wedding home | Names, story, hero image, ceremony details |
| Event detail | Time, venue, directions, timeline, livestream |
| Personalized invitation | Guest name, selected events, per-event RSVP and headcount |
| Guest photo upload | Event album, select images, upload progress |
| Public approved gallery | Browse approved albums/images; privacy disclosure |
| Unavailable link state | Revoked invitation, unpublished site, closed uploads |

**Usability requirements:** prevent accidental destructive actions; display dates and currency consistently; preserve input on transient errors; support touch targets and keyboard navigation; provide success states after invitations and uploads. Where the user might confuse *guest contacts* with *people attending*, labels must explain the distinction.

# 9. Non-functional requirements

| ID | Requirement | MVP acceptance direction |
|---|---|---|
| NFR-01 | Tenant isolation | Every protected read/write is wedding-scoped and authorization-tested |
| NFR-02 | Security | HTTPS; secure sessions; least privilege; parameter validation; rate limits; no raw private invitation tokens in logs |
| NFR-03 | Upload safety | Enforce MIME/content validation, per-file caps, abuse controls, non-executable storage and image sanitization |
| NFR-04 | Privacy | Clear privacy notice; guest data only in organizer/private invitation routes; consent/disclosure for public photo publishing |
| NFR-05 | Availability | Backups and tested restore process; monitored email queue and media processing; graceful provider failures |
| NFR-06 | Responsive UX | All core workflows usable at 360 px and larger; desktop functionality not required for guests |
| NFR-07 | Performance | Proposed pilot targets: core pages usable on typical Indian mobile connections, paginated guest lists, asynchronous exports/uploads |
| NFR-08 | Accessibility | Semantic forms, keyboard support, adequate contrast, descriptive error messages, reasonable WCAG 2.2 AA intent |
| NFR-09 | Scale safety | Database pagination, queue-driven email/photo processing, capacity alerts for 5 GB storage quota |
| NFR-10 | Observability | Structured logs, exception monitoring, audit events, email queue failures, upload errors, and operational alerts |
| NFR-11 | Data portability | CSV/XLSX guest export, photo export, clear deletion handling and backup policy |
| NFR-12 | Indian localization | INR, English text, human-readable Indian date formats, event timezone default Asia/Kolkata |

**Performance and reliability thresholds:** exact p95 latency, upload size, concurrent-user and recovery-time service levels should be baselined during engineering planning and pilot load testing rather than presented as unvalidated guarantees in the PRD. External services (mail, object storage, YouTube) must degrade gracefully.

**Compliance readiness:** before launching publicly at scale, review privacy notices, consent and data-deletion flows against applicable Indian privacy obligations. This PRD is not a legal compliance opinion.

# 10. Analytics and pilot measurement

Use privacy-conscious product events without embedding guest names, invitation tokens or private content in analytics payloads.

| Metric | Definition | Why it matters |
|---|---|---|
| Wedding activation | % of created weddings that add at least one event and one manager/task | Is onboarding useful? |
| Co-owner participation | % of co-owner invitations accepted | Does collaboration work? |
| Planning engagement | Active organizing users; tasks created/completed | Does the workspace replace informal tools? |
| Guest invitation activation | % of invited contacts whose link is opened / RSVP submitted | Is invitation experience understandable? |
| RSVP completion | Responses per event divided by invited contacts for that event | Can guests complete without login? |
| Email delivery health | Sends, bounces, provider failures and duplicate-send rate | Are notifications reliable? |
| Photo contribution | Uploaders and successful approved photos per wedding | Is QR sharing useful? |
| Quota pressure | Weddings at 70%, 90% or 100% of 5 GB | Is free storage sustainable? |
| Website publication | % of active weddings publishing their site | Are templates easy enough? |
| Pilot feedback | Structured qualitative feedback and recurring support issues | What should be improved before monetization? |

**Pilot protocol:** test with a small number of friends/family weddings; recruit organizers and at least several guests per event; monitor invite delivery, browser compatibility, RSVP errors, upload errors and moderation load; hold structured feedback after wedding completion. Proposed numerical targets and launch gates should be set with observed pilot usage instead of invented business forecasts.

# 11. MVP acceptance test scenarios

The following are cross-module, end-to-end acceptance scenarios. Component-level cases map to the requirement IDs above.

| Scenario | Expected result |
|---|---|
| A. Create wedding and invite owner | First owner can plan immediately; second accepts later with equal access |
| B. Active ownership conflict | Existing owner cannot own second active wedding; manager membership elsewhere is allowed |
| C. Manager authorization | Manager edits events/tasks but cannot remove owners or archive wedding |
| D. Ceremony setup | Two same-day events with separate venues and timelines render correctly |
| E. Task assignment | Task assigned to manager appears in My Tasks and completion updates dashboard |
| F. Vendor expense | One vendor linked to two events; partial payments show exact remainder |
| G. Household-style guest | One contact with party size 5 receives identical invited count for selected events |
| H. Per-event attendance | Haldi RSVP 3, Wedding RSVP 5 updates respective confirmed totals |
| I. RSVP restriction | Recipient cannot RSVP for event not selected, despite viewing public site |
| J. Forwarded link | Public URL is generic; private link holder can see/edit named invitation (accepted risk) |
| K. Reminder schedule | Email sent once per enabled offset; cancellation/archiving suppresses future reminders |
| L. Wedding site | Public sees all events and approved images, but no contacts, expenses or private tasks |
| M. Photo QR and moderation | Event QR uploads pending images; only approved images visible publicly |
| N. Storage limit | Upload rejected gracefully at 5 GB; organizer sees available capacity |
| O. Livestream embed | Valid YouTube stream renders; unsupported URL uses safe error/fallback |
| P. Archive and recreate | All administrative edits/RSVP/uploads stop; old published site viewable; owner creates next wedding |
| Q. CSV/XLSX round trip | Imported valid guests match export, with errors shown for invalid rows |
| R. Wedding isolation | IDs/URLs from another wedding never grant data access |

# 12. Delivery plan and release boundaries

## Stage 1 - Planning workspace

Deliver authentication, wedding setup, ownership/manager membership, wedding switcher, events, hour-by-hour timelines, dashboard, tasks, vendors, expenses, and archiving baseline. Establish wedding-scoped authorization and audit events before broad feature development.

## Stage 2 - Guest and publishing experience

Deliver guest contact management, CSV/XLSX import/export, selected-event invitations, per-event RSVP/headcounts, email sending/reminders, manual WhatsApp sharing, three website templates, publication, venue maps and public event schedules.

## Stage 3 - Wedding-day experience and memories

Deliver event albums, QR upload, moderation, 5 GB quota, photo export, livestream embedding, archival behavior across public pages, end-to-end reliability tests and pilot rollout.

**Release definition:** the public MVP requires completion of all MUST requirements and relevant cross-module tests, not just completion of Stage 1. Stages are engineering sequence, not separate product promises.

# 13. Deferred features and future monetization

**Deliberately deferred:** native mobile app, automated WhatsApp campaigns, vendor booking/marketplace, payments, detailed budgets, seating plans, individual family-member records, guest check-in, guest video uploads, AI features, multilingual UX, custom domains, complex template builder, professional planner billing, and self-hosted livestreams.

**Commercial direction (not V1 implementation):** free planning experience initially. After observing usage and storage cost, a **one-time per-wedding premium upgrade** is a potential fit for extra image storage, premium designs, extended support or custom domains. No advertisements are planned on invitation or gallery pages. Pricing, billing and paid access controls are not part of MVP.

# 14. Decisions, risks and implementation handoff

## 14.1 Confirmed product decisions

| Area | Approved decision |
|---|---|
| Users | Indian couples/families planning their own wedding |
| Owned wedding limit | One active owned wedding; archived weddings do not count |
| Managers | May manage other active weddings concurrently |
| Co-owner | Can join after planning or publishing has begun |
| Guest model | One contact with one party size shared across selected events |
| RSVP | Event-specific status and attendance count; editable anytime while active |
| Invitation security | Any holder of private link can view and RSVP; no guest verification |
| Public website | All ceremonies publicly listed; only invitation RSVP private |
| Gallery visibility | Every approved photo public on published site |
| Photo retention | Indefinite while retained, capped at 5 GB per wedding |
| Vendor directory | Included |
| Day-of timeline | Included as event schedule |
| Notifications | Email reminders; manual WhatsApp send button |
| Pricing | Free pilot; later business model undecided |

## 14.2 Key risks and mitigations

1. **Forwarded invitation impersonation:** accepted product trade-off; mitigate with long, revocable tokens, throttling and clear messaging.
2. **Public guest photos:** guests must understand approved uploads become visible to the public; implement moderation and removal.
3. **Indefinite media cost:** enforce 5 GB quota, monitor quota pressure, set transparent deletion/export policies.
4. **Email deliverability:** sender verification, queue retries, bounce visibility, suppression of duplicates and consent-aware reminders.
5. **Data isolation:** enforce tenant authorization at API and storage layers; run negative permission tests before pilot.
6. **Concurrent owner membership:** enforce active ownership uniqueness transactionally, including invitation acceptance races.
7. **Guest data quality:** warnings on duplicates; handle missing email for manual WhatsApp sharing; distinguish contacts from total people.

## 14.3 Implementation-level policies to decide during technical design

These are technical decisions rather than new product discovery questions: exact storage quota accounting (originals plus derivatives), per-file upload cap and accepted formats, email provider and sending limits, reminder dispatch time, URL slug rename redirects, access retention after member removal, deletion grace period, backup/restore targets, pilot load/performance thresholds, and support workflow for a locked-out sole owner. They should be documented in the technical specification and reviewed before production launch.

## 14.4 Exit criteria and approval

The PRD may be considered implementation-ready when engineering has mapped each MUST requirement to screens/APIs/data entities, QA has a test case for each key behavior, security review covers invite tokens and multi-wedding isolation, design covers mobile organizer/guest journeys, and the pilot plan includes support, backups, email sending, storage monitoring and archival testing.

---

**End of PRD v1.0**  
**Next deliverable:** UX wireframes / screen-by-screen flows and technical design (schema, API contracts, authorization rules, notification pipeline, storage design and deployment).
