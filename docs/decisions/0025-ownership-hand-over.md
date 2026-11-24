# 0025 — An owner can hand over their place

Date: 2026-11-23 · Status: accepted (built)

## Why

Someone may set up a wedding for someone else (a sibling, a friend, a
planner), and later the wedding should belong to the real couple. Until
now an owner could never stop being one: owners are protected, and
nobody changes them through the team (decision 0020). The owner asked
for a way, in the invite flow, to give their ownership to someone else
and stay on as an admin.

PRD §3 lists "transfer ownership" as a protected owner action that needs
a confirmed owner action and a security review; both are below.

## Decisions

- **A hand-over is an invitation.** `POST /member-invites` takes
  `handOver: true` with `role: owner`. Only an owner can send one, and
  only for their own place. Admins get 403 `OWNER_REQUIRED`, managers
  `ADMIN_REQUIRED`, and `handOver` with another role is 400.
- **Nothing changes until it is accepted.** The person accepts with the
  usual private link, or from their pending invitations, signed in with
  the address it was sent to. In the same transaction, they become an
  owner and the sender becomes an admin. The number of owners does not
  change, so a hand-over needs no free seat and works when there are
  already two owners. The other owner, if any, stays an owner.
- **It can go to someone already on the team.** An admin or a manager
  can be made an owner this way. Someone who is already an owner gets
  409 `ALREADY_OWNER`.
- **The sender must still be an owner when it is accepted.** If not, the
  accept is refused with 410 `HAND_OVER_INVALID`, nothing changes, and
  the invitation stays as it was. Today an owner can only stop being one
  through a hand-over, so this is a guard, not an expected path.
- **One pending hand-over per owner.** A new one replaces that owner's
  previous one, whose links stop working. It never replaces the
  partner's invitation or the other owner's hand-over, and inviting the
  partner never replaces a hand-over.
- **Only owners resend or withdraw a hand-over**, as with the partner's
  invitation. Admins see it on the team page but have no actions on it.
- **Confirmed in the app.** The invite drawer offers "Owner, in my place"
  to owners only, and so does "Hand over my ownership" on your own owner
  card. Sending needs a ticked "I understand: I'm handing over my
  ownership and will become an admin" box, below a warning that spells
  out what you lose. The email and the accept page say the person takes
  over the sender's place and the sender stays on as an admin.
- **Audited.** Accepting records `member.joined` and
  `member.ownership_handed_over` (from, to, invitation), in the same
  transaction. No secret is recorded.

## Security review

- **Who can start it:** an active owner of an active wedding, checked by
  `WeddingAccessService.require` and again by role. The API ignores any
  user ID in the body: the sender is always the signed-in owner.
- **Who can complete it:** the account whose verified address the
  invitation was sent to, through the hashed, single-use link or by
  invitation ID (decision 0008). No one can make themselves an owner.
- **Races:** acceptance runs in one transaction that raises the wedding's
  write fence. Two acceptances for one wedding conflict, and the later
  one re-checks against the first. The sender is demoted only if still
  an active owner, matched in the same write, so a stale hand-over can't
  create a third owner or leave a wedding with none. The owner count is
  checked inside the transaction, with the sender's seat counted as
  given up.
- **Never zero owners:** the sender loses ownership only in the
  transaction that makes someone else an owner.
- **Archived and deletion-pending weddings:** hand-overs are refused, as
  every invitation is (`WEDDING_ARCHIVED`).

## Not done

- No email to the sender or the other owner when a hand-over is
  accepted; the team page and the audit log show it.
- An admin can't be made an owner directly from the team page. An owner
  sends a hand-over to their address instead, which they must accept.
