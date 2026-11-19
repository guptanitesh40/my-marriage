# MY MARRIAGE

MongoDB Schema & Data Model

Engineering design specification  |  Version 1.0  |  13 November 2026

Implementation baseline for the approved PRD v1.0 and System Design & Architecture v1.1. Technology choices: NestJS, MongoDB Atlas, Mongoose (recommended), AWS S3, Redis/BullMQ, Gmail SMTP and in-house authentication.

| **DESIGN STATUS** | **DATABASE** | **SOURCE OF TRUTH** |
|---|---|---|
| Proposed for engineering review | MongoDB Atlas replica set | NestJS services and their validated collections |
| Collection catalog: 29 | ObjectId IDs; UTC Date fields | Public views generated from allowlisted DTOs |

## Scope and review focus

- Collection structures and required/optional fields with BSON-level expectations.
- Unique indexes, tenant-scoped query indexes, expiry and audit retention rules.
- Multi-document transactions for ownership, RSVP/archiving, expenses and S3 quotas.
- Guest bearer-link privacy, S3 asset metadata boundaries and reliable email processing.
- Versioning, migrations, test cases and open engineering policy choices.

# 1. Executive design summary

The application uses one MongoDB Atlas database with wedding-scoped collections, not one database per wedding. The NestJS modular monolith owns all writes and authorization. User accounts are global; weddings are tenants. Almost every business record carries weddingId, which is checked against authenticated membership or a narrowly scoped guest/upload capability.

Frequently edited items (tasks, payments, event invitations, photos, notifications) are stored as separate documents. Small fixed structures such as venue addresses, RSVP current state and wedding quota counters are embedded. Public pages receive sanitized projections rather than raw MongoDB documents.

| **DESIGN RULE** | **IMPLEMENTATION CONSEQUENCE** |
|---|---|
| One active owned wedding | Unique partial index on wedding_memberships.userId when role=owner, status=active and activeOwned=true. |
| Two equal owners maximum | Application transaction checks owner count; pending owner invitation does not block first owner. |
| Managers across weddings | Unique active-owner rule does not apply to manager memberships. |
| One party size per guest | guest_contacts.partySize is canonical; event_invitations embed per-event RSVP, not invited party size. |
| Forwardable invite links | invitation_tokens store only secret hashes; any link holder can access invited events. |
| 5 GB image quota | weddings.quota used/reserved counters; upload_intents reserve, verify, settle and reconcile bytes. |
| Archived is read-only | Wedding state guard + write fence in mutation transactions; owner privacy/safety exceptions. |
| Out-of-band side effects | Domain write + outbox insert transaction; BullMQ worker may retry idempotently. |

Important: MongoDB TTL cleanup is not an access-control mechanism. The API must check expiresAt/status explicitly and treat a document as invalid as soon as its expiry time passes.

## 1.1 Data model map

| **DOMAIN** | **PRIMARY ENTITY FLOW / RELATIONSHIP** |
|---|---|
| Identity | users -> auth_sessions / auth_action_tokens |
| Teams | users -> wedding_memberships -> weddings <- membership_invites |
| Ceremonies | weddings -> events -> event_timeline_items; tasks and vendors relate to event IDs |
| Expenses | weddings -> expenses -> expense_payments; expense optionally references vendor / event |
| Guests | weddings -> guest_contacts -> event_invitations -> events; invitation_tokens -> guest_sessions |
| Website | weddings -> website_configs; website public DTOs are read projections |
| Media | weddings -> albums -> photos; upload_capabilities -> upload_intents; S3 holds object bytes |
| Background | notifications + outbox_events -> Redis/BullMQ worker -> Gmail SMTP; audit_events record changes |

# 2. Types, naming and common validation

- All _id and reference fields use BSON ObjectId; foreign keys are validated by NestJS because MongoDB does not enforce them.
- Every wedding-owned document uses weddingId: ObjectId and wedding-scoped query filters. Never authorize a document solely by its _id.
- Mongoose schemas use timestamps and explicit strict mode, a schemaVersion where future migrations need it, and a separate revision/responseVersion where compare-and-set updates are required.
- All instants are BSON Date in UTC, with event.timeZone set to an IANA identifier (Asia/Kolkata default). Rendering applies event timezone.
- Money is modeled in integer paise. If using JS Number, enforce Number.isSafeInteger, nonnegative bounds and max safe integer. No fractional paise; Decimal128/BSON Long may replace Number if higher-range needs emerge.
- Enums are wire-contract literals, not human UI labels; changes require migrations and API compatibility review.
- Normalize user and invitation email strings consistently. Guest email is optional and nonunique within the wedding; never create a global guest email uniqueness index.
- Store secrets as hashes (session, reset, invite and QR). Never store complete URL tokens, S3 presigned URLs, password plaintext or SMTP passwords.
- Use bounded embedded objects for venues, site content and current RSVP; use separate collections for unbounded member lists, payments, guests, comments, photos or audit history.
- For nullable optional IDs, omit missing fields rather than relying on mixed null/missing behavior in unique indexes.

## 2.1 Standard field convention

| **FIELD** | **TYPE** | **APPLIES TO / RULE** |
|---|---|---|
| _id | ObjectId | MongoDB native identifier. |
| weddingId | ObjectId | Required on every wedding-owned business collection. |
| createdAt / updatedAt | Date | Timestamps where records are editable; append-only records may need createdAt only. |
| schemaVersion | int | Optional explicit version number for evolving serialized data. |
| revision / responseVersion | int | Explicit concurrency guard; must be incremented by business write. |
| status / state | enum | Prefer one canonical name per domain; never overload archive with delete. |
| ...Hash | string | One-way digest of random bearer secret; raw value sent once. |
| ...Bytes | integer | Actual verified or reserved byte counters. |
| ...Paise | safe integer | Currency INR minor units; exact integer arithmetic. |

# 3. Complete collection catalog

The following collections cover both user-facing features and minimal operational reliability. Collections marked by support workflows (e.g. outbox events and deletion jobs) are implementation enablers, not new product features.

## Identity & access

| **COLLECTION** | **PURPOSE** |
|---|---|
| users | Canonical user account. No third-party authentication provider. |
| auth_sessions | Server-side organizer sessions with opaque browser cookies. |
| auth_action_tokens | Email verification, password reset and optional email-change tokens. |

## Wedding & membership

