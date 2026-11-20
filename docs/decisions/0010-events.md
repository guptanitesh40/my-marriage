# 0010 — Events: listing and adding ceremonies

Date: 2026-11-19 · Status: accepted

## Why

Events are the first wedding-management module (M5.1): the Events page
lists a wedding's ceremonies and adds new ones from a right-side drawer, as
in the Stitch screen "Events Management" (`docs/design/events/`). The
specifications and the design disagreed in a few places; the owner chose
as recommended below.

## Decisions

- **Presets are the PRD's** (EVT-01): Haldi, Mehendi, Sangeet, Garba,
  Wedding and Reception, plus "Custom". The design's Cocktail, Tilak and
  Chooda are not presets, but any name can be typed. A preset only fills
  in the name, which stays editable.
- **Only the name is required.** The design marks the date, time and venue
  as required; the PRD says they may be incomplete (EVT-02). The list
  shows what is still missing ("Date not set", "Time not set", "Venue not
  set") as the PRD's incomplete-data warnings.
- **A day without a time** (a change to the schema and API documents).
  `startAt` is an instant, which a day alone is not. Events gain
  `startDate`, the local calendar day in the event's time zone, stored as
  midnight UTC like a wedding's date. `startAt` is set once the time is
  known too. The API takes `startDate` and `startTime` (`HH:mm`) as clocks
  show them where the ceremony happens, with `timeZone`. The server works
  out `startAt` (`events/event-time.ts`), so the browser never converts
  time zones. Around a daylight-saving change it follows Temporal's
  "compatible" rule.
- **Time zones are IANA names,** Asia/Kolkata unless chosen. Offsets and
  abbreviations (`+05:30`, `IST`) are refused, because they do not follow
  daylight saving and abbreviations are ambiguous.
- **New dates must be today or later** where the ceremony happens, as for
  the wedding date.
- **The description is public.** The schema document says it is shown on
  the website once published. The design labelled it "Brief run-sheet
  notes" with private examples. The form calls it "Description" and says
  guests may see it. Private notes can come later as their own field.
- **Left out of M5.1:**
  - the design's host family and expected guests (not in the schema)
  - dress code (comes with event editing)
  - the stat tiles, RSVP/task/budget figures, search, filters, sort, grid
    view, "Manage" and "Export run-sheet" (no data or feature behind them
    yet)
  - the sidebar's list of event names under Events
- **The list returns at most 100 events,** in date order, events without a
  day last in the order added, and says when there are more (`truncated`).
  Pagination can follow if a wedding ever needs more.
- **Owners and managers** both list and add events. Anyone else gets 404,
  like every wedding route.
- **Archived weddings are read-only.** Adding raises the wedding's write
  fence in the same transaction as the insert. The fence moved to
  `WeddingAccessService.raiseWriteFence` so every module can use it without
  touching the wedding model.
- **Audit events are not written yet.** The PRD wants them before broad
  feature development, and they come as a slice of their own.

## Built

- **API:**
  - `GET /weddings/{weddingId}/events` → `{ events, truncated }`
  - `POST /weddings/{weddingId}/events`
  - migration `0005-event-indexes`
- **Web:**
  - `/weddings/{weddingId}/events`: list, empty state, read-only notice
    and loading
  - the "Add a ceremony" drawer: a native modal `<dialog>`, full width on
    phones
  - Events in the sidebar, with the current section highlighted
