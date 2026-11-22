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
- Upload: `mm_upload_session`, scoped to one upload link: one album, or a wedding's open albums for its general link (decision 0019).
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
| DELETE | `/weddings/{weddingId}/events/{eventId}` | Delete ceremony; the record is kept, marked deleted (owner only) | Organizer |
| GET | `/weddings/{weddingId}/events/{eventId}/timeline` | Get event-day timeline | Organizer |
| POST | `/weddings/{weddingId}/events/{eventId}/timeline` | Create event timeline item | Organizer |
| PATCH | `/weddings/{weddingId}/events/{eventId}/timeline/{timelineId}` | Edit event timeline item | Organizer |
| DELETE | `/weddings/{weddingId}/events/{eventId}/timeline/{timelineId}` | Remove event timeline item | Organizer |

### Tasks

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| GET | `/weddings/{weddingId}/tasks` | List tasks with filters | Organizer |
| POST | `/weddings/{weddingId}/tasks` | Create task and assign wedding member | Organizer |
| GET | `/weddings/{weddingId}/tasks/summary` | Task counts per event (total, completed, overdue; cancelled not counted) for the Events page | Organizer |
| GET | `/weddings/{weddingId}/tasks/{taskId}` | Get task | Organizer |
| PATCH | `/weddings/{weddingId}/tasks/{taskId}` | Update task/status | Organizer |
| DELETE | `/weddings/{weddingId}/tasks/{taskId}` | Not built: set `state` to `cancelled` instead (decision 0012) | Organizer |

### Vendors

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| GET | `/weddings/{weddingId}/vendors` | List private vendors | Organizer |
| POST | `/weddings/{weddingId}/vendors` | Create vendor contact | Organizer |
| GET | `/weddings/{weddingId}/vendors/{vendorId}` | Read vendor | Organizer |
| PATCH | `/weddings/{weddingId}/vendors/{vendorId}` | Update vendor | Organizer |
| DELETE | `/weddings/{weddingId}/vendors/{vendorId}` | Delete vendor; the record is kept, marked deleted, for expense history (owner only) | Organizer |

### Expenses

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| GET | `/weddings/{weddingId}/expenses` | List expenses | Organizer |
| POST | `/weddings/{weddingId}/expenses` | Create expense in integer paise | Organizer |
| GET | `/weddings/{weddingId}/expenses/{expenseId}` | Read expense with paid/outstanding totals | Organizer |
| PATCH | `/weddings/{weddingId}/expenses/{expenseId}` | Update expense amount/details | Organizer |
| GET | `/weddings/{weddingId}/expenses/{expenseId}/payments` | List payment ledger entries | Organizer |
| POST | `/weddings/{weddingId}/expenses/{expenseId}/payments` | Record payment | Organizer |
| POST | `/weddings/{weddingId}/expenses/{expenseId}/payments/reverse` | Reverse a payment, discount or extra by compensating entry | Organizer |
| POST | `/weddings/{weddingId}/expenses/{expenseId}/adjustments` | Record a discount or an extra agreed after the deal (decision 0014) | Organizer |
| DELETE | `/weddings/{weddingId}/expenses/{expenseId}` | Delete expense; kept with its history, marked deleted (owner only) | Organizer |
| GET | `/weddings/{weddingId}/expenses-summary` | Get INR paise totals | Organizer |

### Guests

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| GET | `/weddings/{weddingId}/guests` | List guest contacts | Organizer |
| POST | `/weddings/{weddingId}/guests` | Create primary guest contact | Organizer |
| GET | `/weddings/{weddingId}/guests/{guestId}` | Read guest contact | Organizer |
| PATCH | `/weddings/{weddingId}/guests/{guestId}` | Update party size and private contact info | Organizer |
| DELETE | `/weddings/{weddingId}/guests/{guestId}` | Remove guest and revoke invitation capabilities (owner only; kept as removed) | Organizer |
| POST | `/weddings/{weddingId}/guests/import/preview` | Validate CSV/XLSX guest import before commit | Organizer |
| POST | `/weddings/{weddingId}/guests/import/commit` | Commit previously validated import selection | Organizer |
| POST | `/weddings/{weddingId}/guests/exports` | Not built: the web app exports CSV from the list (decision 0015) | Organizer |
| GET | `/weddings/{weddingId}/guests/exports/{exportId}` | Not built (decision 0015) | Organizer |

