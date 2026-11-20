# 0016 — Guest reminders: by hand and automatic

Date: 2026-11-20 · Status: accepted

## Why

PRD INV-07 asks for email reminders 30, 7 and 3 days before each ceremony,
switched on or off per wedding, with a guest opt-out (PRD §5.10). The owner
also asked for a "remind" button: to everyone invited or to one guest, about
all ceremonies or one, with an optional note. Decision 0015 left both out
of M9.

## What the owner decided

- **"Remind all" goes to everyone invited**, whatever their answer.
- **Remind about one ceremony** is a choice in the same dialog.
- **No limit per guest:** pressing it twice sends twice. Only the
  wedding's existing daily email budget (300, shared with invitations, to
  stay inside Gmail's ~500 a day) applies, and a send that would pass it is
  refused up front with how many are left, rather than sending some.
- **Automatic reminders also go to everyone invited.** This departs from
  PRD INV-07, which says to skip contacts who declined that ceremony; the
  owner chose otherwise. The email tells someone who declined that they can
  update their answer if plans change.
- The couple's **note is optional**, up to 500 characters, plain text.

## How it works

- **A reminder follows an invitation.** It goes only to guests with an
  email address and a shared, working link who have not turned reminders
  off. Guests left out are counted by reason in the preview (no email, not
  shared yet, link turned off, turned reminders off) so nothing is skipped
  silently; for one guest, the reason is the error. No link is created by
  a reminder.
- **Upcoming ceremonies only:** not deleted, cancelled or completed, and not
  on a day already past in the ceremony's time zone. One without a date yet
  counts ("to be announced").
- **One email per family**, written in the worker just before sending
  (`GuestReminderComposer`): each ceremony with its latest details and the
  guest's current answer, the note, and the private link rebuilt from the
  active link record, so no secret is queued. It is not sent if anything
  changed meanwhile (guest removed or opted out, address changed, wedding
  archived, link off, no ceremony left).
- **`guest_reminders`** records each reminder email: guest, ceremonies (with
  the schedule version they were planned against), source, offset, note,
  sender. Its `notificationId` is unique.
- **Automatic reminders** are off until the couple switches them on
  (`reminder_settings`, one per wedding; a missing record means off),
  because switching them on emails real people. The worker checks every
  15 minutes (a BullMQ job scheduler, so several workers still run it
  once). A reminder is due on the ceremony's local day `startDate − offset`,
  from 09:00 there (PRD §5.10's proposed default), and only that day: one
  missed for a whole day is not sent late, and switching reminders on a
  week before a ceremony does not send the 30-day one. A guest whose
  ceremonies are due the same day for the same offset gets one email.
- **Never twice:** each automatic reminder carries
  `invitationId:offset:scheduleVersion` keys under a unique index, so
  however often the check runs it is queued once. A changed day or time
  raises the event's `scheduleVersion` (decision 0011), which is a new
  schedule: the new date gets its own reminder, and one queued for the old
  date is dropped when written.
- **Opt-out:** the guest's invitation page has a "Reminder emails" section
  (only when the couple has their email) to stop or restart them
  (`POST /guest-access/reminders/opt-out` and `/opt-in`); every reminder
  links to it. It stops reminders by hand too, and changes nothing else.
- **Sending many at once:** `NotificationsService.requestEmails` and
  `OutboxService.addMany` write a batch in one insert per collection, and
  `RateLimiter` can count several hits at once (`amount`) and report what
  is left (`remaining`).

## Left out

- Reminder history beyond the last one per guest (the records are kept,
  but only the last is shown).
- Per-ceremony on/off for automatic reminders (the PRD allows per wedding
  or per event; the API documents per wedding).
- WhatsApp reminders: there is no API for them (PRD INV-06); the preview
  names the guests without email so they can be nudged by hand.