| **COLLECTION** | **PURPOSE** |
|---|---|
| weddings | Top-level wedding and strongly consistent lifecycle / quota state. |
| wedding_memberships | One user membership per wedding; ownership protection lives here. |
| membership_invites | Pending owner/manager invitations scoped to a wedding. |

## Wedding planning

| **COLLECTION** | **PURPOSE** |
|---|---|
| events | Wedding ceremonies with distinct schedule, venue and livestream. |
| event_timeline_items | Hour-by-hour schedule entries independent of event document. |
| tasks | Individual tasks; do not embed growing task arrays in wedding. |
| vendors | Private vendor contacts and ceremony associations. |
| expenses | Expense identity and amount; payments stored separately. |
| expense_payments | Immutable payment ledger; adjust by correction records, not silent overwrite. |

## Guests & invitations

| **COLLECTION** | **PURPOSE** |
|---|---|
| guest_contacts | One named guest contact representing an invited group. |
| event_invitations | Single invitation per guest and event, with embedded current RSVP. |
| invitation_tokens | One revocable high-entropy bearer link scoped to a primary guest contact. |
| guest_sessions | Short-lived scoped cookie after exchanging an invitation link. |

## Website & media

| **COLLECTION** | **PURPOSE** |
|---|---|
| website_configs | One site configuration per wedding; published content allowlisted. |
| albums | Event-specific or general photo folders. |
| upload_capabilities | Separate hashed QR/upload links, independently revocable. |
| upload_intents | Durable presigned upload lifecycle + quota reservation. |
| photos | Image metadata only; actual bytes reside in S3. |
| file_assets | Other private images/files: receipts, profiles, and wedding cover uploads. |
| media_exports | Asynchronous authorized gallery exports and temporary ZIP files. |

## Messaging & operations

| **COLLECTION** | **PURPOSE** |
|---|---|
| notifications | Outbound email intention and provider delivery state. |
| outbox_events | Transactional durable side-effect intentions for BullMQ workers. |
| audit_events | Append-only access-safe audit log for sensitive changes. |
| idempotency_keys | Prevent duplicated effects for retried client mutation requests. |
| deletion_jobs | Track cross-system account/wedding deletion and S3 purge progress. |

# 4. Collection field dictionaries

Notation: ? = optional; / required = mandatory on insert; types are MongoDB BSON representations (Mongoose equivalent types must be chosen deliberately). Global _id and timestamps apply as stated above, even where omitted from individual rows. Index descriptions are implementation directives, not all runtime code.

## Identity & access

### 4.01  users

Canonical user account. No third-party authentication provider.

| **FIELD** | **BSON / RULE** | **MEANING / VALIDATION** |
|---|---|---|
| emailNormalized | string / required | Lowercased, trimmed unique sign-in identity; never public. |
| displayName | string / required | Name displayed in private team directory. |
| passwordHash | string / required | Argon2id hash only; no plaintext or reversible passwords. |
| verifiedAt | date? | Set after email verification; null/missing means unverified. |
| profileAssetId | ObjectId? | Optional reference to protected profile/asset record. |
| status | enum / required | active \| disabled \| deletion_pending; default active. |
| passwordChangedAt | date? | Used for session invalidation policy. |
| createdAt, updatedAt | date / required | Mongoose timestamps on creation and writes. |

Indexes: UNIQUE(emailNormalized); INDEX(status, createdAt).

### 4.02  auth_sessions

Server-side organizer sessions with opaque browser cookies.

| **FIELD** | **BSON / RULE** | **MEANING / VALIDATION** |
|---|---|---|
| userId | ObjectId / required | References users; validate active user on protected access. |
| sessionHash | string / required | Hash/HMAC of opaque session secret; unique. |
| expiresAt | date / required | Absolute expiration; TTL cleanup, server checks time. |
| revokedAt | date? | If set, block immediately even before TTL cleanup. |
| lastSeenAt | date? | Optional activity time, updated with throttling. |
| userAgentSummary, ipHash | string? | Minimized metadata; no raw IP if avoidable. |
| createdAt | date / required | Session creation time. |

Indexes: UNIQUE(sessionHash); INDEX(userId, expiresAt); TTL(expiresAt, expireAfterSeconds: 0).

### 4.03  auth_action_tokens

Email verification, password reset and optional email-change tokens.

| **FIELD** | **BSON / RULE** | **MEANING / VALIDATION** |
|---|---|---|
| userId | ObjectId / required | User to verify or reset. |
| purpose | enum / required | verify_email \| reset_password \| change_email. |
| tokenHash | string / required | Hashed random single-use token; unique. |
| destinationEmailNormalized | string? | For email change; not available to public clients. |
| expiresAt | date / required | Always checked at request time; TTL cleanup is eventual. |
| consumedAt, revokedAt | date? | Single-use and revocable states. |
| createdAt | date / required | Creation timestamp. |

Indexes: UNIQUE(tokenHash); INDEX(userId,purpose); TTL(expiresAt, 0).

## Wedding & membership

### 4.04  weddings

Top-level wedding and strongly consistent lifecycle / quota state.

| **FIELD** | **BSON / RULE** | **MEANING / VALIDATION** |
|---|---|---|
| slug | string / required | Lowercase URL slug; globally unique; slug changes need redirect plan. |
| brideName, groomName | string / required | Names required to create workspace. |
| city, state | string / required | Wedding location; English text initially. |
| weddingDate | date? | Tentative date; optional until known. |
| mainVenue | object? | Optional venue name, address and mapsUrl. |
| description | string? | Optional story/introduction; public use via safe projection only. |
| coverAssetId | ObjectId? | Photo asset reference, not raw S3 URL. |
| status | enum / required | active \| archived \| deletion_pending. |
| archivedAt, archivedBy | date?, ObjectId? | Owner-only archival metadata. |
| writeFenceVersion | int / required | Increment in same transaction as each archive-sensitive mutation. |
| quota | object / required | limitBytes, usedBytes, reservedBytes; nonnegative invariant. |
| createdBy | ObjectId / required | First owner who established wedding. |
| createdAt, updatedAt | date / required | Document timestamps. |

Indexes: UNIQUE(slug); INDEX(status,createdAt); compare-and-update on status+writeFenceVersion.

### 4.05  wedding_memberships

One user membership per wedding; ownership protection lives here.