### Invitations

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| GET | `/weddings/{weddingId}/guests/{guestId}/invitations` | List event invitations for guest | Organizer |
| PUT | `/weddings/{weddingId}/guests/{guestId}/invitations` | Set selected events for guest | Organizer |
| POST | `/weddings/{weddingId}/guests/{guestId}/invitation-links` | Generate/reissue private guest link | Organizer |
| POST | `/weddings/{weddingId}/guests/{guestId}/invitation-links/revoke` | Revoke all active guest invitation links/sessions | Organizer |
| POST | `/weddings/{weddingId}/guests/{guestId}/invitation-email` | Queue guest invitation email | Organizer |
| POST | `/weddings/{weddingId}/guests/reminders/preview` | Who a reminder to everyone invited would reach, and who is left out and why (decision 0016) | Organizer |
| POST | `/weddings/{weddingId}/guests/reminders` | Remind everyone invited, optionally about one ceremony, with an optional note (202; 429 `EMAIL_DAILY_LIMIT`) | Organizer |
| POST | `/weddings/{weddingId}/guests/{guestId}/reminder` | Remind one guest (202; 409 `INVITATION_NOT_SHARED`, `INVITATION_LINK_OFF`, `GUEST_REMINDERS_OFF`) | Organizer |

### Guest RSVP

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| POST | `/guest-access/exchange` | Exchange raw private invite token for scoped cookie | Public |
| GET | `/guest-access/invitation` | View contact name and selected ceremonies | Guest |
| PATCH | `/guest-access/events/{eventInvitationId}/rsvp` | Change RSVP for selected ceremony | Guest |
| POST | `/guest-access/reminders/opt-out` | Stop reminder emails (decision 0016) | Guest |
| POST | `/guest-access/reminders/opt-in` | Receive reminder emails again | Guest |
| POST | `/guest-access/logout` | Clear invitation-scoped session | Guest |

### Website

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| GET | `/weddings/{weddingId}/website` | Read wedding website editor configuration | Organizer |
| PATCH | `/weddings/{weddingId}/website` | Save the draft template and content; needs `contentVersion` (decision 0017) | Organizer |
| GET | `/weddings/{weddingId}/website/preview` | Preview unpublished content (noncacheable) | Organizer |
| POST | `/weddings/{weddingId}/website/publish` | Publish the saved draft at `contentVersion` (first time or update) | Organizer |
| POST | `/weddings/{weddingId}/website/unpublish` | Unpublish site (owner safety exception after archive) | Organizer |
| GET | `/weddings/{weddingId}/website/address?slug=` | Check a web address is free for this wedding (decision 0017) | Organizer |

### Public

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| GET | `/public/weddings/{slug}` | Read published sanitized public wedding | Public |
| GET | `/public/weddings/{slug}/events` | List published event information | Public |
| GET | `/public/weddings/{slug}/albums` | List publicly visible approved galleries | Public |
| GET | `/public/weddings/{slug}/albums/{albumId}/photos` | Browse approved public photos only | Public |
| GET | `/public/weddings/{slug}/photos/{photoId}/{size}` | Stream an approved photo while published (decision 0019) | Public |

