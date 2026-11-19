# My Marriage — API Documentation v1.0

Status: Proposed (not deployed). Base path: `/api/v1`.

## 1. Overview

Next.js calls NestJS over REST. Organizer, guest and upload capability sessions have separate cookies. MongoDB Atlas persists all metadata; AWS S3 holds media bytes; Gmail SMTP sends emails; BullMQ runs jobs.

## 2. Conventions

- Base: `/api/v1` over HTTPS with JSON and secure cookies.
- IDs: 24-char MongoDB ObjectId strings. Money: **integer paise**. Time: ISO 8601 UTC.
- Responses: `{data,requestId,meta?}`; errors `{error:{code,message,details?},requestId}`.
- Use `Idempotency-Key` for retryable mutations and `responseVersion` for RSVP optimistic updates.
- Public routes return allowlisted published data only.

## 3. Authentication

- Organizer: `mm_session` HttpOnly cookie, first-party NestJS auth.
- Guest: `mm_guest_session`, scoped to one private invitation contact.
- Upload: `mm_upload_session`, scoped to one album.
- Public API: only published allowlisted wedding fields and approved photos.

## 4. Endpoint catalog


### Auth

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| POST | `/auth/signup` | Register account with email/password | Public |
| POST | `/auth/verify-email` | Verify email with one-time token | Public |
| POST | `/auth/verification/resend` | Request another verification email | Public |
| POST | `/auth/login` | Create organizer session cookie | Public |
| POST | `/auth/logout` | Revoke organizer session and clear cookie | Organizer |
| GET | `/auth/me` | Get current account profile | Organizer |
| PATCH | `/auth/me` | Update own display name | Organizer |
| POST | `/auth/password/forgot` | Request password reset email (non-enumerating) | Public |
| POST | `/auth/password/reset` | Reset password using single-use token | Public |
| POST | `/auth/password/change` | Change password when signed in | Organizer |
| GET | `/auth/sessions` | List active device sessions | Organizer |
| DELETE | `/auth/sessions/{sessionId}` | Revoke one device session | Organizer |
| POST | `/auth/me/profile-image/upload-intents` | Create account-scoped profile image upload intent | Organizer |
| POST | `/auth/me/profile-image/upload-intents/{uploadIntentId}/complete` | Finalize account-scoped profile image upload | Organizer |

### Weddings

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| GET | `/weddings` | List weddings visible to account | Organizer |
| POST | `/weddings` | Create active wedding with first owner | Organizer |
| GET | `/weddings/{weddingId}` | Get wedding private details | Organizer |
| PATCH | `/weddings/{weddingId}` | Update active wedding details | Organizer |
| POST | `/weddings/{weddingId}/archive` | Archive active wedding (owner only) | Organizer |
| POST | `/weddings/{weddingId}/deletion-requests` | Request permanent wedding deletion (owner only) | Organizer |
| GET | `/weddings/{weddingId}/dashboard` | Read organizer dashboard summaries | Organizer |
| GET | `/weddings/{weddingId}/quota` | Read current 5 GB S3 photo quota | Organizer |

### Team

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| GET | `/weddings/{weddingId}/members` | List wedding owners/managers | Organizer |
| POST | `/weddings/{weddingId}/member-invites` | Invite a manager or second co-owner | Organizer |
| GET | `/weddings/{weddingId}/member-invites` | List pending/consumed membership invites | Organizer |
| POST | `/member-invites/accept` | Accept invite as signed-in matching email | Organizer |
| POST | `/weddings/{weddingId}/member-invites/{inviteId}/revoke` | Revoke pending member invitation | Organizer |
| DELETE | `/weddings/{weddingId}/members/{memberId}` | Remove manager from a wedding | Organizer |