| **FIELD** | **BSON / RULE** | **MEANING / VALIDATION** |
|---|---|---|
| weddingId | ObjectId / required | Parent wedding. |
| userId | ObjectId / required | User account. |
| role | enum / required | owner \| manager. |
| status | enum / required | active \| removed. |
| activeOwned | bool / required | True only for active owner membership; indexed constraint. |
| joinedAt | date / required | Accepted membership date. |
| removedAt, removedBy | date?, ObjectId? | Revocation audit. |
| createdAt, updatedAt | date / required | Timestamps. |

Indexes: UNIQUE(weddingId,userId); UNIQUE(userId) PARTIAL(role=owner, status=active, activeOwned=true); INDEX(weddingId,status,role).

### 4.06  membership_invites

Pending owner/manager invitations scoped to a wedding.

| **FIELD** | **BSON / RULE** | **MEANING / VALIDATION** |
|---|---|---|
| weddingId | ObjectId / required | Target wedding. |
| emailNormalized | string / required | Invitation destination; checked at acceptance. |
| role | enum / required | owner \| manager; owner count capped at two. |
| tokenHash | string / required | Hash of invite capability; never log raw token. |
| status | enum / required | pending \| accepted \| revoked \| expired. |
| expiresAt | date / required | Checked transactionally on acceptance. |
| invitedBy, acceptedBy | ObjectId, ObjectId? | Audit actors. |
| createdAt, acceptedAt | date, date? | Invite lifecycle metadata. |

Indexes: UNIQUE(tokenHash); INDEX(weddingId,status); INDEX(emailNormalized,status); do not TTL-delete unresolved audit record.

## Wedding planning

### 4.07  events

Wedding ceremonies with distinct schedule, venue and livestream.

| **FIELD** | **BSON / RULE** | **MEANING / VALIDATION** |
|---|---|---|
| weddingId | ObjectId / required | Tenant-scoped parent. |
| title | string / required | Presets or custom name. |
| description | string? | Public ceremony description; sanitized in website projection. |
| startAt, endAt | date? | UTC instants; may be unset while planning. |
| timeZone | string / required | IANA timezone; default Asia/Kolkata. |
| venue | object? | name, address, mapsUrl, optional coordinates. |
| dressCode | string? | Optional public detail. |
| state | enum / required | scheduled \| completed \| cancelled. |
| managerIds | ObjectId[] | Bounded subset of active wedding members. |
| livestream | object? | provider youtube; validated external URL. |
| scheduleVersion | int / required | Increment on event changes affecting reminder scheduling. |
| createdAt, updatedAt | date / required | Timestamps. |

Indexes: INDEX(weddingId,startAt); INDEX(weddingId,state); use controlled public DTOs.

### 4.08  event_timeline_items

Hour-by-hour schedule entries independent of event document.

| **FIELD** | **BSON / RULE** | **MEANING / VALIDATION** |
|---|---|---|
| weddingId, eventId | ObjectId / required | Event and tenant context. |
| startsAt | date / required | Timestamp in UTC; UI uses event.timeZone. |
| endsAt | date? | Optional item finish time. |
| position | int / required | Sort tiebreaker; nonnegative. |
| title | string / required | Agenda description. |
| details | string? | Optional notes; separate internal/public disclosure rule. |
| responsibleUserId | ObjectId? | Active wedding member if assigned. |
| createdAt, updatedAt | date / required | Timestamps. |

Indexes: INDEX(weddingId,eventId,startsAt,position).

### 4.09  tasks

Individual tasks; do not embed growing task arrays in wedding.

| **FIELD** | **BSON / RULE** | **MEANING / VALIDATION** |
|---|---|---|
| weddingId | ObjectId / required | Tenant context. |
| eventId | ObjectId? | Optional associated ceremony. |
| title | string / required | Human-readable task title. |
| description | string? | Additional notes. |
| assigneeId | ObjectId? | Must be active owner/manager in wedding. |
| dueAt | date? | Optional deadline in UTC. |
| priority | enum / required | low \| normal \| high; default normal. |
| state | enum / required | todo \| in_progress \| completed \| cancelled. |
| completedAt, completedBy | date?, ObjectId? | Written on completion. |
| createdBy | ObjectId / required | Audit actor. |
| createdAt, updatedAt | date / required | Timestamps. |

Indexes: INDEX(weddingId,assigneeId,state,dueAt); INDEX(weddingId,eventId,dueAt); INDEX(weddingId,state,dueAt).

### 4.10  vendors

Private vendor contacts and ceremony associations.

| **FIELD** | **BSON / RULE** | **MEANING / VALIDATION** |
|---|---|---|
| weddingId | ObjectId / required | Tenant context. |
| name | string / required | Vendor / company name. |
| category | string / required | Photography, catering, venue, etc. |
| contactName | string? | Representative. |
| phone, email | string? | Private contact details. |
| address, notes | string? | Private vendor notes. |
| eventIds | ObjectId[] | Bounded array of linked wedding events. |
| createdAt, updatedAt | date / required | Timestamps. |

Indexes: INDEX(weddingId,name); INDEX(weddingId,category); INDEX(weddingId,eventIds).

### 4.11  expenses

Expense identity and amount; payments stored separately.

| **FIELD** | **BSON / RULE** | **MEANING / VALIDATION** |
|---|---|---|
| weddingId | ObjectId / required | Tenant context. |
| eventId, vendorId | ObjectId? | References event/vendor in same wedding. |
| title, category | string / required | Expense description and category. |
| amountPaise | number / required | Safe nonnegative integer in paise; never decimal floats. |
| paidPaise | number / derived | Optional cached sum of payments; reconciled transactionally. |
| dueAt | date? | Optional due date. |
| receiptAssetIds | ObjectId[] | Private files only; not part of public gallery. |
| notes | string? | Organizer-only notes. |
| createdAt, updatedAt | date / required | Timestamps. |

Indexes: INDEX(weddingId,eventId); INDEX(weddingId,vendorId); INDEX(weddingId,dueAt).

### 4.12  expense_payments

Immutable payment ledger; adjust by correction records, not silent overwrite.

| **FIELD** | **BSON / RULE** | **MEANING / VALIDATION** |
|---|---|---|
| weddingId, expenseId | ObjectId / required | Tenant + parent expense. |
| amountPaise | number / required | Positive safe integer, in paise. |
| entryType | enum / required | payment \| reversal; reversals subtract from recorded paid total. |
| paidAt | date / required | Payment date. |
| method | enum? | cash \| bank_transfer \| card \| cheque \| other. |
| note | string? | Optional context. |
| recordedBy | ObjectId / required | Organizer who recorded transaction. |
| reversalOfId | ObjectId? | Reference to compensated entry, if adjustment needed. |
| createdAt | date / required | Historical record time. |

