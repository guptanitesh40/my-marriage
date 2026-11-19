# MY MARRIAGE

## System Design & Architecture RFC

STATUS: Proposed for technical review  
OWNER: Product & Engineering  
LAST UPDATED: November 12, 2026  
VERSION: 1.1  
RELATED DOCUMENT: My Marriage - Product Requirements Document (PRD) v1.0  
SCOPE: MVP web platform for Indian weddings, private organizing, public wedding sites, invitations/RSVP, notifications and moderated photo galleries.

Confirmed choices: Next.js + TypeScript (frontend), NestJS + TypeScript (backend), MongoDB Atlas, AWS application hosting, AWS S3, Redis + BullMQ, Gmail SMTP email and in-house NestJS email/password authentication.

Recommended technical selections: Mongoose, REST/OpenAPI, AWS ECS Fargate for web/API/worker, AWS ElastiCache node-based Redis, AWS CloudFront and Mumbai region. Exact deployment shape, Atlas tier, CDN and budget still require sign-off.

# 1. Abstract

My Marriage is a multi-tenant web application for organizing Indian weddings. Each wedding has a private workspace for one or two owners and additional managers, plus a public wedding website. The product handles events, hour-by-hour schedules, tasks, vendor contacts, expenses and payments, invited guest contacts, per-event RSVPs, email reminders, event galleries and YouTube livestream embeds. Guests do not need accounts to respond to a personalized invitation or upload photographs.

This design uses Next.js for responsive frontend and public server-rendered pages; NestJS as business API and in-house authentication authority; MongoDB Atlas as application system of record; and AWS S3 for media. AWS hosts application processes and supporting infrastructure, while Atlas and Gmail remain external managed services. One NestJS modular monolith enforces wedding authorization and business consistency. Redis/BullMQ workers send emails over Gmail SMTP and process photos. Only approved media is delivered publicly; originals and pending uploads remain private.

Key guarantees are wedding-by-wedding data isolation; one active **owned** wedding per account; manager membership in other weddings; one invited party-size value applied to each selected event; independently editable RSVPs by event; bearer-token invitation access; and a 5 GB per-wedding storage limit. Archived weddings are read-only for planning and RSVP/upload activities, with restricted owner-only privacy/deletion controls.

**Design principle:** The NestJS API is the authorization and business-rule source of truth. Next.js may render and aggregate data for UI but must not implement competing permission or payment/RSVP logic.

## Design status and decision register

| **Area** | **Status** | **Design decision** |
|---|---|---|
| Web frontend | Confirmed | Next.js (App Router) with TypeScript |
| Business backend | Confirmed | NestJS with TypeScript |
| Operational data | Confirmed | MongoDB Atlas (managed) |
| Media/object storage | Confirmed | AWS S3 |
| Server-side modeling | Recommended | Mongoose via @nestjs/mongoose |
| API style | Recommended | REST under /api/v1, OpenAPI specification |
| Jobs | Confirmed | Redis + BullMQ workers; durable MongoDB outbox recommended |
| Email | Confirmed | Gmail SMTP (verification, password resets, invitations, reminders) |
| Hosting | Confirmed: AWS | AWS hosts web/API/workers; ECS Fargate is recommended, not selected |
| Photo delivery | Recommended | Private S3, approved-only CDN media path |
| Authentication | Confirmed | In-house NestJS email/password + secure server sessions; no Cognito |

# 2. Goals and Non-Goals

| **Goals** | **Non-goals for MVP** |
|---|---|
| Deliver an easy, responsive private organizer app and public wedding site. | Native Android/iOS apps and offline-first sync. |
| Keep weddings isolated and enforce protected owner privileges. | Multiple active **owned** weddings per account. |
| Support many ceremonies, per-event invitations and accurate attending headcounts. | Individual family-member guest records and seating charts. |
| Provide reliable reminders and direct guest photo upload with moderation. | Automated WhatsApp API, guest video hosting and custom livestream. |
| Start with a modular monolith that can evolve incrementally. | Microservices, event sourcing, vendor marketplace or online payments. |
| Preserve photos indefinitely while the wedding is retained, within the free 5 GB quota. | Unlimited free storage or a defined paid-plan implementation. |

**Working pilot envelope, not a contractual scale promise:** design and test around up to roughly 1,000 guest contacts, 10-20 events and 5 GB of image media per wedding, with dozens of simultaneous active organizers/guests. Validate these assumptions with pilot telemetry and load tests.

# 3. Background, Product Rules and Boundaries

Couples currently coordinate through multiple manual tools: chats, spreadsheets, invitation artwork, vendor notes and shared photo drives. The platform brings those activities together while separating what may be published from data that must remain private. All ceremonies and their non-sensitive details are public once the wedding site is published; individual invitations, RSVPs, guest contact records, expenses, tasks and vendor phone numbers are not.

The system is not a general social network. A primary guest contact can represent an entire household without identifying individual members. One party-size field, such as 5, applies to *every event selected for that contact*. Attendance status and number of confirmed attendees are stored **per event**; a contact may confirm three for Haldi and five for Wedding.

Public wedding URLs and private invitation URLs are separate products and routes. The invitation link is a **bearer credential**: whoever possesses it can view the named invitation and change its RSVP while the wedding is active. This was selected as an MVP convenience trade-off; the system must not claim that a forwarded invitation is identity-protected. All owner/manager routes require an authenticated session and wedding-scoped permissions.