### Events

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| GET | `/weddings/{weddingId}/events` | List ceremonies | Organizer |
| POST | `/weddings/{weddingId}/events` | Create ceremony | Organizer |
| GET | `/weddings/{weddingId}/events/{eventId}` | Read ceremony | Organizer |
| PATCH | `/weddings/{weddingId}/events/{eventId}` | Update or cancel ceremony | Organizer |
| GET | `/weddings/{weddingId}/events/{eventId}/timeline` | Get event-day timeline | Organizer |
| POST | `/weddings/{weddingId}/events/{eventId}/timeline` | Create event timeline item | Organizer |
| PATCH | `/weddings/{weddingId}/events/{eventId}/timeline/{timelineId}` | Edit event timeline item | Organizer |
| DELETE | `/weddings/{weddingId}/events/{eventId}/timeline/{timelineId}` | Remove event timeline item | Organizer |

### Tasks

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| GET | `/weddings/{weddingId}/tasks` | List tasks with filters | Organizer |
| POST | `/weddings/{weddingId}/tasks` | Create task and assign wedding member | Organizer |
| GET | `/weddings/{weddingId}/tasks/{taskId}` | Get task | Organizer |
| PATCH | `/weddings/{weddingId}/tasks/{taskId}` | Update task/status | Organizer |
| DELETE | `/weddings/{weddingId}/tasks/{taskId}` | Cancel/remove task from active list | Organizer |

### Vendors

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| GET | `/weddings/{weddingId}/vendors` | List private vendors | Organizer |
| POST | `/weddings/{weddingId}/vendors` | Create vendor contact | Organizer |
| GET | `/weddings/{weddingId}/vendors/{vendorId}` | Read vendor | Organizer |
| PATCH | `/weddings/{weddingId}/vendors/{vendorId}` | Update vendor | Organizer |
| DELETE | `/weddings/{weddingId}/vendors/{vendorId}` | Retire vendor while preserving expense references | Organizer |

### Expenses

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| GET | `/weddings/{weddingId}/expenses` | List expenses | Organizer |
| POST | `/weddings/{weddingId}/expenses` | Create expense in integer paise | Organizer |
| GET | `/weddings/{weddingId}/expenses/{expenseId}` | Read expense with paid/outstanding totals | Organizer |
| PATCH | `/weddings/{weddingId}/expenses/{expenseId}` | Update expense amount/details | Organizer |
| GET | `/weddings/{weddingId}/expenses/{expenseId}/payments` | List payment ledger entries | Organizer |
| POST | `/weddings/{weddingId}/expenses/{expenseId}/payments` | Record payment | Organizer |
| POST | `/weddings/{weddingId}/expenses/{expenseId}/payments/reverse` | Reverse previous payment by compensating entry | Organizer |
| GET | `/weddings/{weddingId}/expenses-summary` | Get INR paise totals | Organizer |

### Guests

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| GET | `/weddings/{weddingId}/guests` | List guest contacts | Organizer |
| POST | `/weddings/{weddingId}/guests` | Create primary guest contact | Organizer |
| GET | `/weddings/{weddingId}/guests/{guestId}` | Read guest contact | Organizer |
| PATCH | `/weddings/{weddingId}/guests/{guestId}` | Update party size and private contact info | Organizer |
| DELETE | `/weddings/{weddingId}/guests/{guestId}` | Remove guest and revoke invitation capabilities | Organizer |
| POST | `/weddings/{weddingId}/guests/import/preview` | Validate CSV/XLSX guest import before commit | Organizer |
| POST | `/weddings/{weddingId}/guests/import/commit` | Commit previously validated import selection | Organizer |
| POST | `/weddings/{weddingId}/guests/exports` | Start CSV/XLSX guest export | Organizer |
| GET | `/weddings/{weddingId}/guests/exports/{exportId}` | Check guest export and receive short-lived link | Organizer |

### Invitations

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| GET | `/weddings/{weddingId}/guests/{guestId}/invitations` | List event invitations for guest | Organizer |
| PUT | `/weddings/{weddingId}/guests/{guestId}/invitations` | Set selected events for guest | Organizer |
| POST | `/weddings/{weddingId}/guests/{guestId}/invitation-links` | Generate/reissue private guest link | Organizer |
| POST | `/weddings/{weddingId}/guests/{guestId}/invitation-links/revoke` | Revoke all active guest invitation links/sessions | Organizer |
| POST | `/weddings/{weddingId}/guests/{guestId}/invitation-email` | Queue guest invitation email | Organizer |