Indexes: INDEX(weddingId,expenseId,paidAt); INDEX(weddingId,paidAt).

## Guests & invitations

### 4.13  guest_contacts

One named guest contact representing an invited group.

| **FIELD** | **BSON / RULE** | **MEANING / VALIDATION** |
|---|---|---|
| weddingId | ObjectId / required | Tenant context. |
| name | string / required | Primary recipient, e.g. oldest family member. |
| partySize | int / required | Integer >= 1; shared across every selected event. |
| emailNormalized, phone | string? | Email optional for manual WhatsApp link delivery. |
| organizerNotes | string? | Private, never returned to guest/public DTO. |
| reminderOptOutAt | date? | Suppress future guest reminders. |
| status | enum / required | active \| removed; removed disables private links. |
| createdAt, updatedAt | date / required | Timestamps. |

Indexes: INDEX(weddingId,name); INDEX(weddingId,emailNormalized) nonunique; INDEX(weddingId,status).

### 4.14  event_invitations

Single invitation per guest and event, with embedded current RSVP.

| **FIELD** | **BSON / RULE** | **MEANING / VALIDATION** |
|---|---|---|
| weddingId, guestId, eventId | ObjectId / required | All three point to same wedding. |
| isInvited | bool / required | True when organizer selected event; false if revoked. |
| rsvp.status | enum / required | pending \| attending \| not_attending \| maybe. |
| rsvp.attendingCount | int? | For attending: 1..guest.partySize; declined 0; pending/maybe null. |
| rsvp.respondedAt | date? | Time of last response. |
| rsvp.responseVersion | int / required | Optimistic concurrency version, monotonically increasing. |
| invitedAt, invitedBy | date, ObjectId | Invitation audit. |
| updatedAt | date / required | Last invitation or RSVP update. |

Indexes: UNIQUE(weddingId,guestId,eventId); INDEX(weddingId,eventId,isInvited,rsvp.status); INDEX(weddingId,guestId).

### 4.15  invitation_tokens

One revocable high-entropy bearer link scoped to a primary guest contact.

| **FIELD** | **BSON / RULE** | **MEANING / VALIDATION** |
|---|---|---|
| weddingId, guestId | ObjectId / required | Tenant and invitation contact scope. |
| tokenHash | string / required | HMAC/SHA-256 digest of random token; not raw token. |
| status | enum / required | active \| revoked. |
| revokedAt | date? | Blocks new exchanges and guest session authorization. |
| createdBy, createdAt | ObjectId, date | Issuer and issuance date. |
| expiresAt | date? | Optional policy field; no automatic expiry required by product. |
| lastUsedAt | date? | Optional minimized audit value. |

Indexes: UNIQUE(tokenHash); INDEX(weddingId,guestId,status); NO TTL for active invitation links.

### 4.16  guest_sessions

Short-lived scoped cookie after exchanging an invitation link.

| **FIELD** | **BSON / RULE** | **MEANING / VALIDATION** |
|---|---|---|
| tokenId | ObjectId / required | References invitation_tokens document. |
| weddingId, guestId | ObjectId / required | Guest capability scope, not organizer privileges. |
| sessionHash | string / required | Hashed opaque scoped session cookie. |
| expiresAt | date / required | Short lifetime checked on each RSVP mutation. |
| revokedAt | date? | Optional explicit revocation. |
| createdAt | date / required | Creation timestamp. |

Indexes: UNIQUE(sessionHash); INDEX(tokenId,expiresAt); TTL(expiresAt,0).

## Website & media

### 4.17  website_configs

One site configuration per wedding; published content allowlisted.

| **FIELD** | **BSON / RULE** | **MEANING / VALIDATION** |
|---|---|---|
| weddingId | ObjectId / required | Unique wedding ownership. |
| templateId | enum / required | traditional \| modern \| royal. |
| content | object / required | Story, FAQ, hero, theme variables; bounded size. |
| published | bool / required | Explicit publish/unpublish state. |
| publishedAt | date? | First/current publish timestamp. |
| contentVersion | int / required | Invalidation/versioning for public projection. |
| lastPublishedBy | ObjectId? | Organizer publisher. |
| updatedAt | date / required | Update timestamp. |

Indexes: UNIQUE(weddingId); public projection must filter wedding.status/site publication.

### 4.18  albums

Event-specific or general photo folders.

| **FIELD** | **BSON / RULE** | **MEANING / VALIDATION** |
|---|---|---|
| weddingId | ObjectId / required | Tenant context. |
| eventId | ObjectId? | Event album or null for general/custom album. |
| title | string / required | Album label; public once wedding is published. |
| kind | enum / required | event \| custom \| general. |
| isUploadEnabled | bool / required | Can be toggled/disabled independently. |
| sortOrder | int / required | Display order. |
| createdAt, updatedAt | date / required | Timestamps. |

Indexes: INDEX(weddingId,eventId); INDEX(weddingId,kind,sortOrder).

### 4.19  upload_capabilities

Separate hashed QR/upload links, independently revocable.

| **FIELD** | **BSON / RULE** | **MEANING / VALIDATION** |
|---|---|---|
| weddingId, albumId | ObjectId / required | Allowed wedding and album. |
| tokenHash | string / required | Hashed random QR upload token. |
| status | enum / required | active \| revoked. |
| expiresAt | date? | Optional expiration. |
| rotatedFromId | ObjectId? | Link rotation history. |
| createdBy, createdAt | ObjectId, date | Issuer metadata. |

Indexes: UNIQUE(tokenHash); INDEX(weddingId,albumId,status).

### 4.20  upload_intents

Durable presigned upload lifecycle + quota reservation.

| **FIELD** | **BSON / RULE** | **MEANING / VALIDATION** |
|---|---|---|
| weddingId, albumId | ObjectId / required | Target wedding and album. |
| capabilityId | ObjectId? | Upload QR capability; null for organizer initiated. |
| s3StagingKey | string / required | Server-generated immutable staging object key. |
| declaredBytes, reservedBytes | number / required | Safe integer amounts; reserve original + conservative derivative budget. |
| verifiedBytes | number? | HEAD/checksum checked actual size. |
| mimeType, originalName | string / required | Display filename sanitized; never trust declared type. |
| state | enum / required | initiated \| uploaded \| processing \| complete \| failed \| expired. |
| expiresAt | date / required | Controls upload URL acceptance and cleanup eligibility. |
| photoId | ObjectId? | Photo record created after successful processing. |
| createdAt, updatedAt | date / required | Timestamps. |