An owner may own exactly one active wedding at any time but can be a manager in other weddings. Co-owner acceptance must not violate this constraint. The first owner can plan and publish while the second owner’s invitation is pending. Owners manually archive a wedding; historical planning is then read-only, and the owner can create another wedding. Published public site and approved photos remain available unless an owner uses limited safety actions (unpublish, hide/remove photo, request deletion).

**Trust boundaries:** browser/public visitor; authenticated organizer session; invitation bearer link; QR upload capability; API and worker trusted environment; MongoDB; private S3; public media delivery; external email/YouTube/Maps providers.

# 4. Proposed Architecture

## 4.1 Logical architecture

***Figure 1.*** *Recommended logical architecture; dashed services are proposed supporting components rather than confirmed technology choices.*

## 4.2 Component boundaries

| **Component** | **Responsibility** | **Persistence / dependency** | **Failure behavior** |
|---|---|---|---|
| Next.js app | Public SSR pages, organizer UI, RSVP/photo upload screens, template rendering | NestJS public/private APIs | Show error or cached public content; never bypass API permissions |
| NestJS API | In-house identity and sessions; memberships, wedding/event/RSVP rules, moderation and upload signing | MongoDB, S3, queue | Return typed errors; fail closed for protected operations |
| MongoDB Atlas | Source of truth for users, weddings, invitations, RSVP, metadata, outbox | Managed Atlas replica set (transaction-capable tier) | Reject writes on database outage; no local shadow state |
| Redis + BullMQ (confirmed) | Delayed reminders, email/image/export jobs, retries | AWS-managed Redis candidate: ElastiCache node-based | Queue if available; Mongo outbox enables reconciliation |
| Worker processes (NestJS) | Dispatch email; verify/process images; export ZIP; outbox relay | MongoDB, S3, email provider | Retry with backoff; dead-letter and alert after terminal failures |
| AWS S3 | Original images, quarantine uploads, derivative media, generated exports | IAM, optional CDN | Retry or surface failure; never publish pending images |
| CDN (proposal) | Serve **approved** photo derivatives only | S3 private origin | Short cache lifetime + invalidation when content hidden |
| Gmail SMTP (confirmed) | Verification, invitations, reminders and notifications | SMTP with a Google App Password; sender is the Gmail account or its alias | Persist attempt and status, retry safely |
| Observability | Logs, traces, metrics, audit/alerts | Hosted monitoring stack | Alert on critical loss of visibility or processing |

## 4.3 Backend module layout (NestJS)

A **modular monolith** runs as a deployable API and a separate worker process from the same codebase. Define domain modules with explicit exported services rather than direct cross-module collection access.

- AuthModule: first-party signup/login, Argon2id password hashing, verification/reset tokens, session creation/revocation, email change, throttle/lockout controls; Gmail SMTP sends transactional identity emails.
- **WeddingsModule:** wedding setup, active owner constraints, lifecycle, archiving, website publication state.
- **MembershipsModule:** owner/manager invitations, acceptance, authorization membership queries and revocations.
- **EventsModule:** ceremonies, venues, day-of timeline entries and public event projection.
- **TasksModule / VendorsModule / ExpensesModule:** assignment, contacts, payment history and summaries.
- **GuestsModule / InvitationsModule / RsvpModule:** household-style contact, selected-event invitation, token exchange, RSVP and headcount aggregates.
- **WebsitesModule:** slug reservation, template/content, preview and publication; public view DTO projections.
- **MediaModule:** albums, upload intents, quota, S3 signing, moderation, approval and export.
- NotificationsModule: email templates and the SMTP adapter; reminder schedule reconciliation, outbox and worker dispatch.
- **AuditModule / PlatformModule:** audit events, request IDs, health checks, config, reusable authorization guards.

Recommended folders: apps/web for Next.js; apps/api for NestJS API; apps/worker for NestJS worker; packages/contracts for versioned DTO/shared types; packages/ui for reusable components if useful. A monorepo may simplify shared types but is not required.

## 4.4 Frontend rendering and API boundary

