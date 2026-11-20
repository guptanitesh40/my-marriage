# 0012 — Tasks

Date: 2026-11-19 · Status: accepted

## Why

Task management is milestone M6: a wedding's to-dos, linked to its
ceremonies and shared out among its owners and managers (PRD TASK-01 to
TASK-05), from the Stitch screen "Tasks Management — My Marriage"
(`docs/design/task-management/`, with each prototype state in `states/`).
The design, the schema document and the API document disagree in a few
places; these are the choices made.

## Decisions

- **Priority is low, normal or high, shown as Low, Medium, High.** The
  schema says new tasks are `normal`; the design's drawer starts on High.
  The schema wins: new tasks are Medium, unless the owner decides otherwise.
- **Statuses** are To Do, In Progress, Completed and Cancelled. New tasks
  are To Do. Completing records `completedAt` and `completedBy`; saving
  other changes keeps them; reopening clears them. Cancelled is not
  completed and records nothing.
- **Due day and time, like events (decision 0010).** The API document has
  one `dueAt` instant, but the drawer has an optional day and an optional
  time. The API takes `dueDate` and `dueTime` and stores `dueDate` (the
  day, midnight UTC) and `dueAt` (once the time is known too). Both are in
  India time (Asia/Kolkata): tasks have no venue, and the drawer has no
  time zone. A past due day is allowed: a task can be recorded late.
- **Overdue** means To Do or In Progress, and past its time, or past its
  day in India when it has no time.
- **No hard delete.** The API document lists `DELETE`
  ("Cancel/remove task from active list"); Cancelled does that, so
  `DELETE` is not built.
- **Who can be assigned:** active owners and managers of the wedding only,
  checked in the same transaction as the write. `GET /weddings/{id}/members`
  (in the API document, not built until now) gives the list. A task whose
  assignee is no longer an active member shows as Unassigned, and saving it
  from the drawer unassigns it (PRD TASK-04). Removing members is not built
  yet; when it is, it should also unassign their tasks.
- **Events:** only the wedding's own events that are not deleted. A task
  linked to an event that is later deleted keeps the link in the database
  but shows as General.
- **The list is filtered and sorted by the server.** Views (All, My Tasks,
  Overdue, Completed), search (title, description, assignee name), event
  (or General), assignee (or Unassigned), status and priority all combine,
  and live in the page address. Sorting: due date earliest or latest,
  highest priority, recently updated; tasks without a due day always come
  last. At most 200 tasks, with `truncated` when there are more.
- **Counts** for the views and the summary tiles are the wedding's real
  totals: all, mine, overdue, in progress, completed. The design's "due this
  week" is shown as Overdue, which is what the API counts.
- **Left out:** the Event Tasks preview (there is no Event Details page
  yet), Export, the row "⋮" menu (the design gives it no items), "Import
  recommended checklist", the sidebar's "3 due" badge, Kanban, subtasks,
  reminders and attachments.

## The Events page shows each ceremony's tasks

The Stitch "Events Management" design gives each ceremony a panel of
figures (RSVPs, tasks done, budget) beside "Manage" and a "⋮" menu, with
summary tiles above the list and search and tabs. Now that tasks exist,
the Events page follows it with real data only:

- **Each card:** the day and part of the day ("Day 1 · Morning"), its tasks
  done ("8 / 10 done") and overdue, which link to its tasks, "Manage"
  (the edit drawer) and a "⋮" menu with "View tasks" and, for owners,
  "Delete ceremony". RSVPs and budget wait for guests and expenses.
- **Summary tiles:** total ceremonies, the days they span, the next
  ceremony, and ceremony tasks done. The design's RSVP tile waits for
  guests.
- **Search and the All / Upcoming / Completed tabs,** done in the browser:
  a wedding has at most a hundred events, all already loaded. The design's
  Drafts tab, host filter, sort and grid view have nothing behind them yet.
- **API:** `GET /weddings/{weddingId}/tasks/summary` gives each event's
  task counts (cancelled tasks and deleted events are left out).

## Built

- **API:**
  - `GET` and `POST /weddings/{weddingId}/tasks`
  - `PATCH /weddings/{weddingId}/tasks/{taskId}`
  - `GET /weddings/{weddingId}/members`
  - migration `0006-task-indexes`
- **Web:** `/weddings/{weddingId}/tasks`, from the sidebar: summary tiles,
  search, views, filters, sorting, rows with quick completion, the add and
  edit drawer, first-time and no-results states, a read-only notice for
  archived weddings, and loading placeholders.
- **Shared:** the right-hand drawer is one component (`components/ui/drawer.tsx`),
  used by Events and Tasks.