Indexes: INDEX(weddingId,state,expiresAt); INDEX(expiresAt); no TTL before S3 cleanup / quota release.

### 4.21  photos

Image metadata only; actual bytes reside in S3.

| **FIELD** | **BSON / RULE** | **MEANING / VALIDATION** |
|---|---|---|
| weddingId, albumId | ObjectId / required | Tenant and album scope. |
| eventId | ObjectId? | Denormalized for album filtering, validated on creation. |
| originalKey | string / required | Private S3 object key. |
| derivativeKeys | object / required | Private preview and published image key(s). |
| byteCounts | object / required | Original + retained derivative byte sizes. |
| mimeType, width, height | string,int,int | Validated image metadata. |
| moderation | enum / required | pending \| approved \| rejected \| hidden \| deleted. |
| uploaderName | string? | Optional contributor display name, public only if approved. |
| approvedBy, approvedAt | ObjectId?,date? | Review audit. |
| createdAt, updatedAt | date / required | Timestamps. |

Indexes: INDEX(weddingId,albumId,moderation,createdAt); INDEX(weddingId,moderation); no TTL.

### 4.22  file_assets

Other private images/files: receipts, profiles, and wedding cover uploads.

| **FIELD** | **BSON / RULE** | **MEANING / VALIDATION** |
|---|---|---|
| weddingId | ObjectId? | Wedding asset when applicable; user profile asset may be user-scoped. |
| ownerUserId | ObjectId? | Owner for account-scoped assets. |
| kind | enum / required | cover \| receipt \| profile. |
| s3Key | string / required | Private S3 object path. |
| contentType, bytes | string,number | Verified content type and byte count. |
| state | enum / required | active \| deleted. |
| createdAt, updatedAt | date / required | Timestamps. |

Indexes: INDEX(weddingId,kind); INDEX(ownerUserId,kind); separate permissions from public gallery.

### 4.23  media_exports

Asynchronous authorized gallery exports and temporary ZIP files.

| **FIELD** | **BSON / RULE** | **MEANING / VALIDATION** |
|---|---|---|
| weddingId, requestedBy | ObjectId / required | Wedding and authorized actor. |
| scope | object / required | all \| approved \| album selection. |
| state | enum / required | queued \| processing \| ready \| failed \| expired. |
| exportS3Key | string? | Private export key; downloads must be signed. |
| expiresAt | date? | Cleanup time; not automatic photo retention limit. |
| createdAt, finishedAt | date,date? | Job lifecycle. |

Indexes: INDEX(weddingId,createdAt); INDEX(state,expiresAt); sweeper removes S3 files before metadata cleanup.

## Messaging & operations

### 4.24  notifications

Outbound email intention and provider delivery state.

| **FIELD** | **BSON / RULE** | **MEANING / VALIDATION** |
|---|---|---|
| weddingId | ObjectId? | Context; identity emails may be account-scoped. |
| guestId, eventId | ObjectId? | Optional reminder target and event. |
| userId | ObjectId? | For auth/member messages. |
| kind | enum / required | verify_email \| password_reset \| member_invite \| guest_invite \| reminder \| export_ready. |
| recipientEmailNormalized | string / required | Private delivery address, never public. |
| dueAt, scheduleVersion | date,int? | Reminder schedule and revision. |
| idempotencyKey | string / required | Stable unique key for logical delivery. |
| state | enum / required | queued \| processing \| sent \| delivered \| bounced \| failed \| suppressed. |
| providerMessageId | string? | Message-ID of the accepted email, unique when present. |
| attempts, lastErrorCode | int,string? | Retry observation; redact provider error PII. |
| createdAt, updatedAt | date / required | Timestamps. |

Indexes: UNIQUE(idempotencyKey); UNIQUE(providerMessageId) PARTIAL(string exists); INDEX(state,dueAt).

### 4.25  (removed)

Formerly the email provider's webhook receipts. Email is sent over Gmail SMTP, which reports no delivery events, so there are no callbacks to deduplicate (decision 0007).

### 4.26  outbox_events

Transactional durable side-effect intentions for BullMQ workers.

| **FIELD** | **BSON / RULE** | **MEANING / VALIDATION** |
|---|---|---|
| weddingId | ObjectId? | Optional tenant context. |
| eventType | string / required | Domain event name, versioned. |
| aggregateId | ObjectId / required | Changed resource identifier. |
| payloadRef | object / required | Minimal identifiers and version, no raw secrets. |
| state | enum / required | pending \| claimed \| published \| failed. |
| nextAttemptAt | date / required | Relay eligibility time. |
| attempts | int / required | Retry count. |
| createdAt, publishedAt | date,date? | Lifecycle timing. |

Indexes: INDEX(state,nextAttemptAt); INDEX(weddingId,createdAt).

### 4.27  audit_events

Append-only access-safe audit log for sensitive changes.

| **FIELD** | **BSON / RULE** | **MEANING / VALIDATION** |
|---|---|---|
| weddingId | ObjectId? | Wedding context, or absent for account-level operation. |
| actorUserId | ObjectId? | User, or system when job-generated. |
| action | string / required | Event such as wedding.archived or guest.rsvp.changed. |
| entityType, entityId | string,ObjectId? | Affected entity details. |
| safeDiff | object? | Allowlisted changes; never secrets, tokens, full PII. |
| requestId, occurredAt | string,date | Correlation and event date. |
| createdAt | date / required | Write timestamp. |

Indexes: INDEX(weddingId,occurredAt); INDEX(actorUserId,occurredAt); NO blanket TTL.

### 4.28  idempotency_keys

Prevent duplicated effects for retried client mutation requests.

| **FIELD** | **BSON / RULE** | **MEANING / VALIDATION** |
|---|---|---|
| keyHash | string / required | Hash of endpoint-scoped client idempotency key. |
| actorScope | string / required | Scoped to authenticated user / invitation capability. |
| route, requestDigest | string / required | Bind key to method/path/normalized body. |
| responseStatus, responseBodyRef | int?,object? | Safely replay result after successful commit. |
| state | enum / required | processing \| completed \| failed. |
| expiresAt | date / required | TTL expiry; never used to bypass transaction dedupe. |
| createdAt | date / required | Timestamp. |