### Guest RSVP

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| POST | `/guest-access/exchange` | Exchange raw private invite token for scoped cookie | Public |
| GET | `/guest-access/invitation` | View contact name and selected ceremonies | Guest |
| PATCH | `/guest-access/events/{eventInvitationId}/rsvp` | Change RSVP for selected ceremony | Guest |
| POST | `/guest-access/reminders/opt-out` | Opt out guest contact of reminder emails | Guest |
| POST | `/guest-access/logout` | Clear invitation-scoped session | Guest |

### Website

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| GET | `/weddings/{weddingId}/website` | Read wedding website editor configuration | Organizer |
| PATCH | `/weddings/{weddingId}/website` | Edit template and site content | Organizer |
| GET | `/weddings/{weddingId}/website/preview` | Preview unpublished content (noncacheable) | Organizer |
| POST | `/weddings/{weddingId}/website/publish` | Publish wedding public website | Organizer |
| POST | `/weddings/{weddingId}/website/unpublish` | Unpublish site (owner safety exception after archive) | Organizer |

### Public

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| GET | `/public/weddings/{slug}` | Read published sanitized public wedding | Public |
| GET | `/public/weddings/{slug}/events` | List published event information | Public |
| GET | `/public/weddings/{slug}/albums` | List publicly visible approved galleries | Public |
| GET | `/public/weddings/{slug}/albums/{albumId}/photos` | Browse approved public photos only | Public |

### Albums

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| GET | `/weddings/{weddingId}/albums` | List all albums including moderation counts | Organizer |
| POST | `/weddings/{weddingId}/albums` | Create custom/general or event album | Organizer |
| PATCH | `/weddings/{weddingId}/albums/{albumId}` | Edit album settings | Organizer |
| POST | `/weddings/{weddingId}/albums/{albumId}/upload-links` | Create new QR/upload capability link | Organizer |
| POST | `/weddings/{weddingId}/albums/{albumId}/upload-links/{capabilityId}/revoke` | Revoke QR/upload capability | Organizer |
| GET | `/weddings/{weddingId}/albums/{albumId}/photos` | List all photos for moderation | Organizer |

### Media

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| POST | `/upload-access/exchange` | Exchange QR upload token for scoped upload cookie | Public |
| POST | `/media/uploads/initiate` | Reserve quota and issue short-lived presigned S3 request | Organizer / QR |
| POST | `/media/uploads/{uploadIntentId}/complete` | Verify S3 object and enqueue processing | Organizer / QR |
| GET | `/weddings/{weddingId}/photos/{photoId}` | Read private photo metadata | Organizer |
| POST | `/weddings/{weddingId}/photos/{photoId}/approve` | Approve photo for eventual public publication | Organizer |
| POST | `/weddings/{weddingId}/photos/{photoId}/reject` | Reject pending photo | Organizer |
| POST | `/weddings/{weddingId}/photos/{photoId}/hide` | Hide public photo (owner safety exception after archive) | Organizer |
| DELETE | `/weddings/{weddingId}/photos/{photoId}` | Request protected photo deletion | Organizer |
| POST | `/weddings/{weddingId}/media-exports` | Start photo export job | Organizer |
| GET | `/weddings/{weddingId}/media-exports/{exportId}` | Get export status and signed download URL | Organizer |
| POST | `/weddings/{weddingId}/file-assets/uploads/initiate` | Create protected file upload for cover, receipt or profile | Organizer |
| POST | `/weddings/{weddingId}/file-assets/uploads/{uploadIntentId}/complete` | Complete protected asset upload | Organizer |

### Notifications

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| GET | `/weddings/{weddingId}/notifications` | List email/reminder send statuses | Organizer |
| GET | `/weddings/{weddingId}/reminder-settings` | Read reminder scheduling settings | Organizer |
| PUT | `/weddings/{weddingId}/reminder-settings` | Configure reminder offsets (30/7/3) | Organizer |