### Albums

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| GET | `/weddings/{weddingId}/albums` | List all albums including moderation counts | Organizer |
| POST | `/weddings/{weddingId}/albums` | Create custom/general or event album | Organizer |
| PATCH | `/weddings/{weddingId}/albums/{albumId}` | Edit album settings | Organizer |
| POST | `/weddings/{weddingId}/albums/{albumId}/upload-links` | Create new QR/upload capability link | Organizer |
| POST | `/weddings/{weddingId}/upload-links/{capabilityId}/revoke` | Revoke QR/upload capability, album or general (decision 0019) | Organizer |
| GET | `/weddings/{weddingId}/upload-links` | Active upload links, with their URLs (decision 0019) | Organizer |
| POST | `/weddings/{weddingId}/upload-links` | Get or rotate the general upload link (decision 0019) | Organizer |
| GET | `/weddings/{weddingId}/upload-links/email-audiences` | Guests each email choice would reach (decision 0019) | Organizer |
| POST | `/weddings/{weddingId}/upload-links/email` | Email the general link to all or attending guests (decision 0019) | Organizer |
| GET | `/weddings/{weddingId}/albums/{albumId}/photos` | List all photos for moderation | Organizer |

### Media

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| POST | `/upload-access/exchange` | Exchange QR upload token for scoped upload cookie | Public |
| GET | `/upload-access/current` | What the guest upload page shows (decision 0019) | QR |
| POST | `/upload-access/uploads`, `/upload-access/uploads/{uploadIntentId}/complete` | A guest's uploads, as `/media/uploads/*` (decision 0019) | QR |
| POST | `/media/uploads/initiate` | Reserve quota and issue a short-lived presigned S3 POST form | Organizer |
| POST | `/media/uploads/{uploadIntentId}/complete` | Verify S3 object and enqueue processing | Organizer |
| GET | `/weddings/{weddingId}/photos/review` | Photos pending review across albums (decision 0019) | Organizer |
| POST | `/weddings/{weddingId}/photos/moderation` | Approve, reject or delete up to 100 photos (decision 0019) | Organizer |
| POST | `/weddings/{weddingId}/photos/{photoId}/restore` | Show a hidden photo again (decision 0019) | Organizer |
| GET | `/weddings/{weddingId}/photos/{photoId}/image/{size}`, `/original` | Stream a photo's copy or original (decision 0019) | Organizer |
| GET | `/weddings/{weddingId}/photos/{photoId}` | Read private photo metadata | Organizer |
| POST | `/weddings/{weddingId}/photos/{photoId}/approve` | Approve photo for eventual public publication | Organizer |
| POST | `/weddings/{weddingId}/photos/{photoId}/reject` | Reject pending photo | Organizer |
| POST | `/weddings/{weddingId}/photos/{photoId}/hide` | Hide public photo (owner safety exception after archive) | Organizer |
| DELETE | `/weddings/{weddingId}/photos/{photoId}` | Request protected photo deletion | Organizer |
| POST | `/weddings/{weddingId}/media-exports` | Start photo export job | Organizer |
| GET | `/weddings/{weddingId}/media-exports/{exportId}` | Get export status and download address | Organizer |
| GET | `/weddings/{weddingId}/media-exports/{exportId}/download` | Stream a ready ZIP (decision 0019) | Organizer |
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
  "startDate": "2026-12-13",
  "startTime": "10:00",
  "venue": {
    "name": "Family Farmhouse",
    "address": "Ahmedabad, Gujarat"
  }
}
```

**Rule:** An event may be created before date or venue is finalized. Timezone is explicit and reminders are scheduled from confirmed event times. The day and time are sent as clocks show them in `timeZone`; the server stores the UTC instant `startAt` once both are known (decision 0010). The list answers `{ events, truncated }`: date order, events without a day last, at most 100.

### Update or delete a ceremony

`PATCH /api/v1/weddings/{weddingId}/events/{eventId}` with an `EventUpdate`; `DELETE /api/v1/weddings/{weddingId}/events/{eventId}` answers 204.

**Rule:** Fields left out of a `PATCH` stay as they are; `null` clears an optional one, and clearing `startDate` clears the time too. Changing only `timeZone` keeps the clock reading of the day and time. A new day must be today or later; a day already stored may be kept. Owners and managers edit; only owners delete (403 `OWNER_REQUIRED`). Deleting keeps the record, with `deletedAt` and `deletedBy`, so whatever refers to it keeps its history; it is never listed or returned again (404 `EVENT_NOT_FOUND`). Both are refused on an archived wedding (409 `WEDDING_ARCHIVED`). Decision 0011.

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

**Rule:** Emails are dispatched by BullMQ workers over Gmail SMTP. Jobs recheck event status, opt-outs, wedding state and scheduleVersion just before sending. Off until switched on; the response also gives `sendTime` (`09:00`, in each ceremony's time zone). Automatic reminders go to everyone invited with an email address and a shared link, whatever their answer (decision 0016).


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
| `startDate` | date (local day) | No |
| `startTime` | `HH:mm` (local, needs `startDate`) | No |
| `endAt` | date-time | No |
| `timeZone` | string | No |
| `venue` | Venue | No |
| `dressCode` | string | No |
| `managerIds` | array<Id> | No |
| `livestream` | object | No |
| `reminderSettings` | object | No |

#### EventUpdate

| Field | Type | Required |
|---|---|---|
| `title` | string | No |
| `description` | string \| null | No |
| `startDate` | date (local day) \| null | No |
| `startTime` | `HH:mm` (local) \| null | No |
| `timeZone` | string | No |
| `venue` | Venue \| null (replaces the whole venue) | No |
| `state` | enum: scheduled\|completed\|cancelled | No |

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
| `dueDate` | date (India day) | No |
| `dueTime` | `HH:mm` (India time, needs `dueDate`) | No |
| `priority` | enum: low|normal|high (default normal) | No |
| `state` | enum: todo|in_progress|completed|cancelled (default todo) | No |

#### TaskUpdate

The `TaskCreate` fields, all optional; `null` clears `description`, `eventId`, `assigneeId`, `dueDate` and `dueTime`.

**Rule (tasks, decision 0012):** `eventId` must be one of the wedding's events and `assigneeId` one of its active owners or managers, else 400 on that field. Completing records `completedAt` and `completedBy`; reopening clears them. `GET /weddings/{weddingId}/tasks` takes `view` (all|mine|overdue|completed), `q`, `eventId` and `assigneeId` (an Id or `none`), `state`, `priority` and `sort` (due|due_desc|priority|updated), and answers `{ tasks, truncated, counts }`, at most 200 tasks. `GET /weddings/{weddingId}/members` answers `{ members: [{ userId, displayName, role }] }`.

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

#### VendorUpdate

The `VendorCreate` fields, all optional; `null` or `""` removes `contactName`, `phone`, `email`, `address` and `notes`; `eventIds` replaces the linked events (`[]` unlinks them all, `null` is refused).

**Rule (vendors, decision 0013):** `category` is any text up to 60 characters. `eventIds` must be the wedding's own, non-deleted events (at most 50, repeats ignored), else 400 on `eventIds`. A phone number has 6 to 15 digits and may use `+`, spaces, dots, dashes and brackets. `GET /weddings/{weddingId}/vendors` answers `{ vendors, truncated }`: the whole directory by name, at most 500; each vendor has `events: [{ id, title }]` in the wedding's order, leaving out deleted events. The web app searches and filters that list.

#### ExpenseCreate

| Field | Type | Required |
|---|---|---|
| `title` | string | Yes |
| `category` | string | Yes |
| `eventIds` | array<Id> (several ceremonies; empty for general) | No |
| `vendorId` | Id | No |
| `amountPaise` | MoneyPaise | Yes |
| `dueDate` | date (India day) | No |
| `notes` | string | No |
| `receiptAssetIds` | array<Id> | Not yet: needs private uploads (decision 0014) |

#### ExpensePaymentCreate

| Field | Type | Required |
|---|---|---|
| `amountPaise` | MoneyPaise | Yes |
| `paidAt` | date (India day, today or earlier) | Yes |
| `method` | enum: cash|bank_transfer|card|cheque|other | No |
| `note` | string | No |

#### ExpenseAdjustmentCreate

| Field | Type | Required |
|---|---|---|
| `kind` | enum: discount|extra | Yes |
| `amountPaise` | MoneyPaise | Yes |
| `date` | date (India day, today or earlier) | Yes |
| `note` | string | No |

#### ExpenseEntryReverse

| Field | Type | Required |
|---|---|---|
| `entryId` | Id (a payment, discount or extra of this expense) | Yes |
| `note` | string | No |

**Rule (expenses, decision 0014):** final = `amountPaise` − discounts + extras; outstanding = final − paid. A payment can't exceed what is outstanding (400 on `amountPaise`); a discount can't either; an extra can. Each entry can be reversed once (409 `ENTRY_ALREADY_REVERSED`); a reversal can't be reversed (409 `ENTRY_NOT_REVERSIBLE`); undoing a paid extra is refused (409 `REVERSAL_BELOW_PAID`). Editing can't set the agreed amount below paid + discounts − extras. `ExpenseUpdate` is `ExpenseCreate` with every field optional; `null` clears `vendorId`, `dueDate` and `notes`; `eventIds` replaces the events (`[]` for none). Each expense has `events: [{ id, title, available }]` in the wedding's order. A linked event or vendor deleted later stays, with `available: false`. A deleted expense answers 404 everywhere and leaves the totals. `GET .../expenses` answers `{ expenses, truncated, totals }`; `totals` (also `GET .../expenses-summary`) has `finalPaise`, `paidPaise`, `outstandingPaise`, `discountPaise`, `extraPaise`, `overdue` and `count`. Ledger writes answer `{ expense, entries }`.

#### GuestCreate

| Field | Type | Required |
|---|---|---|
| `name` | string | Yes |
| `partySize` | integer | Yes |
| `email` | email | No |
| `phone` | string | No |
| `organizerNotes` | string | No |
| `eventIds` | array<Id> | No (invites at once; decision 0015) |

**Rule (guests, decision 0015):** `partySize` is 1–100. `PATCH` takes the same fields (not `eventIds`), `null` clearing email, phone and notes; a party size below an answer already given for an open ceremony is 409 `PARTY_SIZE_CONFLICT`. `GET .../guests` answers `{ guests, truncated, totals }` (all active guests, at most 2,000), with `totals` `{ contacts, invitedPeople, answered, pending, events: [{ eventId, title, invitedGuests, invitedPeople, attending, notAttending, maybe, pending, confirmedPeople }] }`. `GET`, `POST`, `PATCH` and `PUT .../invitations` on one guest answer `{ guest, invitations }` with each answer's history. `POST .../invitation-links` (`{ reissue? }`) answers `{ status, secretUrl }`: the private link `/invitation#t=…`, the same each time until reissued or revoked. `POST .../invitation-email` is 202, needs an email (400 on `email`) and an open ceremony (422 `NO_CEREMONIES_SELECTED`). `POST /guest-access/exchange` (`{ token }`) sets `mm_guest_session` or answers 404 `INVITATION_LINK_UNAVAILABLE`; guest routes without a live session answer 401 `GUEST_SESSION_REQUIRED`. RSVP errors: 404 `EVENT_INVITATION_NOT_FOUND`, 409 `RSVP_VERSION_CONFLICT`, `RSVP_CLOSED`, `WEDDING_ARCHIVED`.

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
| `content` | object: `headline`, `story` (plain text), `faq` (≤ 20 question/answer) | No |
| `contentVersion` | integer: the version the edit started from | Yes |

#### WebsitePublish

| Field | Type | Required |
|---|---|---|
| `contentVersion` | integer | Yes |

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
| `rows` | array<ImportRow>: `name`, `partySize` (number or text), `email`, `phone`, `organizerNotes`, `events` (ceremony names) | Yes |

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
