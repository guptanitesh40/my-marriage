# 0022 — Wedding overview dashboard

Date: 2026-11-23 · Status: accepted (M14 built)

## Why

PRD DASH-01 to DASH-03 ask for an overview of the wedding: upcoming
ceremonies, open tasks, money, guest answers, photos, the website and the
team, with shortcuts to act. The owner approved the M14.0 analysis on
2026-11-23 ("go with your recommended approach"), and asked for the main
venue and description from Settings (M13) to appear on it.

## Decisions

**One read: `GET /weddings/{id}/dashboard`**

- For any member, archived or not; 404 to anyone else, like every wedding
  route. It is never public.
- Built in `modules/dashboard` from each module's exported read methods
  (`EventsService.briefs`, `TasksService.attention`,
  `ExpensesService.totalsOf` and `topCategories`, `GuestsService.totals`,
  `ModerationService.counts`, `WebsiteService.publishedAddress`,
  `WeddingAccessService.activeMembers`, `MemberInvitesService.pendingCount`),
  so its numbers follow the same rules as the pages they link to. It owns
  no data, adds no index and changes no schema.
- Each section loads on its own. One that fails is left out, named in
  `unavailable` and logged as a warning; the rest still load. The page
  says "unavailable" for it, never zero. A real zero is shown as zero.
- Small and bounded: 4 ceremonies, 4 tasks, 3 categories, counts.

**Definitions**

- _Upcoming ceremony_: scheduled (not cancelled or completed), with a day
  that is today or later in its own time zone, sorted by its real start.
  Ceremonies without a day are counted apart and never ranked.
- _Countdown_: calendar days from today in India to the wedding's main
  date; "It's your wedding day!" on the day; days since afterwards, never
  negative. No date: "No wedding date yet".
- _Wedding week_: from 7 days before the first upcoming ceremony, the
  header says how many days are left until the celebrations begin.
- _Open task_: to do or in progress. _Overdue_: the Tasks page's rule.
  _Due soon_: due today or within the next 7 days (India) and not overdue.
  Listed: overdue first, then soonest due, then priority.
- _Money_: integer paise, written as ₹ with Indian grouping. Recorded is
  agreed − discounts + extras; outstanding never goes below zero per
  expense. No budget and no percentage.
- _Top categories_: recorded amount per category, largest first; the
  same word in another case counts as one.
- _Guests_: contacts, people invited (each once), and per ceremony people
  confirmed (attending counts only) and invitations pending, maybe and
  declined — never added up across ceremonies.
- _Team_: members by role; pending invitations only for owners and
  admins, who manage the team.

**Page**

- Replaces the M4 welcome placeholder. The heading is the wedding's title;
  "Welcome back, {first name}" follows it.
- Quick actions link to Events, Tasks, Expenses and Guests with `?new=1`,
  which opens that page's existing add form once and drops the parameter
  (`OpenOnArrival`). No second form is built. Shown only while the wedding
  is active.
- Archived and deletion-pending weddings show the same numbers without
  anything that would change them, and a banner; owners of an archived
  wedding keep links to unpublish and hide photos. No reopen.
- Responsive as described in `docs/design/wedding-overview/README.md`.

**Main venue on the website** (asked for by the owner, 2026-11-23)

- The website builder's Basics tab has "Show the venue address and map on
  my website", off by default. It is part of the website draft
  (`content.showVenue`), so like every other website change it reaches
  guests only when published, and turning it off and publishing hides it.
- When it is on and Settings has a main venue, the public site (and the
  organizers' preview) shows a "The wedding venue" card with the name,
  address and a "Get directions" link to Google Maps, in all three
  designs. The venue itself is read live from Settings, like ceremony
  details. With no venue in Settings, nothing is shown and the builder
  links to Settings.
- This widens the public site by exactly `mainVenue {name, address,
mapsUrl}`, only by the couple's choice. The description is never public.

## Not built

Timeline management, analytics, AI insights, budgets or predictions,
messaging or broadcasts, a memory book, a guestbook, inline task
completion from the overview, live logistics.