### Operations

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| GET | `/health/live` | Liveness probe | Public |
| GET | `/health/ready` | Readiness probe for dependency health | Public |
### Create a wedding

`POST /api/v1/weddings`

**Example request**

```json
{
  "slug": "aarav-priya",
  "brideName": "Priya",
  "groomName": "Aarav",
  "city": "Ahmedabad",
  "state": "Gujarat"
}
```

**Example response**

```json
{
  "data": {
    "id": "65f000000000000000000001",
    "status": "active",
    "slug": "aarav-priya"
  },
  "requestId": "req_001"
}
```

**Rule:** Creates the initial owner membership in the same transaction; a second active owned wedding returns 409 OWNER_ACTIVE_LIMIT.

### Create a ceremony

`POST /api/v1/weddings/{weddingId}/events`

**Example request**

```json
{
  "title": "Haldi",
  "timeZone": "Asia/Kolkata",
  "startAt": "2026-12-13T04:30:00Z",
  "venue": {
    "name": "Family Farmhouse",
    "address": "Ahmedabad, Gujarat"
  }
}
```

**Rule:** An event may be created before date or venue is finalized. Timezone is explicit and reminders are scheduled from confirmed event times.

### Add a guest contact

`POST /api/v1/weddings/{weddingId}/guests`

**Example request**

```json
{
  "name": "Rajesh Sharma",
  "partySize": 5,
  "email": "rajesh@example.com"
}
```

**Rule:** partySize=5 is stored once on guest_contacts; it applies to all ceremonies selected for that guest.

### Select invited ceremonies

`PUT /api/v1/weddings/{weddingId}/guests/{guestId}/invitations`

**Example request**

```json
{
  "eventIds": [
    "65f000000000000000000201",
    "65f000000000000000000202"
  ]
}
```

**Rule:** Unselected events are visible on the public website but must never appear as eligible RSVP choices.

### Update ceremony RSVP

`PATCH /api/v1/guest-access/events/{eventInvitationId}/rsvp`

**Example request**

```json
{
  "status": "attending",
  "attendingCount": 3,
  "responseVersion": 4
}
```

**Example response**

```json
{
  "data": {
    "id": "65f000000000000000000301",
    "eventId": "65f000000000000000000201",
    "invitedPartySize": 5,
    "rsvp": {
      "status": "attending",
      "attendingCount": 3,
      "responseVersion": 5
    }
  },
  "requestId": "req_002"
}
```

**Rule:** Invitation-scoped cookie required. attendingCount cannot exceed partySize=5; responseVersion must match the stored value; archive and token revocation reject writes.

### Create an expense

`POST /api/v1/weddings/{weddingId}/expenses`

**Example request**

```json
{
  "title": "Wedding Photography",
  "category": "Photography",
  "amountPaise": 8000000
}
```

**Rule:** ₹80,000 is stored as 8,000,000 paise. Payment records are kept in a separate immutable ledger.

### Record a vendor payment

`POST /api/v1/weddings/{weddingId}/expenses/{expenseId}/payments`

**Example request**

```json
{
  "amountPaise": 3000000,
  "paidAt": "2026-12-01T10:00:00Z",
  "method": "bank_transfer"
}
```

**Rule:** A ₹30,000 payment against an ₹80,000 expense leaves ₹50,000 outstanding. Corrections use compensating reversal entries.

### Prepare direct S3 upload

`POST /api/v1/media/uploads/initiate`

**Example request**

```json
{
  "albumId": "65f000000000000000000401",
  "fileName": "haldi-01.jpg",
  "contentType": "image/jpeg",
  "declaredBytes": 4820000
}
```

**Example response**

```json
{
  "data": {
    "id": "65f000000000000000000701",
    "albumId": "65f000000000000000000401",
    "state": "initiated",
    "upload": {
      "method": "PUT",
      "url": "https://s3.example.invalid/signed-example",
      "headers": {
        "Content-Type": "image/jpeg"
      }
    }
  },
  "requestId": "req_003"
}
```