Next.js App Router uses server rendering for public wedding pages and interactive client components for dashboards, RSVP forms and uploads. Browser requests use a same-origin /api/v1/* route forwarded to NestJS by the ingress/reverse proxy; organizer authentication cookies are HttpOnly, Secure and scoped appropriately. Next.js server-rendered pages call NestJS APIs to retrieve only authorized DTOs; avoid direct MongoDB access from frontend code or Server Actions. A frontend client-side hide/show check is never an authorization decision.

For public sites, cache only **sanitized published** payloads. Preview/draft content must use authenticated, uncached requests. Use cache invalidation/tagging or short TTL when sites are unpublished, venues change or media is hidden; the API remains authoritative at all times.

## 4.5 AWS-first deployment topology (v1.1)

Confirmed hosting policy: run the application on AWS. Recommended first production topology is Next.js SSR container, NestJS API container and a separate NestJS/BullMQ worker on Amazon ECS Fargate; container images in ECR; HTTPS ingress via Application Load Balancer, ACM and Route 53. Public approved media uses CloudFront with a private S3 origin. These AWS products are implementation recommendations until capacity and cost are reviewed.

AWS ElastiCache node-based Redis OSS is the recommended BullMQ connection (use a compatible engine/version and noeviction policy); validate in staging before launch. Keep MongoDB Atlas on AWS in a region aligned with the application where available. Atlas private endpoints require a qualifying dedicated tier; if a lower tier is used, connect over TLS through restricted egress/IP allowlists, never an unrestricted public database. Outbound SMTP to Gmail (port 465 or 587) requires managed outbound network access.

A lower-operations AWS alternative is Amplify Hosting for the Next.js app, with NestJS API/worker on ECS; validate the selected Next.js major version and required SSR features against Amplify support before choosing it. Keep all business logic and session authority in NestJS; do not introduce Amplify Auth or Cognito merely because of frontend hosting.

# 5. Request and Job Lifecycles

## 5.1 Authenticated owner/manager write

1. Browser sends same-origin HTTPS request with authenticated session and CSRF protection.
2. NestJS authenticates session, validates DTO and resolves wedding from route/record.
3. Wedding authorization guard checks active membership, role and current wedding state; archive rejects ordinary edits.
4. Domain service validates cross-field rules and performs MongoDB atomic update or short transaction.
5. Audit event and durable outbox event are recorded with the change where needed.
6. Response includes updated resource/version, request ID and safe error details; async side effects run later in worker.

## 5.2 Guest invitation access and RSVP

1. Organizer chooses one or more events for a guest; API persists selected-event invitations and creates a random token. Store only a **hash** of the token; email/share the unguessable link.
2. Guest opens /invite/t/{token}; a Next.js/NestJS route exchanges the token for a short-lived, scope-limited HttpOnly guest session and redirects to a URL without the raw token. The original link remains reusable until revoked.
3. NestJS fetches only invited events, the named contact and party size. Public wedding details come from the separate published website projection.
4. Guest submits status and attendee count for each invited event. Validate wedding active, token unrevoked, event selected and 0 <= attendingCount <= partySize; Attending requires at least one.
5. Update the event invitation document atomically (with responseVersion optimistic check) and conditionally write a wedding state/version fence within the same transaction, append RSVP audit/history, and recompute counts through indexed aggregation or a safe read model.
6. Allow subsequent changes at any time while wedding remains active. Archive or link revocation rejects writes.

**Privacy consequence:** The first link holder and a later forwarded-link holder have equivalent access. Token exchange reduces accidental leakage from page navigation but cannot authenticate intended recipient identity.

## 5.3 Photo upload / moderation / publishing

1. Guest opens an event QR/upload-capability link; backend validates wedding active and that the QR capability is enabled.
2. Browser requests POST /media/uploads/initiate with album, filename, declared MIME type and byte size. API applies anti-abuse controls and atomically reserves enough quota for the pending upload.
3. Backend creates an upload_intent with expiry and random S3 key under **private quarantine**, then returns a short-lived presigned upload request for that exact object. Browser uploads bytes **directly to S3**.
4. Browser calls POST /media/uploads/{id}/complete; backend verifies the object by S3 metadata/checksum, enqueues scan/processing and marks status uploaded.
5. Worker checks actual file format, normalizes orientation, strips unsafe metadata, creates optimized derivatives and moves trusted assets to private originals/derivatives. It adjusts reserved/used bytes atomically and transitions item to pending_approval.
6. Owner/manager approves the photo. Worker publishes **only an approved derivative** to a separate CDN-accessible prefix/path (S3 remains private via origin access) and updates the public album projection. Pending uploads are never publicly served.
7. If photo is hidden, deleted or website unpublished, invalidate/remove public derivative and purge cached copy; original retention/deletion follows authorized policy.

**Safety:** presigned S3 URLs may be reused until expiry and can overwrite the same key. Use unique staging keys, short expiry, content-length restrictions as supported by chosen signing method, immutable finalize behavior and separate published keys. A reconciliation worker removes expired orphan uploads and corrects quota reservations.

## 5.4 Reminder dispatch and retries

1. Creating/changing invitation or event writes a desired notification schedule (notifications) and an outbox record in MongoDB.
2. Outbox relay publishes due work to BullMQ; a reconciliation pass finds missed due work. The source of truth remains MongoDB, not only Redis.
3. Worker re-checks latest event time, invitation eligibility, RSVP state, opt-out, wedding active status, schedule version and prior dispatch status **immediately before send**.
4. Job uses stable deduplication key such as {weddingId}:{guestId}:{eventId}:{offsetDays}:{scheduleVersion}; MongoDB unique index and terminal status prevent duplicate sends even if BullMQ retries.
5. Email provider request is attempted; accepted, delivered, bounced, failed statuses have precise meanings. Reconcile provider callbacks, retry transient errors, alert on repeated/terminal failures.
6. Changing a date increments schedule version and invalidates old pending reminders. Archive/cancel removes eligibility for all future reminders.

For reminders select configurable offsets of 30, 7 and 3 days per event/wedding. The fixed send hour (for example 09:00 Asia/Kolkata) and timezone handling must be approved in engineering configuration before launch.

# 6. API and Data Contracts

## 6.1 API conventions

Base path: /api/v1. JSON over HTTPS; OpenAPI generated from NestJS DTO decorators. Use stable resource IDs in paths, validate requests with a global validation pipe and reject unknown writable fields. List endpoints accept cursor/page and bounds. Consistent error envelope includes code, message, details? and requestId. Prefer ISO-8601 timestamps in UTC in API and explicit timeZone on events. Price uses **integer paise** (not IEEE floating point); format INR at presentation layer.

Authentication is managed in-house by NestJS (no Cognito, Auth0 or Clerk). Organizer endpoints use server-side opaque session cookies; guest invitation endpoints use separate scoped invitation sessions, and QR upload endpoints use narrowly scoped capabilities. Never accept a role, session identity or wedding ID asserted by the client instead of verified membership.

| **Domain** | **Representative endpoints** | **Auth / policy** |
|---|---|---|
| Auth | POST /auth/signup, /login, /logout, /verify-email, /resend-verification, /forgot-password, /reset-password; GET /me, /auth/sessions; DELETE /auth/sessions/:id | In-house NestJS sessions, rate limits, email verified |
| Weddings | POST /weddings, GET/PATCH /weddings/:id, POST /:id/archive | Owner/manager; archive owner-only |
| Memberships | POST /weddings/:id/invitations/members, POST /members/accept, DELETE /members/:memberId | Restricted by role; owner protected |
| Events | GET/POST /weddings/:id/events, PATCH /events/:id, POST /events/:id/timeline | Wedding membership, active |
| Tasks/vendors/expenses | GET/POST/PATCH /weddings/:id/{tasks,vendors,expenses}; POST /expenses/:id/payments | Wedding membership, active |
| Guests | GET/POST /weddings/:id/guests, /guests/import, /guests/export | Wedding membership, active for writes |
| Invitation admin | POST /weddings/:id/guests/:guestId/invite, POST /invitations/:id/rotate | Wedding membership |
| Guest RSVP | GET /guest-invitation, PATCH /guest-invitation/events/:eventInvitationId/rsvp | Scoped invitation session |
| Website | PATCH /weddings/:id/website, POST /:id/website/publish, GET /public/weddings/:slug | Protected write; public sanitized read |
| Media | POST /media/uploads/initiate, /uploads/:id/complete, POST /photos/:id/approve, GET /public/albums/:id | QR capability or admin; public approved-only |
| Operations | GET /health/live, /health/ready, GET /metrics | Controlled access; no PII |

**Versioning:** breaking changes require /api/v2; nonbreaking additions preserve existing fields. Every API request that changes state may carry Idempotency-Key and entity If-Match / version as relevant. Never expose MongoDB internal objects directly: controllers return explicit DTOs.

## 6.2 Representative contract: event invitation and RSVP

```
{
  "eventInvitationId": "evtinv_123",
  "guestContactId": "guest_456",
  "eventId": "event_hal_001",
  "invitedPartySize": 5,
  "rsvp": {
    "status": "attending",
    "attendingCount": 3,
    "responseVersion": 4,
    "updatedAt": "2026-11-11T07:45:00Z"
  }
}
```

In this JSON, invitedPartySize is computed from the **single GuestContact.partySize**. It must not become a separately editable per-event field. Any guest count change is performed at GuestContact level and is validated against all confirmed event responses.

## 6.3 Representative contract: upload intent

```
{
  "uploadIntentId": "up_789",
  "albumId": "album_456",
  "declaredBytes": 4820000,
  "contentType": "image/jpeg",
  "upload": {
    "method": "PUT",
    "url": "<short-lived-presigned-s3-url>",
    "requiredHeaders": { "Content-Type": "image/jpeg" },
    "expiresAt": "2026-11-11T08:00:00Z"
  }
}
```

A presigned URL is a capability; never log or save its full query string. No S3 key is chosen by the client. Upload completion and subsequent moderation are separate API steps.

## 6.4 MongoDB collections and document boundaries

**Database design choice:** use Mongoose schemas and MongoDB transactions only where cross-document invariants require them. Favor one document per frequently updated RSVP or task. Embed small, bounded structures; do not embed unbounded guest lists, photo arrays or timeline histories inside one Wedding document.

| **Collection** | **Key fields** | **Primary indexes / notes** |
|---|---|---|
| users | emailNormalized, displayName, passwordHash, verifiedAt | UNIQUE emailNormalized |
| sessions | userId, secretHash, expiresAt, revokedAt | TTL expiresAt; lookup by indexed secretHash |
| weddings | slug, owners[], status, sitePublished, config, usedBytes, reservedBytes, limitBytes | UNIQUE slug; index status; atomic quota counters |
| wedding_memberships | weddingId, userId, role, activeOwned, status | UNIQUE (weddingId,userId); UNIQUE userId partial role=owner & activeOwned=true |
| membership_invites | weddingId, emailNormalized, role, tokenHash, expiresAt, status | Index email/status; TTL for safely disposable expired invite tokens (after audit) |
| events | weddingId, title, startAt, endAt, timezone, venue, state | (weddingId,startAt), (weddingId,state) |
| event_timeline_items | weddingId, eventId, startsAt, position, title | (eventId,startsAt,position) |
| tasks | weddingId, eventId?, assigneeId?, dueAt?, state | (weddingId,assigneeId,state), (weddingId,dueAt) |
| vendors | weddingId, name, category, contact | (weddingId,name), (weddingId,category) |
| expenses | weddingId, eventId?, vendorId?, amountPaise, paidPaise | (weddingId,eventId), (weddingId,vendorId) |
| expense_payments | weddingId, expenseId, amountPaise, paidAt | (expenseId,paidAt); money exact integer |
| guest_contacts | weddingId, name, partySize, email?, phone? | (weddingId,name), (weddingId,emailNormalized) nonunique |
| event_invitations | weddingId, guestId, eventId, rsvp{}, responseVersion | UNIQUE (guestId,eventId); (weddingId,eventId,rsvp.status) |
| invitation_tokens | weddingId, guestId, tokenHash, revokedAt | UNIQUE tokenHash; TTL only for expired temporary sessions, not active invitation links |
| guest_sessions | tokenScopeId, sessionHash, expiresAt | TTL expiresAt; limited capability |
| website_configs | weddingId, templateId, content, publishedAt | UNIQUE weddingId |
| albums | weddingId, eventId?, title, qrSecretHash, isUploadEnabled | (weddingId,eventId) |
| upload_intents | weddingId, albumId, reservedBytes, objectKey, state, expiresAt | (weddingId,state), cleanup by expiry after reconciliation |
| photos | weddingId, albumId, originalKey, derivativeKeys, byteCounts, moderation | (albumId,moderation), (weddingId,moderation) |
| notifications | weddingId, guestId, eventId, offset, scheduleVersion, dueAt, status | UNIQUE (guestId,eventId,offset,scheduleVersion); (status,dueAt) |
| outbox_events | aggregateId, eventType, payloadRef, status, nextAttemptAt | (status,nextAttemptAt), safe retries |
| audit_events | weddingId, actorId, action, entityId, occurredAt, safeDiff | (weddingId,occurredAt) |

**Index correctness:** a partial unique membership index on userId for role:'owner' AND activeOwned:true gives the **one active owned wedding** guarantee. Create the index before opening signup. When an owner accepts co-ownership or a wedding archives, update membership flags and wedding status together inside a short MongoDB transaction. MongoDB multi-document transactions require a replica set or sharded cluster, not standalone MongoDB. [MONGO-1]

**Deletion and retention:** permanent account/wedding deletion needs a separate deletion workflow spanning database and S3, with tombstones, asynchronous erasure and an audit trace. TTL expiration is appropriate for temporary sessions/uploads only; **do not** TTL-delete wedding photos or archived weddings.

## 6.5 Source-of-truth and denormalization policy

- Weddings, events, event invitations and expense payments are the canonical transactional records.
- Public wedding payloads, dashboard summaries and attendance totals are *projections*, not canonical objects. They may be computed on request at pilot scale; introduce materialized counters only if profiling justifies it.
- For RSVP writes, use atomic compare-and-set on responseVersion to avoid lost updates. The same short transaction must also conditionally update an active-wedding write-fence/version field; this serializes RSVP commits with archiving rather than relying only on a stale status read.
- Payment creation and expense paidPaise reconciliation use a transaction or a derived total to avoid overpayment on concurrent actions.
- Media quota counters are atomically reserved on initiate, reconciled against real S3 objects and adjusted during processing; reconciliation handles orphaned uploads and worker crashes.

# 7. Consistency, Idempotency and Recovery

| **Scenario** | **Required behavior** | **Implementation mechanism** |
|---|---|---|
| Concurrent co-owner acceptance | At most one active owned wedding per user | Partial UNIQUE index + membership/wedding transaction; conflict returns 409 |
| Duplicate RSVP PATCH | One latest state; no double counting | Compare responseVersion; repeat returns current state or 409 |
| Two concurrent photo uploads at quota | Total reserved + used cannot exceed 5 GB | Atomic conditional quota reservation, then reconciliation |
| S3 upload succeeds but completion call fails | Recoverable upload; no public image | Intent state + HEAD object verification + sweeper |
| Photo worker retry | No duplicate public assets or quota double-charge | Idempotent transitions, immutable derivative keys |
| Reminder worker crash after provider send | Avoid duplicate where possible, expose uncertainty | Notification unique key + provider idempotency if available + durable status reconciliation |
| Event time changed after scheduling | Old schedule no longer eligible | ScheduleVersion and pre-send validation |
| Archive during guest RSVP/upload | No post-archive RSVP commit or media publish | Serialize archive-sensitive writes via a conditional wedding-document write fence inside transaction; reject on status conflict |
| Public media hidden | Not returned in listing; cached derivative purged | Moderation state, CDN invalidation, short TTL |
| MongoDB unavailable | No protected writes; public cache limited | Fail closed; visible error + alerts; do not accept unsynced requests |

**Transactional outbox:** write domain transition and an outbox event in the same MongoDB transaction. A separate relay publishes to BullMQ, marks handoff and retries. A periodic reconciler scans unsent outbox and due notifications, avoiding reliance on a single in-memory scheduler. Background processing is **at least once**, so every handler must be idempotent.

# 8. Security and Privacy Considerations

## 8.1 Identity, access and isolation

- Use in-house NestJS email/password authentication with Argon2id hashes and opaque random session tokens; store only hashed session secrets in MongoDB, and set HttpOnly, Secure, SameSite cookies with intentional CSRF protections. Email verification and password resets use random, hashed, single-use, short-lived tokens sent through Gmail SMTP. Rotate/revoke sessions after sensitive account actions; rate-limit by IP and normalized account key, slow down credential stuffing, and avoid email enumeration in recovery responses.
- Validate request body through DTOs and route resource access through server-side guards checking (current user, weddingId, role, wedding status); **all Mongo queries must be wedding-scoped**, not just findById.
- All public responses are allowlisted DTOs. Never expose organizer email lists, vendor private contacts, guest PII, tokens, private S3 keys or expenses in published Next.js payloads, HTML, caches or page metadata.
- Guest invitation and photo-upload tokens are independent, random, revocable capabilities. Apply short sessions, rate limits, security headers, no-referrer for invitation pages, noindex and no third-party trackers on private invitation pages.
- Change-state APIs require anti-CSRF for organizer and guest cookies, per-route throttling and appropriate authorization. Hide sensitive values in logs and traces.

## 8.1.1 In-house authentication responsibilities (v1.1)

NestJS owns email/password signup, verification, login/logout, forgotten-password flows, session inventory/revocation, password change, account recovery and access checks. Gmail is only the email delivery service: it never becomes the source of user identity. Database users.passwordHash and hashed sessions/recovery/verification tokens are canonical; raw passwords and raw secrets are never logged or returned.

Required auth security tests: credential stuffing/rate limits, sign-in after verification, expired/reused reset tokens, account enumeration resistance, session fixation, CSRF, logout/revocation, access from another wedding, email changes requiring re-verification and auth when Gmail SMTP is unavailable. Support manual recovery procedure for an inaccessible sole owner; do not automatically grant owner privileges to a manager.

Gmail SMTP integration: send from the Gmail account (or an alias added to it) with a Google App Password, store the App Password in AWS Secrets Manager, use an adapter within NotificationsModule, and respect Gmail's sending limits (about 500 emails a day). Gmail reports no delivery events, so "sent" means the server accepted the email. Login should not depend on Gmail availability; only email-triggered verification/reset/invite flows are delayed during provider outages.

## 8.2 AWS S3 and photo safety

- Use a private S3 bucket with **Block Public Access** on, ACLs disabled, server-side encryption enabled and narrow IAM roles for API/worker. No public ACLs on originals or pending media. [AWS-1]
- Generate time-limited presigned PUT URLs for unique quarantine keys; verify actual bytes with S3 HEAD and content checks before accepting. S3 presigned URLs are reusable until expiry and allow replacement at a fixed key: final publishing must use new keys. [AWS-2]
- Strip EXIF geolocation and unnecessary metadata from public derivatives; constrain file types (JPEG, PNG, WebP initially), dimensions, decompression ratio, size and processing time. Run malware/abuse screening appropriate to deployment risk.
- Serve approved derivatives through CDN with private S3 origin. Hide/delete and unpublish flows must invalidate cached derivatives. Export originals only to authorized owners/managers via short-lived signed downloads.
- Event QR link may be forwarded; rate-limit, optionally challenge suspicious upload bursts, and give admins rotate/disable controls. Show uploader notice that approved photos are public.

## 8.3 Operational privacy

- Store email/phone only as required for invitations and manager operations. Guests may omit phone/email when the organizer manually shares link; email cannot be sent without an email.
- Use explicit provider credentials in secret manager/environment injection, never browser bundles or repository. Scope API and worker service accounts separately.
- Prefer an AWS India region, such as ap-south-1 (Mumbai), and align the MongoDB Atlas region where supported to reduce cross-region latency/egress. Document chosen AWS and Atlas regions, encryption, transfer costs and applicable privacy obligations before deployment; region selection alone is not proof of legal compliance.
- Establish privacy policy, abuse reporting, deletion/export process, guest upload consent disclosure and authorized publication controls before public-scale launch.

# 9. Operational Readiness and Deployment

## 9.1 Proposed deployment topology

Confirmed deployment boundary: AWS hosts Next.js, NestJS API and worker, network, S3, media delivery and supporting Redis infrastructure. Recommended first option: ECS Fargate for three container services, ECR, ALB/ACM, Route 53 and CloudFront, plus ElastiCache node-based Redis. MongoDB Atlas is the managed external database; Gmail (SMTP) is the external transactional mail provider. Use TLS for all traffic, private subnets for stateful backends and least-privilege IAM. Select production region and Atlas tier after an AWS/Atlas cost and networking review.

AWS-only application-hosting alternative: Amplify Hosting for Next.js SSR (only if compatible with the selected Next.js version and features), with API and worker on ECS. A single ECS deployment for all three applications is operationally consistent but can have higher always-on compute, load balancer and networking costs. Atlas remains a separately billed third-party service, and Gmail a separate Google account. Obtain a monthly cost estimate before creating a production VPC/NAT/ALB or dedicated Atlas tier.

## 9.2 Environment and CI/CD plan

- Environments: local, staging, production; seed fictional wedding data only in test systems.
- CI: lint, TypeScript check, unit tests, integration tests, API schema check, dependency audit, container build and image scan.
- CD: deploy staging automatically, run schema/index migrations, E2E smoke tests, then promote tagged version to production after approval.
- Config: validate required environment variables at startup; secrets via platform secret manager; no .env secrets committed.
- Database migrations: versioned schema/index scripts, backwards-compatible document updates, retries for index build issues; rollback code independently where possible.
- Backups: encrypted managed MongoDB backup/PITR where supported and S3 versioning/restore policy subject to cost and deletion needs; test restore before public launch.

## 9.3 Monitoring and SLO proposals

| **Signal** | **Pilot target / alert proposal** | **Launch gate** |
|---|---|---|
| API service availability | Track 5xx and liveness/readiness; investigate sustained elevated 5xx | Required |
| Request latency | Measure p50/p95 for guest RSVP and organizer CRUD; set baselines in pilot | Required |
| Reminder due-to-send delay | Target most due sends within 15 minutes excluding provider outage; alert on growing overdue backlog | Required |
| Email failure | Alert on sustained provider auth failures, bounce spikes, retry exhaustion | Required |
| Photo processing | Alert on upload intents stuck >30 minutes or moderation worker errors | Required |
| Quota reconciliation | Alert on negative values, reservations past expiry and S3/database drift | Required |
| Storage and costs | Warn when a wedding reaches 70%, 90% and 100% of 5 GB; monitor global S3 cost | Required |
| Backup restore | Verify at least one successful staging restoration before wider pilot | Required |
| Security/audit | Alerts for excessive token attempts, owner-index conflicts and permission failures | Required |

Logs should include request IDs, error codes, wedding IDs where safe, and worker/job IDs. **Never** record password/reset secrets, presigned S3 URLs, raw invitation tokens, complete session cookies or guest PII. Monitoring should report aggregate trends, not personal invitations.

## 9.4 Failure modes and graceful degradation

If MongoDB Atlas fails, in-house auth session validation, private reads and writes fail closed; never accept authorization from a stale local cache. If Gmail SMTP fails, verification, reset, invitation and reminder mail tasks remain queued/visible and are retried, without claiming delivery. Redis/BullMQ outage retains durable intent in MongoDB outbox and replays on restoration. S3 upload failure supports retry and quota reconciliation; CloudFront failure degrades approved photo display without taking down wedding schedules. Archiving confirms only after database commit.

## 9.5 Confirmed selections: costs and operational trade-offs

In-house NestJS authentication avoids a managed identity subscription and provider coupling but makes the team accountable for password policy, session security, resets, breach response and recovery support. Implement secure defaults and security tests before pilot users join. Gmail SMTP needs no domain setup or paid plan, but has a daily sending limit, no delivery events and sends from a Gmail address.

AWS Fargate, ALB, NAT/egress, CloudFront, ElastiCache, S3 requests/transfer and monitoring can create material fixed costs even with low traffic. MongoDB Atlas is billed separately. Atlas PrivateLink is only available on qualifying dedicated tiers, potentially increasing pilot cost. A 5 GB-per-wedding quota limits individual storage but does not cap aggregate cost as the number of weddings grows.

Implementation sign-off checklist: (1) create AWS cost budget and billing alerts, (2) choose deployment topology and region, (3) choose Atlas tier/network path, (4) set up the Gmail sending account and its App Password, (5) configure node-based ElastiCache Redis with BullMQ-compatible eviction policy, and (6) document backup/restore, incident ownership and data deletion procedures. Do not provision costly always-on infrastructure before comparing realistic pilot options.

# 10. Alternatives Considered

| **Alternative** | **Why considered** | **Why not selected for baseline** |
|---|---|---|
| All backend logic in Next.js route handlers | One deployment and fewer services | User chose NestJS; complex wedding authorization/jobs merit explicit backend boundary |
| Microservices from day one | Independently scaled domains | High operations, deployment and transaction complexity for free pilot |
| PostgreSQL | Strong relational consistency and SQL aggregates | MongoDB is confirmed; Mongoose modeling supports bounded document aggregates |
| MongoDB embedded arrays for all guests/RSVP/photos | Fewer collections and simple document read | Unbounded growth, large writes and multi-user contention |
| Browser uploads through NestJS server | Straightforward code path | Large files waste API bandwidth; direct S3 upload scales better |
| Public S3 bucket for all photos | Simplest image URL retrieval | Pending/hidden images could be exposed; use private bucket and approved-only delivery |
| Cron inside web process | Easy reminder prototype | Missed/duplicated jobs on scaling and redeploy; durable outbox + worker preferred |
| AWS SQS instead of Redis/BullMQ | Fully managed AWS queue without Redis | Redis + BullMQ chosen. SQS would reduce Redis operations but would change job implementation and worker semantics. |
| Separate database per wedding | Strong isolation by physical separation | Unnecessary operational and cost overhead for consumer pilot |
| Managed authentication (Cognito/Auth0/Clerk) | Offloads password/session operations | Not selected: user chose simple in-house NestJS auth; own security and support responsibilities are accepted |

# 11. Open Questions / Approval Checklist

The product requirements and technology selections are approved. Remaining questions concern AWS resource sizing, operating cost and vendor configuration; the authentication approach is explicitly in-house NestJS, not a third-party managed identity service. Set these operational values before infrastructure provisioning.

1. AWS resources and region: select ECS Fargate versus AWS Amplify+ECS; choose Mumbai or another AWS region; assess CloudFront, ALB, NAT and outbound connectivity costs; set initial load target and cost alert thresholds.
2. MongoDB Atlas tier/networking: Atlas is confirmed; choose transactional replica-set tier and AWS region, backups/PITR and connectivity path (private endpoint on eligible dedicated tiers or restricted TLS egress).
3. Redis + BullMQ setup: confirmed; select ElastiCache node-based Redis OSS topology and compatible version; test noeviction policy, persistence/recovery and worker retry behavior.
4. Gmail SMTP configuration: confirmed; choose the sending Gmail account and sender alias, create its App Password, and plan for the daily sending limit. Gmail also delivers verification and password-reset emails.
5. **Media quotas:** define whether 5 GB counts originals and derivatives (recommended: count all retained bytes), per-image cap, allowed formats, export retention and actual S3 billing monitoring.
6. **Photo privacy:** approve CDN cache TTL/purge strategy for emergency hides/unpublishing, retention and abuse review processes.
7. **Operations:** choose observability, backup recovery objective, deletion grace period, and provider-account ownership.

Proposed engineering defaults: first-party NestJS authentication (Argon2id + MongoDB opaque sessions); MongoDB Atlas/Mongoose; REST/OpenAPI; Redis/BullMQ with MongoDB transactional outbox and ElastiCache node-based Redis; private S3 with CloudFront approved-media delivery; Gmail SMTP; AWS ECS Fargate for web/API/worker. Provider versions and region should be pinned only after a cost and compatibility check.

# 12. Decision and Delivery Sequence

Recommendation: Proceed with Next.js + NestJS modular monolith, MongoDB Atlas, Redis/BullMQ, Gmail SMTP and private AWS S3, hosting the application on AWS. Authentication is owned by our NestJS AuthModule: no Cognito or hosted identity dependency. Begin with the secure identity/tenancy foundation, then planning, guests/public site and media. Confirm AWS resource shape, Atlas tier and monthly spend alerts before production rollout.

| **Milestone** | **Deliverable** | **Exit criteria** |
|---|---|---|
| M1 - Foundation | Monorepo, deployable Next/Nest services, Mongo indexes, auth/session, membership guards, wedding lifecycle | Owner active uniqueness proven under concurrency; protected endpoints fail closed |
| M2 - Planning | Events/timelines, tasks, vendors, expenses/payments, dashboards, audit | Full organizer CRUD and multi-wedding isolation tests pass |
| M3 - Guests & public site | Guests, invitation link/session, event RSVP, email/outbox, three templates, public projection | End-to-end RSVP/headcount and public-vs-private tests pass |
| M4 - Media & pilot | S3 direct upload, moderation, 5 GB quota, exports, CDN, monitoring and archive tests | Security review, S3 quota reconciliation, restore test and real family pilot sign-off |

**Release gate:** No public launch until tenant isolation, active-owner uniqueness, token revocation, RSVP bounds, no-PII public projection, private S3 posture, upload moderation, reminder idempotency, archive restrictions and backup recovery have been tested. The PRD remains the authority for product behavior; this RFC is the authority for technical approach after engineering approval.

# Appendix A. Suggested request/response errors and permissions

| **Error** | **HTTP** | **Meaning / client action** |
|---|---|---|
| VALIDATION_ERROR | 400 | Invalid fields, party size, date or upload metadata |
| UNAUTHENTICATED | 401 | Organizer session required |
| INVITATION_INVALID | 401/410 | Guest token missing, expired or revoked; contact organizer |
| FORBIDDEN | 403 | User/member cannot access this wedding or action |
| NOT_FOUND | 404 | Resource absent or intentionally hidden across tenants |
| OWNER_ACTIVE_LIMIT | 409 | Account already owns another active wedding |
| VERSION_CONFLICT | 409 | RSVP/edit changed concurrently; reload latest version |
| WEDDING_ARCHIVED | 409 | Read-only wedding cannot accept planning/RSVP/upload mutation |
| QUOTA_EXCEEDED | 409/413 | No remaining wedding storage; show remaining bytes |
| RATE_LIMITED | 429 | Abuse-control limit; retry later |
| DEPENDENCY_UNAVAILABLE | 503 | Database, storage or provider unavailable |

**Guard composition:** SessionAuthGuard + WeddingMemberGuard + RoleGuard + WeddingEditableGuard for organizer mutations. Guest routes use InvitationScopeGuard; upload routes use UploadCapabilityGuard. No role values from the browser are trusted without stored membership verification.

# Appendix B. Acceptance / failure-injection test set

- Race two requests creating or accepting second co-ownership for same user: at most one succeeds; MongoDB index and transaction enforce rule.
- Manager membership across three weddings: access is wedding-scoped; no implicit ownership and no cross-wedding access.
- Archive wedding during an RSVP update: no RSVP commits after archive; owners retain only safety/unpublish/delete paths.
- Contact partySize 5, RSVP Haldi 3 and Wedding 5: counts correct; reducing partySize to 2 is rejected pending conflict resolution.
- Guest opens forwarded invitation link: gets same scope; separate public wedding link reveals no recipient identity; revoked token stops working.
- Public page data inspection: no contact email, organizer note, invitation secret, payment, private S3 key or manager-only details.
- Concurrent quota reservations: aggregate used+reserved never exceeds 5 GB; failed uploads release their reservations after expiry.
- Presigned PUT replay: cannot replace or corrupt a previously published immutable derivative.
- Unapproved photo inserted into quarantine: never accessible from public origin/CDN; approval required.
- Photo hidden and site unpublished: public API hides immediately and CDN purge completes within accepted TTL.
- Reminder job retried after worker crash: dedupe prevents repeated intentional sends; status and provider uncertainty surfaced.
- Mongo database unavailable: permission-sensitive requests fail closed; app shows recoverable error.
- Email provider outage: queued notifications visible, attempts retried, no claims of confirmed delivery.
- Restore backup into isolated staging: wedding, RSVP and media pointers verify correctly, no test emails sent.

# Appendix C. Technical references

- [NEST-1] NestJS MongoDB/Mongoose — official guidance
- [NEXT-1] Next.js security — official guidance
- [NEXT-2] Next.js BFF boundaries — official guidance
- [MONGO-1] MongoDB transaction requirements — official guidance
- [AWS-1] S3 Object Ownership and public access — official guidance
- [AWS-2] S3 presigned URL behavior — official guidance
- [BULL-1] BullMQ — idempotent jobs and job schedulers

Document status: v1.1 proposed for engineering implementation review. Confirmed: Next.js, NestJS, MongoDB Atlas, AWS hosting/S3, Redis + BullMQ, Gmail SMTP and in-house NestJS authentication. Implementation choices such as AWS ECS versus Amplify hosting, ElastiCache sizing, CDN, region and budget remain to be approved.
