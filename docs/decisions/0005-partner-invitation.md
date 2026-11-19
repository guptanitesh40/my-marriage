# 0005 — Inviting the partner (onboarding step 2)

Date: 2026-11-19 · Status: accepted

Decisions for milestone M3.2: inviting your partner as the wedding's second
owner, accepting, and editing the wedding's details. Approved by the owner
before implementation. The design is the Stitch screen "Onboarding Flow:
Steps 1, 2 & 3" (states "Step 2: Partner" and "Step 2: Sent State").

## The rules

- **Owners only invite** (managers cannot change who owns a wedding, PRD
  TEAM-03), and only while the wedding is active. You cannot invite your own
  address.
- **One partner seat:** a wedding has at most two owners. Inviting is refused
  once it has two (409 `OWNER_LIMIT`), and a new invitation replaces a pending
  one, which stops working.
- **Accepting** needs the signed-in, verified account whose email the
  invitation was sent to, and the link. In one transaction it adds the owner
  membership (a manager of the wedding is promoted), marks the invitation
  accepted and raises the wedding's write fence. Two owners at most is
  counted inside the transaction; the fence write makes simultaneous
  acceptances for one wedding conflict, so MongoDB retries the later one.
  One active owned wedding per user is the membership index's job, as at
  creation (409 `OWNER_ACTIVE_LIMIT`, PRD 7.4). Accepting again succeeds.
- **The link** works for 7 days. Resending sends a new one, restarts the 7
  days and stops earlier links at once. An email that fails leaves the
  invitation and the wedding as they are; the owner sees "could not be sent"
  and can resend.
- **Wedding details can be edited** (PRD WED-04) by owners and managers while
  the wedding is active; the slug stays. Each edit raises the write fence in
  the same atomic write.
- **Dates before today (in India) are refused** for a new or changed date. A
  stored date that has since passed may be kept.

## Decisions

- **Resend only, no "Copy link"** (the owner chose this). The worker creates
  the secret as it sends the email, as for verification emails (decision
  0003), so the server never holds a link it could show.
- **The invitee needs the link and the matching account.** _Changed by
  [0008](0008-invitations-without-the-link.md): a verified matching
  account is now enough, from the invitation shown on `/onboarding`._ The account alone
  would not be enough: someone could create an account with another person's
  address, which that person might verify by clicking an email they did not
  ask for (the risk noted in the M2 security review). The link is only in
  the invitee's inbox.
- **The accept page is public** and shows, to the link's holder, what the
  invitation is for and which address may accept (`POST
/member-invites/preview`). The holder already has all of it in the email.
- **Signing in on the way keeps the link** in this tab's `sessionStorage`
  (the fragment does not survive a redirect), removed once used. A partner
  who signs up verifies in another tab, then opens the link again; the page
  says so.

## Changes to the reference documents

- `membership_invites.tokenHash` is **`tokenHashes`**, a list: a send retried
  after a crash creates a second secret for the same email, and either may be
  the one that reached the inbox. Its unique index is partial (an invitation
  not yet sent has none). Added: `notificationId` (the email carrying the
  current link) and `revokedAt`; index `(notificationId)` for the worker.
- `MemberInviteCreate.role` accepts only `owner` for now; manager
  invitations come with PRD TEAM-01.
- New endpoints, not in the API document:
  `POST /weddings/{weddingId}/member-invites/{inviteId}/resend` and
  `POST /member-invites/preview`. The accept body is `{ token }`.
- `notifications` gains `weddingId` (in the schema document) and the
  `member_invite` kind (listed there); `userId` is optional, as the invitee
  may have no account.
- Not built: revoking an invitation without replacing it, the members list,
  and removing members (TEAM-02).

## Testing note

Browser tests now give each test its own client address (via
`X-Forwarded-For`, trusted for the one proxy hop in the test stack), so the
per-address sign-up limit applies per visitor, as for real people, instead of
to the whole suite.