**Rule:** Presigned URL is short-lived and illustrative. After direct S3 PUT, call /media/uploads/{uploadIntentId}/complete. Uploaded photos remain private until approved.

### Configure wedding reminders

`PUT /api/v1/weddings/{weddingId}/reminder-settings`

**Example request**

```json
{
  "reminderOffsetsDays": [
    30,
    7,
    3
  ],
  "remindersEnabled": true
}
```

**Rule:** Emails are dispatched by BullMQ workers over Gmail SMTP. Jobs recheck event status, opt-outs, wedding state and scheduleVersion just before sending.


#### SignupRequest

| Field | Type | Required |
|---|---|---|
| `email` | email | Yes |
| `password` | string | Yes |
| `displayName` | string | Yes |

#### WeddingCreate

| Field | Type | Required |
|---|---|---|
| `slug` | string | Yes |
| `brideName` | string | Yes |
| `groomName` | string | Yes |
| `city` | string | Yes |
| `state` | string | Yes |
| `weddingDate` | date-time | No |
| `mainVenue` | Venue | No |
| `description` | string | No |
| `secondOwnerEmail` | email | No |

#### MemberInviteCreate

| Field | Type | Required |
|---|---|---|
| `email` | email | Yes |
| `role` | enum: owner|manager | Yes |

#### EventCreate

| Field | Type | Required |
|---|---|---|
| `title` | string | Yes |
| `description` | string | No |
| `startAt` | date-time | No |
| `endAt` | date-time | No |
| `timeZone` | string | No |
| `venue` | Venue | No |
| `dressCode` | string | No |
| `managerIds` | array<Id> | No |
| `livestream` | object | No |
| `reminderSettings` | object | No |

#### TimelineCreate

| Field | Type | Required |
|---|---|---|
| `startsAt` | date-time | Yes |
| `endsAt` | date-time | No |
| `position` | int64 | Yes |
| `title` | string | Yes |
| `details` | string | No |
| `responsibleUserId` | Id | No |

#### TaskCreate

| Field | Type | Required |
|---|---|---|
| `eventId` | Id | No |
| `title` | string | Yes |
| `description` | string | No |
| `assigneeId` | Id | No |
| `dueAt` | date-time | No |
| `priority` | enum: low|normal|high | No |

#### VendorCreate

| Field | Type | Required |
|---|---|---|
| `name` | string | Yes |
| `category` | string | Yes |
| `contactName` | string | No |
| `phone` | string | No |
| `email` | email | No |
| `address` | string | No |
| `notes` | string | No |
| `eventIds` | array<Id> | No |

#### ExpenseCreate

| Field | Type | Required |
|---|---|---|
| `title` | string | Yes |
| `category` | string | Yes |
| `eventId` | Id | No |
| `vendorId` | Id | No |
| `amountPaise` | MoneyPaise | Yes |
| `dueAt` | date-time | No |
| `notes` | string | No |
| `receiptAssetIds` | array<Id> | No |

#### ExpensePaymentCreate

| Field | Type | Required |
|---|---|---|
| `amountPaise` | MoneyPaise | Yes |
| `paidAt` | date-time | Yes |
| `method` | enum: cash|bank_transfer|card|cheque|other | No |
| `note` | string | No |

#### GuestCreate

| Field | Type | Required |
|---|---|---|
| `name` | string | Yes |
| `partySize` | integer | Yes |
| `email` | email | No |
| `phone` | string | No |
| `organizerNotes` | string | No |

#### InvitationSelection

| Field | Type | Required |
|---|---|---|
| `eventIds` | array<Id> | Yes |

#### RsvpPatch

| Field | Type | Required |
|---|---|---|
| `status` | enum: attending|not_attending|maybe | Yes |
| `attendingCount` | integer | No |
| `responseVersion` | int64 | Yes |

#### WebsitePatch