Indexes: UNIQUE(actorScope,keyHash); TTL(expiresAt,0), server checks expiry.

### 4.29  deletion_jobs

Track cross-system account/wedding deletion and S3 purge progress.

| **FIELD** | **BSON / RULE** | **MEANING / VALIDATION** |
|---|---|---|
| weddingId, requestedBy | ObjectId / required | Owner-requested wedding deletion context. |
| state | enum / required | requested \| purging \| verified \| failed. |
| requestedAt, completedAt | date,date? | Processing timeline. |
| steps | object / required | Mongo, S3, CDN, caches and sessions cleanup state. |
| lastErrorCode | string? | Safe error summary. |
| createdAt, updatedAt | date / required | Audit lifecycle. |

Indexes: INDEX(weddingId,createdAt); INDEX(state,requestedAt); explicit retention/deletion policy required.

# 5. Index and uniqueness migration plan

Create unique indexes before accepting production data. Index builds can fail if existing documents violate uniqueness. Treat index scripts as versioned migrations; never rely solely on Mongoose autoIndex in production.

| **PRIORITY** | **COLLECTION / INDEX** | **WHAT IT GUARANTEES** |
|---|---|---|
| P0 | users: UNIQUE(emailNormalized) | No duplicate account email. |
| P0 | wedding_memberships: UNIQUE(weddingId,userId) | At most one membership per user within one wedding. |
| P0 | wedding_memberships: UNIQUE(userId) with partial active owner filter | At most one active owned wedding across all weddings. |
| P0 | weddings: UNIQUE(slug) | Unique published/reserved wedding URL. |
| P0 | event_invitations: UNIQUE(weddingId,guestId,eventId) | One RSVP record per guest contact and event. |
| P0 | website_configs: UNIQUE(weddingId) | One website config per wedding. |
| P0 | invitation_tokens, upload_capabilities, sessions: UNIQUE(tokenHash/sessionHash) | Secret lookup and no duplicate secret hashes. |
| P0 | notifications: UNIQUE(idempotencyKey) | One logical reminder/email task per logical key. |
| P1 | events: (weddingId,startAt) | Chronological ceremony listing. |
| P1 | tasks: (weddingId,assigneeId,state,dueAt) | My Tasks and status filters. |
| P1 | guest_contacts: (weddingId,name) | Organizer search by name. |
| P1 | event_invitations: (weddingId,eventId,isInvited,rsvp.status) | Event RSVP aggregation and pending contacts. |
| P1 | photos: (weddingId,albumId,moderation,createdAt) | Moderation and public album paging. |
| P1 | notifications/outbox_events: (state,dueAt/nextAttemptAt) | Worker due-job polling. |
| P1 | sessions, guest_sessions, auth_action_tokens: TTL(expiresAt) | Eventually clean expired transient tokens. |
| P2 | expenses/payments: event/vendor and paidAt indexes | Organizer expense history and totals. |
| P2 | audit_events: (weddingId,occurredAt) | Wedding-sensitive change review. |

## 5.1 Must-have MongoDB index scripts

```
// Unique owner invariant (partial unique index)
db.wedding_memberships.createIndex(
  { userId: 1 },
  { name: "uniq_active_owned_wedding_per_user", unique: true,
    partialFilterExpression: {
      role: "owner", status: "active", activeOwned: true
    } }
);

db.wedding_memberships.createIndex(
  { weddingId: 1, userId: 1 }, { unique: true }
);
db.event_invitations.createIndex(
  { weddingId: 1, guestId: 1, eventId: 1 }, { unique: true }
);
db.users.createIndex({ emailNormalized: 1 }, { unique: true });
db.weddings.createIndex({ slug: 1 }, { unique: true });
db.website_configs.createIndex({ weddingId: 1 }, { unique: true });
// Scope token records without expiring permanent invitations.
db.auth_sessions.createIndex(
  { expiresAt: 1 }, { expireAfterSeconds: 0 }
);
db.auth_action_tokens.createIndex(
  { expiresAt: 1 }, { expireAfterSeconds: 0 }
);
db.guest_sessions.createIndex(
  { expiresAt: 1 }, { expireAfterSeconds: 0 }
);
// invitation_tokens and photos: intentionally NO TTL index.
```

# 6. Transaction boundaries and concurrency

## 6.1 Create wedding and first owner

- Normalize slug and account identity; check authenticated user has no active owner membership.
- In one Atlas replica-set transaction, insert wedding, first owner membership with activeOwned=true, default website config and audit/outbox entry.
- The unique partial membership index is the final correctness gate; duplicate key becomes OWNER_ACTIVE_LIMIT (HTTP 409).
- If any step fails, abort: do not leave an active wedding without its owner membership.

## 6.2 Second owner invitation acceptance

- Validate invited email against authenticated verified account, invitation status and expiry; confirm current wedding active.
- Validate wedding has fewer than two active owners and invited account has no other active owner membership.
- In one transaction add/update owner membership, mark invitation accepted, increment wedding writeFenceVersion and append audit/outbox.
- On concurrent acceptance, handle duplicate-index or write conflicts with bounded retries and show a meaningful conflict error.

## 6.3 RSVP write versus wedding archive

Update RSVP and touch the parent wedding in the SAME transaction. The wedding update must filter on status=active and increment writeFenceVersion, which conflicts with a concurrent archive transition. Read-only state checks before the transaction are not sufficient. Guest token/session must still be active, and event invitation must be selected.

```
// NestJS pseudocode, within a MongoDB transaction
const fence = await weddings.updateOne(
  { _id: weddingId, status: "active" },
  { $inc: { writeFenceVersion: 1 } }, { session }
);
if (fence.modifiedCount !== 1) throw ArchivedError;
// Then update selected event_invitation with responseVersion CAS;
// validate count <= canonical guest_contacts.partySize;
// insert audit/outbox records; commit together.
```

Trade-off: touching the same wedding fence on every RSVP can create write contention during high-volume guest response bursts. It is the simplest pilot-safe invariant; test load and revisit with a dedicated lifecycle lock/write-epoch design before scaling.

## 6.4 Guest party size edits

Changing partySize affects every selected event. In a transaction, read all current attending RSVP counts for the guest, reject any new size below the maximum confirmed count, change partySize, append audit. Never auto-clamp previously confirmed counts. No copy of invited partySize is stored in event_invitations.

## 6.5 Expense payment ledger

