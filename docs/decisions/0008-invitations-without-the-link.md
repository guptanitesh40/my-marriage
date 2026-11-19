# 0008 — Accepting an invitation without the link

Date: 2026-11-19 · Status: accepted · Changes one rule of 0005

## Why

A partner who signed up without the invitation link landed on "Let's
start your wedding", with nothing telling them an invitation was waiting.
This happened, for example, when they verified their email in another
tab, which loses the link. Had they created a wedding there, they could no
longer have joined the one they were invited to, because each person owns
one wedding at most.

## What changed

- **A verified account is enough** (the owner's decision). An account
  whose verified email address is the one an invitation was sent to may
  accept it without the link. Decision 0005 required the link as well,
  against someone registering another person's address in advance (who
  would then need that person to click a verification email they never
  asked for). The owner judged that risk small next to people losing
  invitations.
- **New endpoints**, not in the API document:
  - `GET /member-invites/mine`: the pending, unexpired invitations sent to
    the signed-in address, for active weddings, newest first.
  - `POST /member-invites/{inviteId}/accept`: accepts one. Anyone else gets
    404 `INVITE_NOT_FOUND`, the same as for an invitation that does not
    exist. It shares one transaction with the link path (`join`): two
    owners at most, one owned wedding per person, the write fence.
- **The screen**: `/onboarding` shows the waiting invitations before the
  form to create a wedding (Stitch "Pending Co-owner Invitation",
  `docs/design/pending-invitation/`). It offers "Accept and join", or "Start
  my own wedding instead", which asks first. After verifying an email, the
  next step reads "See your invitation" instead of "Create your wedding".
- **Asked again until decided** (the owner's choice). "Start my own
  wedding instead" opens the form for that visit only (`?start=own`). The
  next visit to `/onboarding` shows the invitation again, until the person
  accepts one or owns a wedding. Nothing is remembered, so a stray click
  never hides an invitation.
- **Wording**: the card says "You'll join as an equal owner, with the same
  access as Arjun. You can plan everything together." The design's list
  of features (ceremonies, tasks, expenses, website) is left out until
  those exist.

The link in the email works as before.