| Field | Type | Required |
|---|---|---|
| `templateId` | enum: traditional|modern|royal | No |
| `content` | object | No |

#### UploadIntentCreate

| Field | Type | Required |
|---|---|---|
| `albumId` | Id | Yes |
| `fileName` | string | Yes |
| `contentType` | enum: image/jpeg|image/png|image/webp | Yes |
| `declaredBytes` | int64 | Yes |
| `uploaderName` | string | No |

#### ImportPreview

| Field | Type | Required |
|---|---|---|
| `fileName` | string | Yes |
| `mode` | enum: csv|xlsx | Yes |
| `rows` | array<GuestCreate> | Yes |

#### ImportCommit

| Field | Type | Required |
|---|---|---|
| `rows` | array<GuestCreate> | Yes |
| `skipDuplicates` | boolean | No |
| `sourceFormat` | enum: csv|xlsx | No |

#### NotificationSettings

| Field | Type | Required |
|---|---|---|
| `reminderOffsetsDays` | array<enum: 3|7|30> | Yes |
| `remindersEnabled` | boolean | Yes |
## 5. Async workflows

Guest invitation links are bearer credentials, stored hashed; for queued email delivery a new token needs short-lived KMS-encrypted outbox material. S3 uploads require atomic quota reservation, private staging, verification, moderation and public derivative delivery only after approval. RSVP state updates use version checks plus an archive write fence.

## 6. Error handling

| Status | Meaning |
|---|---|
| 400 | Validation |
| 401/403 | Authentication or permission |
| 404 | Scoped/not found |
| 409 | Ownership, version or archived state conflict |
| 410 | Revoked or expired capability |
| 413 | Oversized upload |
| 429 | Rate limited |
| 503 | Dependency unavailable |

## 7. Critical QA

- **T01** Register/login/logout: Cookie issued and revoked; protected API requires active session.
- **T02** Tenant isolation: Manager of Wedding A cannot read or mutate Wedding B by ID replacement.
- **T03** Active ownership uniqueness: Concurrent owner acceptance/creation yields at most one active owned wedding.
- **T04** Two-owner limit: Third co-owner invite/accept rejected while managers remain allowed.
- **T05** Archive vs RSVP: No RSVP commits after owner archive; old public site remains if published.
- **T06** RSVP headcount: Guest partySize 5; Haldi attending 3, Wedding 5; sums correct.
- **T07** RSVP version conflict: Stale responseVersion gets 409 rather than overwriting latest change.
- **T08** Unauthorized ceremony: Guest link cannot RSVP for event not selected; public event still visible.
- **T09** Forwarded private token: Bearer holder can RSVP; public URL never leaks invitee name.
- **T10** Revoked private link: Old private token/session rejected after rotation.
- **T11** Payment ledger: Payment + reversal maintains correct total, no direct payment record mutation.
- **T12** Photo moderation: Pending photo inaccessible publicly; approved derivative visible after publish.
- **T13** 5 GB quota race: Two simultaneous upload reservations cannot exceed used+reserved allowance.
- **T14** Email retries: SMTP failures keep queued state; a retried email reuses its Message-ID.
- **T15** Photo/object reconciliation: Orphan staged object/expired intent cleans up quota and S3.
- **T16** Import preview/commit: CSV/XLSX client parsing, per-row errors and server revalidation.
- **T17** Unpublish/hide after archive: Owner safety action succeeds, manager cannot edit other archived content.
- **T18** Public projection privacy: No guest phone/email/notes, expense, token hash, or private S3 key in payload.

## 8. Before implementation

Confirm short-lived encrypted invitation delivery payload, importer transport, CSRF details, upload per-file cap, and hosting/provider configuration. Generate NestJS Swagger from controllers and diff with this proposed OpenAPI contract during CI.

## References

- PRD v1.0, Architecture v1.1, MongoDB Schema v1.0
- https://docs.nestjs.com/openapi/introduction
- https://nodemailer.com/smtp/ (SMTP transport)
- https://support.google.com/accounts/answer/185833 (Google App Passwords)