Insert expense_payments transactionally with an expense parent update, checking that total paid after insertion does not exceed amountPaise. Support corrective reversals as positive ledger entries with entryType=reversal (subtract reversals), or recalculate paid amount from canonical ledger; do not trust a browser-supplied paid total. All integer calculations must remain safe.

## 6.6 Reserve and reconcile image quota

On upload initiation, atomically reserve a conservative byte budget (declared original size plus estimated derivative overhead) with usedBytes + reservedBytes + budgetBytes <= limitBytes; create upload_intent in the same transaction. Before completion, verify actual retained original and derivative sizes, conditionally reserve any additional required bytes, and settle used versus reserved atomically. Never finalize above quota. On failure/expiry, release reservation exactly once. Reconcile with S3 periodically. The 5 GB unit and asset scope are launch policy items.

```
// Atomic quota reservation predicate (inside transaction)
const bytes = conservativeBudgetBytes; // originals + derivatives
const w = await weddings.updateOne(
  { _id: weddingId, status: "active",
    $expr: { $lte: [
      { $add: ["$quota.usedBytes", "$quota.reservedBytes", bytes] },
      "$quota.limitBytes"
    ] }
  },
  { $inc: { "quota.reservedBytes": bytes,
             writeFenceVersion: 1 } },
  { session }
);
if (w.modifiedCount !== 1) throw QuotaOrArchiveError;
```

## 6.7 Outbox and email idempotency

Every state transition requiring email or media work inserts outbox_events in the same transaction as the state change. The relay publishes to BullMQ at least once; workers use stable idempotency keys and deduplicate callbacks. Email provider retries may still be ambiguous after a crash between send and acknowledgment; surface uncertainty rather than promise exactly-once delivery.

# 7. Query patterns and derived counts

| **QUERY** | **MONGO STRATEGY / SOURCE** |
|---|---|
| My active owned wedding | wedding_memberships.findOne({userId,role:"owner",status:"active",activeOwned:true}) -> weddings. |
| Other weddings I manage | wedding_memberships.find({userId,role:"manager",status:"active"}) -> weddings. |
| Events in chronological order | events.find({weddingId}).sort({startAt:1,_id:1}); null startAt sorted separately in UI. |
| My overdue tasks | tasks.find({weddingId,assigneeId,state:{$nin:["completed","cancelled"]},dueAt:{$lt:now}}). |
| Guest invites by event | event_invitations.find({weddingId,eventId,isInvited:true}) + guest_contacts lookup. |
| Invited person total | SUM(guest_contacts.partySize) for selected guest contact IDs for that event. |
| Confirmed attending total | SUM(event_invitations.rsvp.attendingCount) where rsvp.status=attending and isInvited=true. |
| Remaining expense | expenses.amountPaise - sum(expense_payments.amountPaise) (or validated paidPaise cache). |
| Public wedding page | weddings slug + website_configs.published + events + approved photos; fields allowlisted. |
| Photo moderation | photos.find({weddingId,moderation:"pending"}).sort({createdAt:-1}).limit(pageSize). |

Compute RSVP counts on demand for the pilot. If profiling shows expensive aggregation, introduce a projection rebuilt from canonical event_invitations and guest_contacts rather than mutating multiple independent truth counters on each RSVP.

# 8. Example documents and Mongoose implementation

## 8.1 Representative guest contact and event invitation

```
// guest_contacts (example; ObjectId strings abbreviated)
{
  _id: ObjectId("66f000000000000000000101"),
  weddingId: ObjectId("66f000000000000000000001"),
  name: "Rajesh Sharma", partySize: 5,
  emailNormalized: "rajesh@example.com", status: "active"
}
// event_invitations, wedding ceremony
{
  weddingId: ObjectId("66f000000000000000000001"),
  guestId: ObjectId("66f000000000000000000101"),
  eventId: ObjectId("66f000000000000000000202"),
  isInvited: true,
  rsvp: { status: "attending", attendingCount: 3,
          responseVersion: 2, respondedAt: ISODate("2026-12-01T12:00:00Z") }
}
// Another selected event can have attendingCount: 5.
// The invited party size is always guest_contacts.partySize = 5.
```

## 8.2 Mongoose schema snippet: guest RSVP

```
import { Schema, Types } from "mongoose";
const rsvp = new Schema({
  status: { type: String, enum: ["pending", "attending",
    "not_attending", "maybe"], default: "pending", required: true },
  attendingCount: { type: Number, default: null,
    validate: v => v == null || Number.isSafeInteger(v) },
  responseVersion: { type: Number, default: 0, min: 0 },
  respondedAt: { type: Date, default: null }
}, { _id: false });
const eventInvitationSchema = new Schema({
  weddingId: { type: Schema.Types.ObjectId, required: true },
  guestId: { type: Schema.Types.ObjectId, required: true },
  eventId: { type: Schema.Types.ObjectId, required: true },
  isInvited: { type: Boolean, default: true },
  rsvp: { type: rsvp, required: true, default: () => ({}) }
}, { timestamps: true, strict: "throw" });
eventInvitationSchema.index(
  { weddingId: 1, guestId: 1, eventId: 1 }, { unique: true }
);
// Cross-document partySize bound is validated in NestJS service
// transaction; Mongoose cannot enforce that rule by itself.
```

## 8.3 MongoDB collection validator example

```
// Supplemental database-side validation for guest_contacts
db.runCommand({ collMod: "guest_contacts", validator: {
  $jsonSchema: {
    bsonType: "object",
    required: ["weddingId", "name", "partySize", "status"],
    properties: {
      weddingId: { bsonType: "objectId" },
      name: { bsonType: "string", minLength: 1 },
      partySize: { bsonType: "int", minimum: 1 },
      status: { enum: ["active", "removed"] }
    }
  }
}, validationLevel: "strict", validationAction: "error" });
// Use BSON Int32 explicitly for partySize if validator requires int;
// account for driver/Mongoose numeric BSON serialization in tests.
```

# 9. Privacy, tenancy, file storage, and retention

