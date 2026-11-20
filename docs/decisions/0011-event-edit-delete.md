# 0011 — Events: editing and deleting ceremonies

Date: 2026-11-19 · Status: accepted

## Why

The Events page (decision 0010) could only add ceremonies. The owner asked
for Edit and Delete on each event, with deletion kept in the database
rather than removing the record. The PRD already wants this: "Removing an
event retains auditable associated expenses/tasks; use soft deletion or
blocked deletion rather than orphaning financial data" (§ data rules), and
EVT-06 asks for editing and marking events completed or cancelled.

## Decisions

- **Deleting is a soft delete.** The event keeps every field and gains
  `deletedAt` and `deletedBy` (a change to the schema document). Every
  read — the list, edits, deletes, and later the public site — leaves it
  out, and it answers 404 `EVENT_NOT_FOUND` from then on. No index changes:
  the list's index still serves, and the few deleted events are filtered
  out as it is read.
- **Deleted is not a state.** `state` stays scheduled, completed or
  cancelled, as in the schema document, which says never to overload one
  status with another meaning. A cancelled event is still shown, with its
  history; a deleted one is not.
- **Only owners delete.** The PRD gives managers "no ownership, archive or
  delete actions". Managers can edit, and do not see the Delete button;
  the API answers them 403 `OWNER_REQUIRED`.
- **No restore yet.** The record is kept, so restoring can be added later.
  The confirmation says it "can't be undone here".
- **Edits are partial** (`PATCH`, as for weddings): fields left out stay;
  `null` clears an optional one. The form sends every field, so whatever
  was emptied is removed.
  - Clearing the day clears the time, which means nothing without it.
  - Changing only the time zone keeps the clock reading: the ceremony is
    still at 10:00 where it happens, so the instant moves.
  - A new day must be today or later; a day already stored may be kept, so
    a past ceremony can still be marked completed.
- **The edit form has a status** (scheduled, completed, cancelled), as
  EVT-06 asks. Reminders do not exist yet; `scheduleVersion` is raised when
  the day, time or status changes, ready for them.
- **Two edits at once:** the event is read and written in one transaction,
  so the later one is retried and builds on the earlier one, instead of
  overwriting it from an old copy.
- **Archived weddings stay read-only:** edits and deletes raise the
  wedding's write fence in the same transaction, like adding.

## Built

- **API:** `PATCH` and `DELETE /weddings/{weddingId}/events/{eventId}`.
- **Web:** Edit and (for owners) Delete on each card. Edit opens the add
  drawer filled in; Delete asks first in a modal dialog. On a phone the
  buttons show their icons only, with full names for screen readers.