- Every NestJS query checks wedding membership or scoped guest/upload capability. Never expose internal Mongo model objects directly from controllers.
- Public web pages use allowlisted event/website DTOs and approved photo references. Omit expenses, RSVP, guest email/phone, vendor contact details, private notes, audit diffs, raw tokens and private S3 keys.
- Bearer guest links are intentionally forwardable; revocation/rotation and scoped guest sessions mitigate uncontrolled use but do not verify recipient identity.
- Private S3 objects include original photos, pending uploads, expense receipts, account assets and temporary exports. Public media delivery is approved-only via CloudFront/private origin; isolate publishable derivative objects from quarantine/originals with strict bucket/prefix policy.
- Exif location and sensitive metadata should not be published in photo derivatives. Pending images stay in a private quarantine state until processing and manual approval.
- Only transient authentication/guest sessions and short-lived action tokens use TTL. Wedding, guest, RSVP, payment, photo, and audit records are not erased by TTL.
- Archiving preserves published pages and approved photos; owners retain narrowly scoped unpublish/remove/delete safety actions despite ordinary planning being read-only.
- Account/wedding deletion is an explicit asynchronous process spanning MongoDB, S3, CDN and queue remnants. Track it with deletion_jobs and reconcile failures.
- Backups, retention and encryption must be configured at Atlas/AWS level. Never put database passwords or SMTP passwords into source control.

## 9.1 Suggested object-key boundaries

| **ASSET CLASS** | **S3 KEY / ACCESS STRATEGY** |
|---|---|
| Quarantine upload | private/quarantine/{weddingId}/{uploadIntentId}/{randomKey}; presigned short-lived PUT. |
| Original photo | private/originals/{weddingId}/{photoId}/{randomKey}; owner/manager export only. |
| Private derivative | private/derivatives/{weddingId}/{photoId}/{size}; processing and internal preview. |
| Approved public derivative | published/{weddingId}/{photoId}/{version}/{size}; CloudFront private origin allowlist. |
| Expense receipt | private/receipts/{weddingId}/{fileAssetId}; authorized organizer only. |
| Export ZIP | private/exports/{weddingId}/{mediaExportId}; temporary signed download, cleanup job. |

# 10. Data migrations and launch checklist

## 10.1 Migration conventions

- Maintain versioned migration scripts for collection creation, indexes, validators, backfills and rollback instructions. Test against a staging clone or synthetic data.
- Create required unique/partial indexes before enabling registration, co-owner acceptance or invitations.
- Run an explicit index existence/health check at service startup or deployment gate; do not run uncontrolled autoIndex builds on production restarts.
- Backfill new required fields safely and increment schemaVersion when serialized data changes meaning.
- For changes affecting emails/RSVP state, deploy backwards-compatible API readers before writing new shapes.
- Use Atlas-managed backups and test a restoration of wedding, membership, RSVP, payments and media pointers.
- Validate S3/Mongo quota reconciliation, invitations revocation and archive fence under concurrency.

## 10.2 Critical integration tests

| **CASE** | **EXPECTED RESULT** |
|---|---|
| Two concurrent active owner creations | Exactly one succeeds; unique partial index rejects the other, no orphan wedding. |
| Same email invited as co-owner of active second wedding | Acceptance blocked; manager memberships unaffected. |
| Archive races with guest RSVP | No RSVP becomes committed after archive; no partial archive. |
| Party size 5, Haldi 3, Wedding 5 | Event headcounts correct; reducing partySize to 2 rejected. |
| Link revoked during guest session | Guest capabilities fail at next protected read/mutation. |
| One public visitor requests guest_contact by ID | No private data; API denies access. |
| Two photos reserve beyond 5 GB simultaneously | Atomic reservation permits at most allowed total. |
| Staging S3 upload succeeds but complete call fails | Sweeper reconciles intent/reservation; no public file. |
| Photo approved then hidden | Public API hides it and CDN invalidation completes per policy. |
| Worker sends email then crashes | No silent exactly-once promise; recovery retries/reconciles and surfaces uncertainty. |
| MongoDB TTL delay | API still treats expired tokens/sessions as invalid. |
| Staging restore test | Wedding, memberships, RSVPs and S3 pointers remain coherent. |

# 11. Decisions still needed for implementation

| **DECISION** | **PROPOSED DEFAULT / OWNER ACTION** |
|---|---|
| 5 GB unit and accounting | Proposed decimal 5,000,000,000 bytes for gallery photos; count originals, retained derivatives and pending reservations. Confirm whether covers/receipts count. |
| Atlas tier/network | Use replica-set transaction-capable Atlas deployment, same geographic region as AWS services where available; approve networking and cost. |
| Object size and format | Proposed image-only JPEG/PNG/WebP; choose max single file size, dimensions and processor limits during engineering review. |
| Deletion policy | Set account/wedding deletion grace period, audit retention, backup purge conditions and privacy notice. |
| Auth/session policy | Approve session absolute/idle expiry, password requirements, lockout policy and account recovery support. |
| Reminder send time | Proposed 09:00 Asia/Kolkata local; confirm date changes/dedup behavior. |
| Public media cache invalidation | Approve CloudFront TTL/purge strategy and owner safety responsiveness expectations. |
| Data retention | Define audit/outbox history retention and photo retention when users delete accounts. |
| Search/performance thresholds | Measure guest search and RSVP aggregation at pilot envelope before new projections/indexes. |

# 12. Build sequence and handoff

| **MILESTONE** | **DELIVERABLE** | **EXIT TEST** |
|---|---|---|
| M1 - Identity + tenancy | users, auth_sessions, auth_action_tokens, weddings, memberships, invites; indexes | Auth and unique active-owner race tests pass. |
| M2 - Planning | events, timeline, tasks, vendors, expenses, payments, audit | CRUD, payments and cross-wedding isolation pass. |
| M3 - Invitations/public | guest contacts, event invitations, tokens/sessions, website, notifications/outbox | RSVP count bounds, archiving race and no-PII public DTO checks pass. |
| M4 - Media + pilot | albums, capabilities, upload intents, photos, exports, S3 quotas, deletion jobs | Quota, moderation, cleanup and backup restore tests pass. |

Technical handoff: implement schemas and index migrations as reviewed source-controlled code, then DTOs/services/guards, then Mongo transaction tests. API contracts are the next logical document after this schema approval.

## References and document lineage

- Product Requirements Document (PRD) v1.0, My Marriage, 5 November 2026.
- System Design & Architecture RFC v1.1, My Marriage, 12 November 2026.
- MongoDB Documentation - Partial Indexes: https://www.mongodb.com/docs/manual/core/index-partial/
- MongoDB Documentation - Transactions: https://www.mongodb.com/docs/manual/core/transactions/
- MongoDB Documentation - TTL Indexes: https://www.mongodb.com/docs/manual/core/index-ttl/
- Mongoose Guide - Schemas and Timestamps: https://mongoosejs.com/docs/guide.html
